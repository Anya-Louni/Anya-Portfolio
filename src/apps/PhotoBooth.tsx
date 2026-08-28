import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../os/sound'

/**
 * Photo Booth.
 *
 * Camera is only opened when asked, nothing is uploaded, and shots live in
 * memory until the window closes. Filters are per-pixel passes; frames are
 * drawn over the top; and every shot can be doodled on before you keep it.
 */

type Filter =
  | 'none' | 'sepia' | 'noir' | 'aqua' | 'thermal'
  | 'xray' | 'comic' | 'pop' | 'mirror' | 'bulge'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'none', label: 'Normal' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'noir', label: 'Noir' },
  { id: 'aqua', label: 'Aqua' },
  { id: 'thermal', label: 'Thermal' },
  { id: 'xray', label: 'X-Ray' },
  { id: 'comic', label: 'Comic' },
  { id: 'pop', label: 'Pop Art' },
  { id: 'mirror', label: 'Mirror' },
  { id: 'bulge', label: 'Bulge' },
]

type Frame = 'none' | 'polaroid' | 'film' | 'bubbles' | 'hearts' | 'stars' | 'aero' | 'tape'

const FRAMES: { id: Frame; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'film', label: 'Film' },
  { id: 'bubbles', label: 'Bubbles' },
  { id: 'hearts', label: 'Hearts' },
  { id: 'stars', label: 'Stars' },
  { id: 'aero', label: 'Aero' },
  { id: 'tape', label: 'Tape' },
]

const PENS = ['#ff3b6b', '#ffd23f', '#4fd48a', '#3aa8f0', '#a86bff', '#ffffff', '#12161f']

/* ------------------------------------------------------------------
   Frames are painted over the finished pixels, so what you see in the
   preview is exactly what gets saved.
   ------------------------------------------------------------------ */
