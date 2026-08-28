/**
 * ASCII Studio.
 *
 * A character grid you draw on, with frames so the drawing can move. The art
 * is rendered to a canvas rather than to a grid of DOM cells: a 100x40 board
 * is four thousand cells, and repainting four thousand spans on every pointer
 * move is the difference between a tool and a slideshow. Drawing to canvas
 * also means the PNG and the video export are the same code path as the
 * screen, so what you save is exactly what you saw.
 *
 * The whole document is plain text. Everything it exports is plain text too,
 * except the pictures.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sound } from '../os/sound'

type Frame = string[][]
type Tool = 'pencil' | 'eraser' | 'line' | 'rect' | 'fill' | 'ellipse' | 'text' | 'pick'
interface Cell { c: number; r: number }

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'pencil', label: 'Draw', hint: 'Paint the current character' },
  { id: 'eraser', label: 'Erase', hint: 'Paint blanks' },
  { id: 'line', label: 'Line', hint: 'Drag from one point to another' },
  { id: 'rect', label: 'Box', hint: 'Drag a rectangle' },
  { id: 'ellipse', label: 'Ellipse', hint: 'Drag an ellipse' },
  { id: 'fill', label: 'Fill', hint: 'Flood the matching area' },
  { id: 'text', label: 'Type', hint: 'Click, then type' },
  { id: 'pick', label: 'Pick', hint: 'Take the character under the cursor' },
]

/* Ramps run dark to light. The block ramp is the one people reach for first;
   the ASCII ramp is the classic, and works anywhere a font does. */
const SETS: { name: string; chars: string }[] = [
  { name: 'Blocks', chars: '█▓▒░ ▄▀■□▪▫' },
  { name: 'Shading', chars: '@%#*+=-:. ' },
  { name: 'Lines', chars: '─│┌┐└┘├┤┬┴┼╭╮╰╯═║╔╗╚╝' },
  { name: 'Sketch', chars: "/\\|_-+*^~'`\"" },
  { name: 'Faces', chars: 'oO0.,;:()[]{}<>' },
  { name: 'Stars', chars: '*+.·•◦°✦✧☆★' },
]

const THEMES: { id: string; name: string; ink: string; paper: string; glow: string }[] = [
  { id: 'phosphor', name: 'Phosphor', ink: '#7dfba4', paper: '#04160c', glow: 'rgba(80,255,150,0.5)' },
  { id: 'amber', name: 'Amber', ink: '#ffc266', paper: '#1a0f02', glow: 'rgba(255,180,70,0.5)' },
  { id: 'ice', name: 'Ice', ink: '#c9ecff', paper: '#061b33', glow: 'rgba(140,215,255,0.5)' },
  { id: 'paper', name: 'Paper', ink: '#20304a', paper: '#f6f4ec', glow: 'rgba(60,110,190,0.28)' },
]

const MAX_UNDO = 60

const blank = (cols: number, rows: number): Frame =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ' '))

const copyFrame = (f: Frame): Frame => f.map((row) => row.slice())

const frameToText = (f: Frame) => f.map((row) => row.join('').replace(/\s+$/, '')).join('\n')

/* ---------------- shapes, all in cell space ---------------- */

function lineCells(a: Cell, b: Cell): Cell[] {
  // Bresenham, so a diagonal comes out as an even run of characters rather
  // than the clumps a naive float step produces at this resolution
  const out: Cell[] = []
  let { c: x0, r: y0 } = a
  const dx = Math.abs(b.c - x0)
  const dy = -Math.abs(b.r - y0)
  const sx = x0 < b.c ? 1 : -1
  const sy = y0 < b.r ? 1 : -1
  let err = dx + dy
  for (;;) {
    out.push({ c: x0, r: y0 })
    if (x0 === b.c && y0 === b.r) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
  return out
}

function rectCells(a: Cell, b: Cell): Cell[] {
  const c0 = Math.min(a.c, b.c)
  const c1 = Math.max(a.c, b.c)
  const r0 = Math.min(a.r, b.r)
  const r1 = Math.max(a.r, b.r)
  const out: Cell[] = []
  for (let c = c0; c <= c1; c++) { out.push({ c, r: r0 }); out.push({ c, r: r1 }) }
  for (let r = r0; r <= r1; r++) { out.push({ c: c0, r }); out.push({ c: c1, r }) }
  return out
}

function ellipseCells(a: Cell, b: Cell): Cell[] {
  const cx = (a.c + b.c) / 2
  const cy = (a.r + b.r) / 2
  const rx = Math.max(0.5, Math.abs(b.c - a.c) / 2)
  const ry = Math.max(0.5, Math.abs(b.r - a.r) / 2)
  const out: Cell[] = []
  const seen = new Set<string>()
  // Step by angle rather than by x: cells are about twice as tall as they are
  // wide, so an x-sweep leaves gaps at the top and bottom of the curve.
  const steps = Math.ceil((rx + ry) * 8)
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const c = Math.round(cx + Math.cos(t) * rx)
    const r = Math.round(cy + Math.sin(t) * ry)
    const key = `${c},${r}`
    if (!seen.has(key)) { seen.add(key); out.push({ c, r }) }
  }
  return out
}

