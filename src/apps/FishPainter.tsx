import { useCallback, useEffect, useRef, useState } from 'react'
import { FISH_H, FISH_W, fishPath } from '../aquarium/silhouette'
import { releasedFish, saveFish } from '../lib/fish'
import { useOS } from '../os/store'
import { sound } from '../os/sound'

const SCALE = 4 // the painter works at 512x320, saved down to 128x80
const PALETTE = [
  '#ff5252', '#ff8f2e', '#ffd23f', '#8bd94a', '#2fc46b', '#25c9c0',
  '#3aa8ff', '#3f5bd8', '#8b5cf6', '#e256c0', '#ff8fbe', '#7a4a2a',
  '#ffffff', '#b9c6d6', '#4a5568', '#12172b',
]
const SIZES = [6, 14, 28]

export default function FishPainter() {
  const userName = useOS((s) => s.userName)
  const pushToast = useOS((s) => s.pushToast)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const history = useRef<ImageData[]>([])

  const [colour, setColour] = useState(PALETTE[6])
  const [size, setSize] = useState(SIZES[1])
  const [erasing, setErasing] = useState(false)
  const [name, setName] = useState(userName)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')
  /** one fish per visitor: what this browser has already released */
  const [mine, setMine] = useState(() => releasedFish())

  const W = FISH_W * SCALE
  const H = FISH_H * SCALE

  const paintBase = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.scale(SCALE, SCALE)
      const path = fishPath('standard')
      ctx.fillStyle = '#ffffff'
      ctx.fill(path)
      ctx.restore()
    },
    [W, H],
  )

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
    paintBase(ctx)
    history.current = [ctx.getImageData(0, 0, W, H)]
  }, [W, H, paintBase])

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.save()
    ctx.scale(SCALE, SCALE)
    ctx.clip(fishPath('standard')) // nothing escapes the fish
    ctx.restore()
    ctx.save()
    ctx.beginPath()
    ctx.scale(SCALE, SCALE)
    ctx.clip(fishPath('standard'))
    ctx.scale(1 / SCALE, 1 / SCALE)
    ctx.strokeStyle = erasing ? '#ffffff' : colour
    ctx.lineWidth = size * (erasing ? 1.6 : 1)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.restore()
  }

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const ctx = ctxRef.current
    if (!ctx) return
    history.current.push(ctx.getImageData(0, 0, W, H))
    if (history.current.length > 24) history.current.shift()
    drawing.current = true
    const p = pos(e)
    last.current = p
    stroke(p, { x: p.x + 0.01, y: p.y })
    canvasRef.current?.setPointerCapture(e.pointerId)
    setState('idle')
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return
    const p = pos(e)
    stroke(last.current, p)
    last.current = p
  }

  const up = () => {
    drawing.current = false
    last.current = null
  }

  const undo = () => {
    const ctx = ctxRef.current
    const prev = history.current.pop()
    if (!ctx || !prev) return
    ctx.putImageData(prev, 0, 0)
    sound.click(0.85)
  }

  const clear = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    history.current.push(ctx.getImageData(0, 0, W, H))
    paintBase(ctx)
    sound.click(0.8)
  }

  /** flatten to a 128x80 png with the eye painted on top */
  const bake = () => {
    const out = document.createElement('canvas')
    out.width = FISH_W
    out.height = FISH_H
    const ctx = out.getContext('2d')!
    ctx.drawImage(canvasRef.current!, 0, 0, FISH_W, FISH_H)
    ctx.strokeStyle = 'rgba(10,26,52,0.45)'
    ctx.lineWidth = 1.6
    ctx.stroke(fishPath('standard'))
    return out.toDataURL('image/png')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'saving') return
    setState('saving')
    setError('')
    const res = await saveFish(name, bake())
    if (res.ok) {
      setState('saved')
      setMine(releasedFish())
      sound.chime()
      pushToast({
        icon: 'aquarium',
        title: `${name} joined the tank`,
        body: 'Open the Aquarium to find it swimming.',
      })
    } else {
      setState('idle')
      setError(res.error)
    }
  }

  const spent = mine !== null

  return (
    <form className="fp" onSubmit={submit}>
      <div className="fp__tools">
        <div className="fp__swatches" role="radiogroup" aria-label="Colour">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className="fp__swatch"
              style={{ background: c }}
              data-on={!erasing && colour === c}
              role="radio"
              aria-checked={!erasing && colour === c}
              aria-label={c}
              onClick={() => {
                setColour(c)
                setErasing(false)
              }}
            />
          ))}
        </div>
        <div className="fp__sizes">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className="fp__size"
              data-on={size === s}
              aria-label={`Brush ${s}`}
              onClick={() => setSize(s)}
            >
              <i style={{ width: s / 1.6, height: s / 1.6 }} />
            </button>
          ))}
          <button
            type="button"
            className="game__btn"
            data-on={erasing}
            onClick={() => setErasing(!erasing)}
          >
            Eraser
          </button>
          <button type="button" className="game__btn" onClick={undo}>
            Undo
          </button>
          <button type="button" className="game__btn" onClick={clear}>
            Clear
          </button>
        </div>
      </div>

      <div className="fp__stage">
        <canvas
          ref={canvasRef}
          className="fp__canvas"
          data-spent={spent}
          onPointerDown={spent ? undefined : down}
          onPointerMove={spent ? undefined : move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>

      <p className="fp__hint">
        Paint inside the fish. Your strokes stop at the edge. The eye arrives when you let go.
      </p>

      <div className="fp__foot">
        <label className="fp__nameLabel" htmlFor="fp-name">
          Name
        </label>
        <input
          id="fp-name"
          className="aero-field fp__name"
          value={name}
          maxLength={24}
          onChange={(e) => {
            setName(e.target.value)
            setState('idle')
          }}
          placeholder="who is this fish?"
          required
        />
        <button
          className="aero-btn aero-btn--primary"
          disabled={!name.trim() || state === 'saving' || spent}
        >
          {state === 'saving' ? 'Releasing…' : 'Release'}
        </button>
      </div>

      {error ? <p className="fp__error">{error}</p> : null}
      {state === 'saved' ? (
        <p className="fp__ok">Swimming now. Open the Aquarium to see it.</p>
      ) : spent ? (
        <p className="fp__note">
          You already released “{mine!.name}”. One fish per visitor. A fish in the water stays
          as it is.
        </p>
      ) : (
        <p className="fp__note">One fish per visitor. Choose carefully. This one is final.</p>
      )}
    </form>
  )
}