function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, frame: Frame) {
  if (frame === 'none') return
  const pad = Math.round(Math.min(w, h) * 0.045)

  const scatter = (draw: (x: number, y: number, s: number, i: number) => void, n = 26) => {
    for (let i = 0; i < n; i++) {
      const edge = i % 4
      const t = ((i * 37) % 100) / 100
      const off = pad * (0.5 + ((i * 17) % 10) / 14)
      const x = edge === 0 || edge === 2 ? t * w : edge === 1 ? w - off : off
      const y = edge === 1 || edge === 3 ? t * h : edge === 0 ? off : h - off
      draw(x, y, pad * (0.5 + ((i * 23) % 9) / 12), i)
    }
  }

  switch (frame) {
    case 'polaroid': {
      const b = Math.round(w * 0.045)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = b * 2
      ctx.strokeRect(0, 0, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, h - b * 5, w, b * 5)
      ctx.strokeStyle = 'rgba(20,30,50,0.14)'
      ctx.lineWidth = 1
      ctx.strokeRect(b, b, w - b * 2, h - b * 6)
      break
    }
    case 'film': {
      const b = Math.round(w * 0.05)
      ctx.fillStyle = '#14161d'
      ctx.fillRect(0, 0, b, h)
      ctx.fillRect(w - b, 0, b, h)
      ctx.fillStyle = '#f2f4f8'
      const hole = b * 0.5
      for (let y = hole; y < h - hole; y += hole * 2.4) {
        ctx.beginPath()
        ctx.roundRect(b * 0.25, y, hole, hole * 1.2, 2)
        ctx.fill()
        ctx.beginPath()
        ctx.roundRect(w - b * 0.25 - hole, y, hole, hole * 1.2, 2)
        ctx.fill()
      }
      break
    }
    case 'bubbles': {
      scatter((x, y, s) => {
        ctx.beginPath()
        ctx.arc(x, y, s, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(160,230,255,0.28)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.lineWidth = 1.6
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x - s * 0.32, y - s * 0.34, s * 0.22, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      }, 30)
      break
    }
    case 'hearts': {
      scatter((x, y, s, i) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(((i * 41) % 60) / 100 - 0.3)
        ctx.beginPath()
        ctx.moveTo(0, s * 0.7)
        ctx.bezierCurveTo(-s * 1.4, -s * 0.4, -s * 0.5, -s * 1.2, 0, -s * 0.4)
        ctx.bezierCurveTo(s * 0.5, -s * 1.2, s * 1.4, -s * 0.4, 0, s * 0.7)
        ctx.fillStyle = i % 3 ? '#ff6b93' : '#ffd0dd'
        ctx.fill()
        ctx.restore()
      }, 26)
      break
    }
    case 'stars': {
      scatter((x, y, s, i) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(i)
        ctx.beginPath()
        for (let k = 0; k < 10; k++) {
          const rad = k % 2 === 0 ? s : s * 0.44
          const a = (k / 10) * Math.PI * 2 - Math.PI / 2
          const px = Math.cos(a) * rad
          const py = Math.sin(a) * rad
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
        }
        ctx.closePath()
        ctx.fillStyle = i % 3 ? '#ffd23f' : '#fff6c2'
        ctx.fill()
        ctx.restore()
      }, 26)
      break
    }
    case 'aero': {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, 'rgba(255,255,255,0.5)')
      g.addColorStop(0.42, 'rgba(255,255,255,0.06)')
      g.addColorStop(0.43, 'rgba(120,200,255,0)')
      g.addColorStop(1, 'rgba(80,180,255,0.24)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.lineWidth = pad * 0.9
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.roundRect(pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, pad)
      ctx.stroke()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = 'rgba(60,150,230,0.55)'
      ctx.stroke()
      break
    }
    case 'tape': {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h * 0.02)
      ctx.fillRect(0, h - h * 0.02, w, h * 0.02)
      ctx.fillRect(0, 0, w * 0.02, h)
      ctx.fillRect(w - w * 0.02, 0, w * 0.02, h)
      const strip = (cx: number, cy: number, rot: number) => {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rot)
        ctx.fillStyle = 'rgba(255,244,190,0.82)'
        ctx.fillRect(-w * 0.11, -h * 0.028, w * 0.22, h * 0.056)
        ctx.strokeStyle = 'rgba(190,170,90,0.5)'
        ctx.lineWidth = 1
        ctx.strokeRect(-w * 0.11, -h * 0.028, w * 0.22, h * 0.056)
        ctx.restore()
      }
      strip(w * 0.12, h * 0.06, -0.42)
      strip(w * 0.88, h * 0.06, 0.42)
      strip(w * 0.12, h * 0.94, 0.42)
      strip(w * 0.88, h * 0.94, -0.42)
      break
    }
  }
}