function fillCells(f: Frame, at: Cell): Cell[] {
  const target = f[at.r]?.[at.c]
  if (target === undefined) return []
  const rows = f.length
  const cols = f[0].length
  const seen = new Uint8Array(rows * cols)
  const out: Cell[] = []
  const stack: Cell[] = [at]
  while (stack.length) {
    const { c, r } = stack.pop()!
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue
    const i = r * cols + c
    if (seen[i]) continue
    if (f[r][c] !== target) continue
    seen[i] = 1
    out.push({ c, r })
    stack.push({ c: c + 1, r }, { c: c - 1, r }, { c, r: r + 1 }, { c, r: r - 1 })
  }
  return out
}

export default function AsciiStudio() {
  const [cols, setCols] = useState(72)
  const [rows, setRows] = useState(26)
  const [frames, setFrames] = useState<Frame[]>(() => [blank(72, 26)])
  const [at, setAt] = useState(0)
  const [tool, setTool] = useState<Tool>('pencil')
  const [ch, setCh] = useState('█')
  const [setIx, setSetIx] = useState(0)
  const [theme, setTheme] = useState(0)
  const [onion, setOnion] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [fps, setFps] = useState(8)
  const [caret, setCaret] = useState<Cell | null>(null)
  const [status, setStatus] = useState('')
  const [recording, setRecording] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragFrom = useRef<Cell | null>(null)
  const [preview, setPreview] = useState<Cell[] | null>(null)
  const undo = useRef<{ frames: Frame[]; at: number }[]>([])
  const redo = useRef<{ frames: Frame[]; at: number }[]>([])
  const metrics = useRef({ w: 10, h: 20, pad: 10 })

  const th = THEMES[theme]
  const frame = frames[at] ?? frames[0]

  /* ---------------- history ---------------- */
  const remember = useCallback(() => {
    undo.current.push({ frames: frames.map(copyFrame), at })
    if (undo.current.length > MAX_UNDO) undo.current.shift()
    redo.current.length = 0
  }, [frames, at])

  const stepBack = () => {
    const prev = undo.current.pop()
    if (!prev) return
    redo.current.push({ frames: frames.map(copyFrame), at })
    setFrames(prev.frames)
    setAt(Math.min(prev.at, prev.frames.length - 1))
  }
  const stepForward = () => {
    const next = redo.current.pop()
    if (!next) return
    undo.current.push({ frames: frames.map(copyFrame), at })
    setFrames(next.frames)
    setAt(Math.min(next.at, next.frames.length - 1))
  }

  /* ---------------- editing ---------------- */
  const paint = useCallback(
    (cells: Cell[], glyph: string) => {
      if (!cells.length) return
      setFrames((all) => {
        const copy = all.slice()
        const f = copyFrame(copy[at])
        for (const { c, r } of cells) {
          if (r >= 0 && r < f.length && c >= 0 && c < f[0].length) f[r][c] = glyph
        }
        copy[at] = f
        return copy
      })
    },
    [at],
  )

  const cellsFor = useCallback(
    (from: Cell, to: Cell): Cell[] => {
      switch (tool) {
        case 'line': return lineCells(from, to)
        case 'rect': return rectCells(from, to)
        case 'ellipse': return ellipseCells(from, to)
        default: return [to]
      }
    },
    [tool],
  )

  /* ---------------- painting the canvas ---------------- */
  const layout = useCallback(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    /* offsetWidth, not getBoundingClientRect: a window measured during its
       open animation is still scaled, and the rect reports the scaled size. */
    const availW = Math.max(200, stage.offsetWidth) - 20
    const availH = Math.max(160, stage.offsetHeight) - 20
    // characters are about twice as tall as they are wide, so solve for the
    // font size that fits both ways and take the smaller
    const size = Math.max(6, Math.min(Math.floor((availW / cols) / 0.6), Math.floor(availH / rows)))
    const cw = Math.round(size * 0.6)
    const chh = size
    const pad = 10
    const w = cols * cw + pad * 2
    const h = rows * chh + pad * 2
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    /* Only when it actually changes. Assigning canvas.width resets the
       drawing buffer even if the value is identical, and that reset stops
       captureStream from ever seeing a frame — the recording comes out as a
       WebM header with no video in it. */
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    metrics.current = { w: cw, h: chh, pad }
    return { ctx, cw, ch: chh, pad, w, h, size }
  }, [cols, rows])

  const render = useCallback(() => {
    const L = layout()
    if (!L) return
    const { ctx, cw, ch: chh, pad, w, h, size } = L

    ctx.fillStyle = th.paper
    ctx.fillRect(0, 0, w, h)

    ctx.font = `${size}px 'Azeret Mono Variable', 'Azeret Mono', ui-monospace, monospace`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    const put = (grid: Frame, alpha: number, colour: string) => {
      ctx.globalAlpha = alpha
      ctx.fillStyle = colour
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const g = grid[r][c]
          if (g === ' ') continue
          ctx.fillText(g, pad + c * cw + cw / 2, pad + r * chh + chh / 2 + 1)
        }
      }
      ctx.globalAlpha = 1
    }

    // onion skin: the frame before, faint, so movement can be judged
    if (onion && !playing && at > 0) put(frames[at - 1], 0.26, th.ink)
    put(frame, 1, th.ink)

    if (preview?.length) {
      ctx.globalAlpha = 0.75
      ctx.fillStyle = th.ink
      for (const { c, r } of preview) {
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue
        ctx.fillText(tool === 'eraser' ? '·' : ch, pad + c * cw + cw / 2, pad + r * chh + chh / 2 + 1)
      }
      ctx.globalAlpha = 1
    }

    if (caret && tool === 'text' && !playing) {
      ctx.fillStyle = th.glow
      ctx.fillRect(pad + caret.c * cw, pad + caret.r * chh, cw, chh)
    }
  }, [layout, th, onion, playing, at, frames, frame, preview, rows, cols, tool, ch, caret])

  useEffect(() => { render() }, [render])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const ro = new ResizeObserver(() => render())
    ro.observe(stage)
    return () => ro.disconnect()
  }, [render])

  /* ---------------- playback ---------------- */
  useEffect(() => {
    if (!playing || frames.length < 2) return
    const id = window.setInterval(() => setAt((n) => (n + 1) % frames.length), 1000 / fps)
    return () => window.clearInterval(id)
  }, [playing, fps, frames.length])

  /* ---------------- pointer ---------------- */
  const cellAt = (e: React.PointerEvent): Cell => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const { w, h, pad } = metrics.current
    return {
      c: Math.floor((e.clientX - r.left - pad) / w),
      r: Math.floor((e.clientY - r.top - pad) / h),
    }
  }

  const down = (e: React.PointerEvent) => {
    if (playing) return
    const cell = cellAt(e)
    e.currentTarget.setPointerCapture(e.pointerId)

    if (tool === 'pick') {
      const g = frame[cell.r]?.[cell.c]
      if (g && g !== ' ') { setCh(g); setStatus(`Picked “${g}”`) }
      return
    }
    if (tool === 'text') { setCaret(cell); return }

    remember()
    if (tool === 'fill') { paint(fillCells(frame, cell), ch); return }
    dragFrom.current = cell
    if (tool === 'pencil' || tool === 'eraser') paint([cell], tool === 'eraser' ? ' ' : ch)
    else setPreview([cell])
  }

  const move = (e: React.PointerEvent) => {
    if (playing) return
    const cell = cellAt(e)
    const from = dragFrom.current
    if (!from) return
    if (tool === 'pencil' || tool === 'eraser') {
      // join to the previous cell, or a fast drag leaves a dotted trail
      paint(lineCells(from, cell), tool === 'eraser' ? ' ' : ch)
      dragFrom.current = cell
      return
    }
    if (tool === 'line' || tool === 'rect' || tool === 'ellipse') setPreview(cellsFor(from, cell))
  }

  const up = (e: React.PointerEvent) => {
    const from = dragFrom.current
    dragFrom.current = null
    if (!from || playing) { setPreview(null); return }
    if (tool === 'line' || tool === 'rect' || tool === 'ellipse') paint(cellsFor(from, cellAt(e)), ch)
    setPreview(null)
  }

  /* typing, when the text tool has a caret down */
  useEffect(() => {
    if (tool !== 'text' || !caret) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') { setCaret(null); return }
      if (e.key === 'Enter') { setCaret({ c: caret.c, r: Math.min(rows - 1, caret.r + 1) }); return }
      if (e.key === 'Backspace') {
        const c = Math.max(0, caret.c - 1)
        paint([{ c, r: caret.r }], ' ')
        setCaret({ c, r: caret.r })
        e.preventDefault()
        return
      }
      if (e.key.length !== 1) return
      paint([caret], e.key)
      setCaret({ c: Math.min(cols - 1, caret.c + 1), r: caret.r })
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tool, caret, cols, rows, paint])

  /* ---------------- frames ---------------- */
  const addFrame = (dupe: boolean) => {
    remember()
    setFrames((all) => {
      const copy = all.slice()
      copy.splice(at + 1, 0, dupe ? copyFrame(all[at]) : blank(cols, rows))
      return copy
    })
    setAt((n) => n + 1)
  }
  const dropFrame = () => {
    if (frames.length < 2) { setFrames([blank(cols, rows)]); return }
    remember()
    setFrames((all) => all.filter((_, i) => i !== at))
    setAt((n) => Math.max(0, n - 1))
  }

  const resize = (nc: number, nr: number) => {
    remember()
    setFrames((all) =>
      all.map((f) => {
        const out = blank(nc, nr)
        for (let r = 0; r < Math.min(nr, f.length); r++) {
          for (let c = 0; c < Math.min(nc, f[0].length); c++) out[r][c] = f[r][c]
        }
        return out
      }),
    )
    setCols(nc)
    setRows(nr)
  }

  /* ---------------- getting it out ---------------- */
  const save = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    setStatus(`Saved ${name}`)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(frameToText(frame))
      setStatus('Copied to the clipboard')
    } catch {
      setStatus('The browser would not let us reach the clipboard')
    }
  }

  const saveText = (all: boolean) => {
    const body = all
      ? frames.map((f, i) => `--- frame ${i + 1} ---\n${frameToText(f)}`).join('\n\n')
      : frameToText(frame)
    save(new Blob([body], { type: 'text/plain;charset=utf-8' }), all ? 'ascii-animation.txt' : 'ascii-art.txt')
  }

  const savePng = () => {
    canvasRef.current?.toBlob((b) => b && save(b, 'ascii-art.png'), 'image/png')
  }

  /** Play the animation once into the canvas and record it as it goes. */
  const record = async () => {
    const canvas = canvasRef.current
    if (!canvas || recording) return
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      setStatus('This browser cannot record video')
      return
    }
    const type = ['video/webm;codecs=vp9', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t))
    if (!type) { setStatus('This browser cannot record video'); return }

    setRecording(true)
    setPlaying(false)
    setStatus('Recording…')
    const chunks: Blob[] = []
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: type })
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const done = new Promise<void>((res) => { rec.onstop = () => res() })
    rec.start()

    // enough passes to be worth watching, however few frames there are
    const passes = Math.max(2, Math.ceil(3 / (frames.length / fps)))
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < frames.length; i++) {
        setAt(i)
        await new Promise((r) => setTimeout(r, 1000 / fps))
      }
    }
    rec.stop()
    await done
    setRecording(false)
    save(new Blob(chunks, { type }), 'ascii-animation.webm')
  }

  /** Open a .txt into the current frame, growing the board if it needs to. */
  const load = async (file: File | undefined) => {
    if (!file) return
    const lines = (await file.text()).replace(/\r/g, '').split('\n')
    const nc = Math.max(cols, ...lines.map((l) => l.length))
    const nr = Math.max(rows, lines.length)
    remember()

    const loaded = blank(nc, nr)
    lines.forEach((line, r) => [...line].forEach((g, c) => { loaded[r][c] = g }))

    const grown = (f: Frame) => {
      const out = blank(nc, nr)
      for (let r = 0; r < Math.min(nr, f.length); r++) {
        for (let c = 0; c < Math.min(nc, f[0].length); c++) out[r][c] = f[r][c]
      }
      return out
    }

    setFrames((all) => all.map((f, i) => (i === at ? loaded : grown(f))))
    setCols(nc)
    setRows(nr)
    setStatus(`Loaded ${file.name}`)
  }

  const charsInSet = useMemo(() => [...SETS[setIx].chars], [setIx])

  return (
    <div className="asc" data-theme={th.id}>
      <div className="asc__bar">
        <div className="asc__group">
          <span className="asc__label">Tools</span>
          <div className="asc__tools">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                className="asc__tool"
                data-on={tool === t.id}
                title={t.hint}
                onClick={() => { setTool(t.id); setCaret(null) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="asc__group">
          <span className="asc__label">Characters</span>
          <div className="asc__chars">
            <select
              className="asc__select"
              value={setIx}
              onChange={(e) => setSetIx(Number(e.target.value))}
              aria-label="Character set"
            >
              {SETS.map((s, i) => (
                <option key={s.name} value={i}>{s.name}</option>
              ))}
            </select>
            <div className="asc__glyphs">
              {charsInSet.map((g, i) => (
                <button
                  key={`${g}${i}`}
                  className="asc__glyph"
                  data-on={ch === g}
                  onClick={() => { setCh(g); setTool((t) => (t === 'pick' ? 'pencil' : t)) }}
                  title={g === ' ' ? 'blank' : g}
                >
                  {g === ' ' ? '␣' : g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="asc__group">
          <span className="asc__label">Look</span>
          <div className="asc__themes">
            {THEMES.map((t, i) => (
              <button
                key={t.id}
                className="asc__theme"
                data-on={theme === i}
                style={{ background: t.paper, color: t.ink }}
                onClick={() => setTheme(i)}
              >
                Aa
              </button>
            ))}
          </div>
        </div>

        <div className="asc__group asc__group--end">
          <span className="asc__label">Board</span>
          <div className="asc__size">
            <label>
              w
              <input
                type="number" min={8} max={200} value={cols}
                onChange={(e) => resize(Math.max(8, Math.min(200, Number(e.target.value) || 8)), rows)}
              />
            </label>
            <label>
              h
              <input
                type="number" min={4} max={100} value={rows}
                onChange={(e) => resize(cols, Math.max(4, Math.min(100, Number(e.target.value) || 4)))}
              />
            </label>
            <button className="asc__btn" onClick={stepBack} title="Undo">Undo</button>
            <button className="asc__btn" onClick={stepForward} title="Redo">Redo</button>
            <button
              className="asc__btn"
              onClick={() => { remember(); setFrames((all) => all.map((f, i) => (i === at ? blank(cols, rows) : f))) }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="asc__stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="asc__canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>

      <div className="asc__film">
        <div className="asc__frames">
          {frames.map((_, i) => (
            <button
              key={i}
              className="asc__frame"
              data-on={i === at}
              onClick={() => { setAt(i); setPlaying(false) }}
              title={`Frame ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
          <button className="asc__frame asc__frame--add" onClick={() => addFrame(false)} title="New frame">+</button>
          <button className="asc__frame asc__frame--add" onClick={() => addFrame(true)} title="Duplicate frame">⧉</button>
          <button className="asc__frame asc__frame--add" onClick={dropFrame} title="Delete frame">−</button>
        </div>

        <div className="asc__play">
          <button
            className="asc__btn asc__btn--go"
            onClick={() => { setPlaying((p) => !p); sound.click(0.8) }}
            disabled={frames.length < 2}
          >
            {playing ? 'Stop' : 'Play'}
          </button>
          <label className="asc__fps">
            {fps} fps
            <input type="range" min={1} max={24} value={fps} onChange={(e) => setFps(Number(e.target.value))} />
          </label>
          <label className="asc__onion">
            <input type="checkbox" checked={onion} onChange={(e) => setOnion(e.target.checked)} />
            Onion skin
          </label>
        </div>
      </div>

      <div className="asc__foot">
        <div className="asc__exports">
          <button className="asc__btn" onClick={() => void copy()}>Copy text</button>
          <button className="asc__btn" onClick={() => saveText(false)}>Save .txt</button>
          <button className="asc__btn" onClick={() => saveText(true)} disabled={frames.length < 2}>
            All frames .txt
          </button>
          <button className="asc__btn" onClick={savePng}>Save .png</button>
          <button className="asc__btn" onClick={() => void record()} disabled={recording || frames.length < 2}>
            {recording ? 'Recording…' : 'Record .webm'}
          </button>
          <label className="asc__btn asc__btn--file">
            Open .txt
            <input type="file" accept=".txt,text/plain" onChange={(e) => void load(e.target.files?.[0])} hidden />
          </label>
        </div>
        <p className="asc__status">{status || TOOLS.find((t) => t.id === tool)?.hint}</p>
      </div>
    </div>
  )
}
