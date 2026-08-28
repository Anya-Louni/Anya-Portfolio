import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../os/sound'
import { ColorPicker } from './ColorPicker'

/**
 * Paint.
 *
 * The Windows 7 tool set — pencil, fill, picker, eraser, shapes, and the
 * Brushes dropdown with its natural media — plus a row of patterned brushes
 * that stamp rather than stroke, which the original never had.
 */

type Tool = 'pencil' | 'brush' | 'eraser' | 'fill' | 'picker' | 'line' | 'rect' | 'ellipse'

type Brush =
  | 'round'
  | 'calligraphy'
  | 'airbrush'
  | 'marker'
  | 'crayon'
  | 'watercolour'
  | 'bubbles'
  | 'stars'
  | 'sparkle'
  | 'hearts'
  | 'confetti'
  | 'rainbow'

const BRUSHES: { id: Brush; label: string; pattern?: boolean }[] = [
  { id: 'round', label: 'Brush' },
  { id: 'calligraphy', label: 'Calligraphy' },
  { id: 'airbrush', label: 'Airbrush' },
  { id: 'marker', label: 'Marker' },
  { id: 'crayon', label: 'Crayon' },
  { id: 'watercolour', label: 'Watercolour' },
  { id: 'bubbles', label: 'Bubbles', pattern: true },
  { id: 'stars', label: 'Stars', pattern: true },
  { id: 'sparkle', label: 'Sparkle', pattern: true },
  { id: 'hearts', label: 'Hearts', pattern: true },
  { id: 'confetti', label: 'Confetti', pattern: true },
  { id: 'rainbow', label: 'Rainbow', pattern: true },
]

const SIZES = [2, 5, 10, 20]

/* The real ribbon shows tools as pictures, not words. One stroke weight,
   one cap style, drawn at 16 so they stay crisp at 26px. */
const ToolIcon = ({ id }: { id: Tool }) => {
  const p = (d: React.ReactNode) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
  )
  switch (id) {
    case 'pencil':
      return p(<><path d="M2.5 13.5 3 11l7.4-7.4 2 2L5 13l-2.5.5Z" fill="#f6c667" /><path d="M10.4 3.6 12 2a1.4 1.4 0 0 1 2 2l-1.6 1.6Z" fill="#c9d3e2" /></>)
    case 'brush':
      return p(<><path d="M3 13.5c0-1.6.8-2.6 2-2.6s2 1 2 2.2c0 1-.9 1.4-2 1.4H2.6c.3-.3.4-.6.4-1Z" fill="#f6c667" /><path d="m6.4 10.6 6.2-7.2a1.3 1.3 0 0 1 2 1.7l-6.6 6.7Z" fill="#8fb6e0" /></>)
    case 'eraser':
      return p(<><path d="M2.5 11.2 8 5.7l4.3 4.3-2.5 2.5H4Z" fill="#f2a5b8" /><path d="M8 5.7 10.6 3a1.4 1.4 0 0 1 2 0l2.3 2.3a1.4 1.4 0 0 1 0 2l-2.6 2.7Z" fill="#dfe6f0" /></>)
    case 'fill':
      return p(<><path d="M7.4 2.2 12.8 7.6a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0L2 7.6l4-4Z" fill="#8fd0ff" /><path d="M13.6 10.4c.8 1.2 1.2 2 1.2 2.5a1.2 1.2 0 0 1-2.4 0c0-.5.4-1.3 1.2-2.5Z" fill="#4aa0e8" /></>)
    case 'picker':
      return p(<><path d="M3 13v-1.6l6-6 1.6 1.6-6 6Z" fill="#c9d3e2" /><path d="m10 3.6 1.2-1.2a1.5 1.5 0 0 1 2.4 2.4L12.4 6Z" fill="#8fb6e0" /></>)
    case 'line':
      return p(<path d="M3 13 13 3" />)
    case 'rect':
      return p(<rect x="2.6" y="4" width="10.8" height="8" rx="1" />)
    case 'ellipse':
      return p(<ellipse cx="8" cy="8" rx="5.6" ry="4.2" />)
  }
}

const PALETTE = [
  '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8',
  '#3f48cc', '#a349a4', '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0',
  '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7',
]

const CONFETTI = ['#ff5252', '#ffb02e', '#ffe14d', '#5ad46a', '#3ab7ff', '#a86bff', '#ff77c8']