export default function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const doodleRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPt = useRef<{ x: number; y: number } | null>(null)

  const [filter, setFilter] = useState<Filter>('none')
  const [frame, setFrame] = useState<Frame>('none')
  const [live, setLive] = useState(false)
  const [error, setError] = useState('')
  const [shots, setShots] = useState<string[]>([])
  const [countdown, setCountdown] = useState(0)
  const [flash, setFlash] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [pen, setPen] = useState(PENS[0])
  const [penSize, setPenSize] = useState(6)

  const filterRef = useRef(filter)
  const frameRef = useRef(frame)
  filterRef.current = filter
  frameRef.current = frame

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setLive(false)
  }, [])
  useEffect(() => stop, [stop])

  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setLive(true)
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'The camera was blocked. Allow it in the address bar and try again.'
          : 'No camera available on this device.',
      )
    }
  }

  const applyFilter = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, f: Filter) => {
    if (f === 'none') return
    if (f === 'bulge') {
      const src = ctx.getImageData(0, 0, w, h)
      const out = ctx.createImageData(w, h)
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.42
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x - cx
          const dy = y - cy
          const d = Math.hypot(dx, dy)
          let sx = x
          let sy = y
          if (d < r) {
            const k = Math.pow(d / r, 1.7)
            sx = Math.round(cx + dx * k)
            sy = Math.round(cy + dy * k)
          }
          const si = (Math.min(h - 1, Math.max(0, sy)) * w + Math.min(w - 1, Math.max(0, sx))) * 4
          const di = (y * w + x) * 4
          out.data[di] = src.data[si]
          out.data[di + 1] = src.data[si + 1]
          out.data[di + 2] = src.data[si + 2]
          out.data[di + 3] = 255
        }
      }
      ctx.putImageData(out, 0, 0)
      return
    }
    if (f === 'mirror') {
      const half = ctx.getImageData(0, 0, Math.floor(w / 2), h)
      ctx.save()
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      ctx.putImageData(half, 0, 0)
      ctx.restore()
      return
    }
    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      switch (f) {
        case 'sepia':
          d[i] = Math.min(255, lum + 46); d[i + 1] = Math.min(255, lum + 14); d[i + 2] = Math.max(0, lum - 26)
          break
        case 'noir': {
          const c = lum > 128 ? Math.min(255, lum * 1.25) : lum * 0.7
          d[i] = d[i + 1] = d[i + 2] = c
          break
        }
        case 'aqua':
          d[i] = lum * 0.45; d[i + 1] = Math.min(255, lum * 1.05 + 24); d[i + 2] = Math.min(255, lum * 1.25 + 46)
          break
        case 'thermal': {
          const t = lum / 255
          d[i] = Math.min(255, Math.max(0, (t - 0.4) * 4 * 255))
          d[i + 1] = Math.min(255, Math.max(0, (0.7 - Math.abs(t - 0.55) * 2.4) * 255))
          d[i + 2] = Math.min(255, Math.max(0, (0.6 - t) * 3 * 255))
          break
        }
        case 'xray':
          d[i] = 255 - r; d[i + 1] = 255 - g; d[i + 2] = 255 - b
          break
        case 'comic': {
          const q = (v: number) => Math.round(v / 64) * 64
          d[i] = q(r); d[i + 1] = q(g); d[i + 2] = q(b)
          break
        }
        case 'pop':
          d[i] = r > 128 ? 255 : 40; d[i + 1] = g > 110 ? 90 : 20; d[i + 2] = b > 100 ? 220 : 60
          break
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [])

  useEffect(() => {
    if (!live) return
    let raf = 0
    const draw = () => {
      const v = videoRef.current
      const c = canvasRef.current
      if (v && c && v.videoWidth) {
        const w = (c.width = 480)
        const h = (c.height = Math.round((v.videoHeight / v.videoWidth) * 480))
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.save()
        ctx.translate(w, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(v, 0, 0, w, h)
        ctx.restore()
        applyFilter(ctx, w, h, filterRef.current)
        drawFrame(ctx, w, h, frameRef.current)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [live, applyFilter])

  const snap = () => {
    let n = 3
    setCountdown(n)
    sound.click(1.3)
    const id = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n > 0) { sound.click(1.3); return }
      clearInterval(id)
      setCountdown(0)
      setFlash(true)
      sound.chime()
      window.setTimeout(() => setFlash(false), 220)
      const c = canvasRef.current
      if (c) setShots((s) => [c.toDataURL('image/png'), ...s].slice(0, 16))
    }, 800)
  }

  /* ---------------- doodle editor ---------------- */
  const openEditor = (src: string) => {
    setEditing(src)
    const img = new Image()
    img.onload = () => {
      const c = doodleRef.current
      if (!c) return
      c.width = img.width
      c.height = img.height
      c.getContext('2d')!.drawImage(img, 0, 0)
    }
    img.src = src
  }

  const dPos = (e: React.PointerEvent) => {
    const c = doodleRef.current!
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }
  }
  const dDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drawing.current = true
    lastPt.current = dPos(e)
    doodleRef.current?.setPointerCapture(e.pointerId)
  }
  const dMove = (e: React.PointerEvent) => {
    if (!drawing.current || !lastPt.current) return
    const c = doodleRef.current!
    const ctx = c.getContext('2d')!
    const p = dPos(e)
    ctx.strokeStyle = pen
    ctx.lineWidth = penSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastPt.current = p
  }
  const dUp = () => {
    drawing.current = false
    lastPt.current = null
  }

  const keepDoodle = () => {
    const c = doodleRef.current
    if (!c || !editing) return
    const out = c.toDataURL('image/png')
    setShots((s) => s.map((x) => (x === editing ? out : x)))
    setEditing(null)
    sound.chime()
  }

  const save = (src: string) => {
    const a = document.createElement('a')
    a.download = `photo-booth-${Date.now()}.png`
    a.href = src
    a.click()
  }

  return (
    <div className="pb">
      <div className="pb__main">
        <aside className="pb__rail">
          <p className="pb__railHead">Effect</p>
          {FILTERS.map((f) => (
            <button key={f.id} className="pb__railBtn" data-on={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </aside>

        <div className="pb__stage">
          {live ? (
            <>
              <canvas ref={canvasRef} className="pb__canvas" />
              {countdown ? <span className="pb__count">{countdown}</span> : null}
              {flash ? <span className="pb__flash" /> : null}
            </>
          ) : (
            <div className="pb__off">
              <p className="pb__offTitle">Camera is off</p>
              <p className="pb__offBody">
                Nothing is recorded and nothing is uploaded — photos stay in this window until you
                close it.
              </p>
              {error ? <p className="pb__error">{error}</p> : null}
              <button className="aero-btn aero-btn--primary" onClick={start}>
                Turn on the camera
              </button>
            </div>
          )}
          <video ref={videoRef} playsInline muted className="pb__video" />
        </div>

        <aside className="pb__rail pb__rail--right">
          <p className="pb__railHead">Frame</p>
          {FRAMES.map((f) => (
            <button key={f.id} className="pb__railBtn" data-on={frame === f.id} onClick={() => setFrame(f.id)}>
              {f.label}
            </button>
          ))}
        </aside>
      </div>

      <div className="pb__bar">
        <button className="pb__shutter" onClick={snap} disabled={!live || countdown > 0} aria-label="Take a photo">
          <span />
        </button>
        {live ? (
          <button className="game__btn" onClick={stop}>Turn camera off</button>
        ) : null}
        <span className="game__spacer" />
        <span className="game__stat">
          {shots.length ? `${shots.length} shot${shots.length === 1 ? '' : 's'} · click one to draw on it` : 'No shots yet'}
        </span>
      </div>

      {shots.length ? (
        <div className="pb__strip">
          {shots.map((s, i) => (
            <div className="pb__thumb" key={i}>
              <img src={s} alt={`Shot ${shots.length - i}`} onClick={() => openEditor(s)} />
              <button className="pb__thumbSave" onClick={() => save(s)} aria-label="Save this one">
                ↓
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {editing ? (
        <div className="pb__editor">
          <div className="pb__editorBar">
            <span className="pb__editorTitle">Draw on it</span>
            <div className="pb__pens">
              {PENS.map((c) => (
                <button
                  key={c}
                  className="pb__pen"
                  style={{ background: c }}
                  data-on={pen === c}
                  aria-label={c}
                  onClick={() => setPen(c)}
                />
              ))}
            </div>
            <div className="pb__penSizes">
              {[3, 6, 12, 22].map((s) => (
                <button key={s} className="pb__penSize" data-on={penSize === s} onClick={() => setPenSize(s)}>
                  <i style={{ width: s / 1.6, height: s / 1.6 }} />
                </button>
              ))}
            </div>
            <span className="game__spacer" />
            <button className="game__btn" onClick={() => openEditor(editing)}>Undo all</button>
            <button className="game__btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="aero-btn aero-btn--primary" onClick={keepDoodle}>Keep</button>
          </div>
          <div className="pb__editorStage">
            <canvas
              ref={doodleRef}
              className="pb__doodle"
              onPointerDown={dDown}
              onPointerMove={dMove}
              onPointerUp={dUp}
              onPointerCancel={dUp}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
