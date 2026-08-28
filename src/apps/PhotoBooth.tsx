import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../os/sound'

/**
 * Photo Booth.
 *
 * The camera is never opened until the visitor asks for it, nothing is
 * uploaded, and shots live in memory until the window closes. Filters are
 * per-pixel passes on a canvas, in the register of the era's webcam software.
 */

type Filter =
  | 'none'
  | 'sepia'
  | 'thermal'
  | 'xray'
  | 'aqua'
  | 'comic'
  | 'mirror'
  | 'bulge'
  | 'pop'
  | 'noir'

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

export default function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [filter, setFilter] = useState<Filter>('none')
  const [live, setLive] = useState(false)
  const [error, setError] = useState('')
  const [shots, setShots] = useState<string[]>([])
  const [countdown, setCountdown] = useState(0)
  const [flash, setFlash] = useState(false)
  const filterRef = useRef(filter)
  filterRef.current = filter

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

  /* ---------------- filters ---------------- */
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
          d[i] = Math.min(255, lum + 46)
          d[i + 1] = Math.min(255, lum + 14)
          d[i + 2] = Math.max(0, lum - 26)
          break
        case 'noir': {
          const c = lum > 128 ? Math.min(255, lum * 1.25) : lum * 0.7
          d[i] = d[i + 1] = d[i + 2] = c
          break
        }
        case 'aqua':
          d[i] = lum * 0.45
          d[i + 1] = Math.min(255, lum * 1.05 + 24)
          d[i + 2] = Math.min(255, lum * 1.25 + 46)
          break
        case 'thermal': {
          const t = lum / 255
          d[i] = Math.min(255, Math.max(0, (t - 0.4) * 4 * 255))
          d[i + 1] = Math.min(255, Math.max(0, (0.7 - Math.abs(t - 0.55) * 2.4) * 255))
          d[i + 2] = Math.min(255, Math.max(0, (0.6 - t) * 3 * 255))
          break
        }
        case 'xray':
          d[i] = 255 - r
          d[i + 1] = 255 - g
          d[i + 2] = 255 - b
          break
        case 'comic': {
          const q = (v: number) => Math.round(v / 64) * 64
          d[i] = q(r)
          d[i + 1] = q(g)
          d[i + 2] = q(b)
          break
        }
        case 'pop': {
          d[i] = r > 128 ? 255 : 40
          d[i + 1] = g > 110 ? 90 : 20
          d[i + 2] = b > 100 ? 220 : 60
          break
        }
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [])

  /* live preview */
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
        ctx.scale(-1, 1) // a mirror, like every webcam app
        ctx.drawImage(v, 0, 0, w, h)
        ctx.restore()
        applyFilter(ctx, w, h, filterRef.current)
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
      if (n > 0) {
        sound.click(1.3)
        return
      }
      clearInterval(id)
      setCountdown(0)
      setFlash(true)
      sound.chime()
      window.setTimeout(() => setFlash(false), 220)
      const c = canvasRef.current
      if (c) setShots((s) => [c.toDataURL('image/png'), ...s].slice(0, 12))
    }, 800)
  }

  const save = (src: string) => {
    const a = document.createElement('a')
    a.download = `photo-booth-${Date.now()}.png`
    a.href = src
    a.click()
  }

  return (
    <div className="pb">
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

      <div className="pb__filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className="game__btn"
            data-on={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="pb__bar">
        <button className="pb__shutter" onClick={snap} disabled={!live || countdown > 0}>
          <span />
        </button>
        {live ? (
          <button className="game__btn" onClick={stop}>
            Turn camera off
          </button>
        ) : null}
        <span className="game__spacer" />
        <span className="game__stat">{shots.length ? `${shots.length} shots` : 'No shots yet'}</span>
      </div>

      {shots.length ? (
        <div className="pb__strip">
          {shots.map((s, i) => (
            <button key={i} className="pb__thumb" onClick={() => save(s)} title="Save this one">
              <img src={s} alt={`Shot ${shots.length - i}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