/* ---------------- stamps ----------------
   Module scope on purpose: the brush swatches in the ribbon paint their
   preview with the same routine that paints the canvas, so what you see
   on the button is literally what the brush does. */

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points = 5) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.44
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const px = x + Math.cos(a) * rad
    const py = y + Math.sin(a) * rad
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y + r * 0.75)
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.4, x - r * 0.5, y - r * 1.2, x, y - r * 0.4)
  ctx.bezierCurveTo(x + r * 0.5, y - r * 1.2, x + r * 1.4, y - r * 0.4, x, y + r * 0.75)
  ctx.closePath()
  ctx.fill()
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = col + '33'
  ctx.fill()
  ctx.strokeStyle = col
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x - r * 0.32, y - r * 0.34, Math.max(1, r * 0.22), 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
}

let hue = 0

function stamp(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  from: { x: number; y: number },
  to: { x: number; y: number },
  c: string,
  s: number,
) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const rnd = (a: number, b: number) => a + Math.random() * (b - a)

  ctx.save()
  switch (brush) {
    case 'airbrush': {
      ctx.fillStyle = c
      for (let i = 0; i < s * 3; i++) {
        const a = Math.random() * Math.PI * 2
        const d = Math.random() * s * 1.8
        ctx.globalAlpha = 0.18
        ctx.fillRect(to.x + Math.cos(a) * d, to.y + Math.sin(a) * d, 1.2, 1.2)
      }
      break
    }
    case 'calligraphy': {
      ctx.strokeStyle = c
      ctx.lineWidth = s
      ctx.lineCap = 'butt'
      const ang = 0.7
      ctx.beginPath()
      ctx.moveTo(from.x - Math.cos(ang) * s, from.y - Math.sin(ang) * s)
      ctx.lineTo(to.x + Math.cos(ang) * s, to.y + Math.sin(ang) * s)
      ctx.stroke()
      break
    }
    case 'marker': {
      ctx.globalAlpha = 0.35
      ctx.globalCompositeOperation = 'multiply'
      ctx.strokeStyle = c
      ctx.lineWidth = s * 2.2
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      break
    }
    case 'crayon': {
      ctx.strokeStyle = c
      ctx.lineWidth = 1.4
      for (let i = 0; i < s * 2.4; i++) {
        ctx.globalAlpha = rnd(0.08, 0.34)
        const j = () => rnd(-s, s)
        ctx.beginPath()
        ctx.moveTo(from.x + j(), from.y + j())
        ctx.lineTo(to.x + j(), to.y + j())
        ctx.stroke()
      }
      break
    }
    case 'watercolour': {
      ctx.globalAlpha = 0.1
      ctx.fillStyle = c
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.arc(to.x + rnd(-s, s), to.y + rnd(-s, s), s * rnd(1.1, 2.4), 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'bubbles': {
      if (dist < s * 1.4 && Math.random() > 0.35) break
      bubble(ctx, to.x + rnd(-s, s), to.y + rnd(-s, s), rnd(s * 0.6, s * 1.6), c)
      break
    }
    case 'stars': {
      if (dist < s * 1.2 && Math.random() > 0.4) break
      ctx.fillStyle = c
      ctx.save()
      ctx.translate(to.x + rnd(-s, s), to.y + rnd(-s, s))
      ctx.rotate(Math.random() * Math.PI * 2)
      star(ctx, 0, 0, rnd(s * 0.7, s * 1.5))
      ctx.restore()
      break
    }
    case 'sparkle': {
      ctx.fillStyle = c
      ctx.save()
      ctx.translate(to.x + rnd(-s, s), to.y + rnd(-s, s))
      ctx.rotate(Math.random() * Math.PI)
      star(ctx, 0, 0, rnd(s * 0.6, s * 1.4), 4)
      ctx.restore()
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = rnd(0.4, 1)
        ctx.beginPath()
        ctx.arc(to.x + rnd(-s * 2, s * 2), to.y + rnd(-s * 2, s * 2), rnd(0.7, 1.8), 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'hearts': {
      if (dist < s * 1.3 && Math.random() > 0.35) break
      ctx.fillStyle = c
      ctx.save()
      ctx.translate(to.x + rnd(-s, s), to.y + rnd(-s, s))
      ctx.rotate(rnd(-0.5, 0.5))
      heart(ctx, 0, 0, rnd(s * 0.6, s * 1.3))
      ctx.restore()
      break
    }
    case 'confetti': {
      for (let i = 0; i < 2; i++) {
        ctx.save()
        ctx.translate(to.x + rnd(-s * 1.8, s * 1.8), to.y + rnd(-s * 1.8, s * 1.8))
        ctx.rotate(Math.random() * Math.PI)
        ctx.fillStyle = CONFETTI[Math.floor(Math.random() * CONFETTI.length)]
        ctx.fillRect(0, 0, rnd(s * 0.4, s), rnd(s * 0.2, s * 0.5))
        ctx.restore()
      }
      break
    }
    case 'rainbow': {
      hue = (hue + 4) % 360
      ctx.strokeStyle = `hsl(${hue} 90% 55%)`
      ctx.lineWidth = s * 1.6
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      break
    }
    default: {
      ctx.strokeStyle = c
      ctx.lineWidth = s
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** The swatch on the ribbon button, drawn with the real brush. */
function BrushSample({ brush }: { brush: Brush }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const w = (c.width = 52)
    const h = (c.height = 52)
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // a diagonal sweep, the way Paint samples its brushes
    let prev = { x: 8, y: 42 }
    for (let i = 1; i <= 22; i++) {
      const t = i / 22
      const pt = { x: 8 + t * 36, y: 42 - t * 30 + Math.sin(t * 5) * 3.5 }
      stamp(ctx, brush, prev, pt, '#1b2a3d', 5)
      prev = pt
    }
  }, [brush])
  return <canvas ref={ref} className="pt__sample" aria-hidden />
}

export default function Paint() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const snapshot = useRef<ImageData | null>(null)
  const undoStack = useRef<ImageData[]>([])
  const redoStack = useRef<ImageData[]>([])

  const [tool, setTool] = useState<Tool>('brush')
  const [brush, setBrush] = useState<Brush>('round')
  const [size, setSize] = useState(5)
  const [colour, setColour] = useState('#000000')
  const [colour2, setColour2] = useState('#ffffff')
  const [status, setStatus] = useState('')
  const [picking, setPicking] = useState(false)

  const W = 900
  const H = 560

  const seed = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
  }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctxRef.current = ctx
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    seed(ctx)
    undoStack.current = [ctx.getImageData(0, 0, W, H)]
  }, [seed])

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  const pushUndo = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    undoStack.current.push(ctx.getImageData(0, 0, W, H))
    if (undoStack.current.length > 30) undoStack.current.shift()
    redoStack.current = []
  }

  const dab = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) => stamp(ctx, brush, from, to, tool === 'eraser' ? colour2 : colour, size)

  /* ---------------- flood fill ---------------- */
  const flood = (x: number, y: number, hex: string) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const img = ctx.getImageData(0, 0, W, H)
    const d = img.data
    const at = (px: number, py: number) => (py * W + px) * 4
    const i0 = at(Math.round(x), Math.round(y))
    const target = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]]
    const m = /^#(\w\w)(\w\w)(\w\w)$/.exec(hex)
    if (!m) return
    const fill = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), 255]
    if (target.every((v, i) => Math.abs(v - fill[i]) < 4)) return

    const near = (i: number) =>
      Math.abs(d[i] - target[0]) < 24 &&
      Math.abs(d[i + 1] - target[1]) < 24 &&
      Math.abs(d[i + 2] - target[2]) < 24 &&
      Math.abs(d[i + 3] - target[3]) < 24

    const stack = [[Math.round(x), Math.round(y)]]
    while (stack.length) {
      const [px, py] = stack.pop()!
      if (px < 0 || py < 0 || px >= W || py >= H) continue
      const i = at(px, py)
      if (!near(i)) continue
      d[i] = fill[0]
      d[i + 1] = fill[1]
      d[i + 2] = fill[2]
      d[i + 3] = 255
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1])
    }
    ctx.putImageData(img, 0, 0)
  }

  /* ---------------- pointer ---------------- */
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const ctx = ctxRef.current
    if (!ctx) return
    const p = pos(e)
    pushUndo()

    if (tool === 'picker') {
      const d = ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data
      const hex = `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
      setColour(hex)
      setTool('brush')
      sound.click(1.4)
      return
    }
    if (tool === 'fill') {
      flood(p.x, p.y, colour)
      sound.click(0.9)
      return
    }

    drawing.current = true
    last.current = p
    start.current = p
    if (tool === 'line' || tool === 'rect' || tool === 'ellipse') {
      snapshot.current = ctx.getImageData(0, 0, W, H)
    } else {
      dab(ctx, p, p)
    }
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const move = (e: React.PointerEvent) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const p = pos(e)
    setStatus(`${Math.round(p.x)}, ${Math.round(p.y)} px`)
    if (!drawing.current) return

    if (tool === 'line' || tool === 'rect' || tool === 'ellipse') {
      if (snapshot.current) ctx.putImageData(snapshot.current, 0, 0)
      const s = start.current!
      ctx.save()
      ctx.strokeStyle = colour
      ctx.lineWidth = size
      ctx.beginPath()
      if (tool === 'line') {
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(p.x, p.y)
      } else if (tool === 'rect') {
        ctx.rect(s.x, s.y, p.x - s.x, p.y - s.y)
      } else {
        ctx.ellipse(
          (s.x + p.x) / 2,
          (s.y + p.y) / 2,
          Math.abs(p.x - s.x) / 2,
          Math.abs(p.y - s.y) / 2,
          0,
          0,
          Math.PI * 2,
        )
      }
      ctx.stroke()
      ctx.restore()
      return
    }

    if (!last.current) return
    dab(ctx, last.current, p)
    last.current = p
  }

  const up = () => {
    drawing.current = false
    last.current = null
    start.current = null
    snapshot.current = null
  }

  const undo = () => {
    const ctx = ctxRef.current
    const prev = undoStack.current.pop()
    if (!ctx || !prev) return
    redoStack.current.push(ctx.getImageData(0, 0, W, H))
    ctx.putImageData(prev, 0, 0)
    sound.click(0.85)
  }
  const redo = () => {
    const ctx = ctxRef.current
    const next = redoStack.current.pop()
    if (!ctx || !next) return
    undoStack.current.push(ctx.getImageData(0, 0, W, H))
    ctx.putImageData(next, 0, 0)
    sound.click(1.1)
  }
  const clear = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    pushUndo()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
  }
  const save = () => {
    const a = document.createElement('a')
    a.download = 'untitled.png'
    a.href = canvasRef.current!.toDataURL('image/png')
    a.click()
  }

  const TOOLS: { id: Tool; label: string }[] = [
    { id: 'pencil', label: 'Pencil' },
    { id: 'brush', label: 'Brush' },
    { id: 'fill', label: 'Fill with colour' },
    { id: 'picker', label: 'Colour picker' },
    { id: 'eraser', label: 'Eraser' },
    { id: 'line', label: 'Line' },
    { id: 'rect', label: 'Rectangle' },
    { id: 'ellipse', label: 'Oval' },
  ]

  return (
    <div className="pt">
      <div className="pt__ribbon">
        <div className="pt__group">
          <span className="pt__groupLabel">Tools</span>
          <div className="pt__tools">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                className="pt__toolBtn"
                title={t.label}
                aria-label={t.label}
                data-on={tool === t.id}
                onClick={() => setTool(t.id)}
              >
                <ToolIcon id={t.id} />
              </button>
            ))}
          </div>
        </div>

        <div className="pt__group">
          <span className="pt__groupLabel">Brushes</span>
          <div className="pt__grid pt__grid--brushes">
            {BRUSHES.map((b) => (
              <button
                key={b.id}
                className="pt__brush"
                title={b.label}
                aria-label={b.label}
                data-on={brush === b.id && tool === 'brush'}
                onClick={() => {
                  setBrush(b.id)
                  setTool('brush')
                }}
              >
                <BrushSample brush={b.id} />
              </button>
            ))}
          </div>
        </div>

        <div className="pt__group">
          <span className="pt__groupLabel">Size</span>
          <div className="pt__sizes">
            {SIZES.map((s) => (
              <button
                key={s}
                className="pt__size"
                data-on={size === s}
                aria-label={`${s} pixels`}
                onClick={() => setSize(s)}
              >
                <i style={{ height: Math.max(2, s / 2) }} />
              </button>
            ))}
          </div>
        </div>

        <div className="pt__group">
          <span className="pt__groupLabel">Colours</span>
          <div className="pt__colours">
            <div className="pt__current">
              <span className="pt__swatchBig" style={{ background: colour }} title="Colour 1" />
              <span className="pt__swatchBig pt__swatchBig--two" style={{ background: colour2 }} title="Colour 2" />
            </div>
            <div className="pt__palette">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className="pt__swatch"
                  style={{ background: c }}
                  aria-label={c}
                  onClick={() => setColour(c)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setColour2(c)
                  }}
                />
              ))}
            </div>
            <button className="pt__edit" onClick={() => setPicking(true)}>
              <span className="pt__editSwatch" style={{ background: colour }} />
              Edit
              <br />
              colours
            </button>
          </div>
        </div>

        <div className="pt__group pt__group--right">
          <span className="pt__groupLabel">File</span>
          <div className="pt__grid">
            <button className="game__btn" onClick={undo}>Undo</button>
            <button className="game__btn" onClick={redo}>Redo</button>
            <button className="game__btn" onClick={clear}>Clear</button>
            <button className="game__btn" onClick={save}>Save</button>
          </div>
        </div>
      </div>

      <div className="pt__stage">
        <canvas
          ref={canvasRef}
          className="pt__canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={() => setStatus('')}
        />
      </div>

      {picking ? (
        <ColorPicker initial={colour} onPick={setColour} onClose={() => setPicking(false)} />
      ) : null}

      <div className="pt__status">
        <span>{status || `${W} × ${H}px`}</span>
        <span className="game__spacer" />
        <span>
          {tool === 'brush' ? BRUSHES.find((b) => b.id === brush)?.label : TOOLS.find((t) => t.id === tool)?.label}
          {' · '}
          {size}px
        </span>
      </div>
    </div>
  )
}
