import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * "Edit colors". Paint's colour dialog, with the wheel.
 * An HSV wheel (hue around, saturation outward) plus a value slider,
 * a live preview and a hex field.
 */

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`

function hexToHsv(value: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value.trim())
  if (!m) return null
  const r = parseInt(m[1], 16) / 255
  const g = parseInt(m[2], 16) / 255
  const b = parseInt(m[3], 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  h = (h * 60 + 360) % 360
  return { h, s: max ? d / max : 0, v: max }
}

const SIZE = 200

export function ColorPicker({
  initial,
  onPick,
  onClose,
}: {
  initial: string
  onPick: (hex: string) => void
  onClose: () => void
}) {
  const start = hexToHsv(initial) ?? { h: 210, s: 0.8, v: 0.9 }
  const [h, setH] = useState(start.h)
  const [s, setS] = useState(start.s)
  const [v, setV] = useState(start.v)
  const [text, setText] = useState(initial)
  const wheelRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)

  const [r, g, b] = hsvToRgb(h, s, v)
  const current = hex(r, g, b)

  useEffect(() => setText(current), [current])

  /* The wheel is always drawn at full brightness, so it stays a usable
     colour picker even when the current colour is black. Brightness is
     shown by dimming the whole disc, not by painting it dark. */
  useEffect(() => {
    const c = wheelRef.current
    if (!c) return
    c.width = SIZE
    c.height = SIZE
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(SIZE, SIZE)
    const rad = SIZE / 2
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - rad
        const dy = y - rad
        const dist = Math.hypot(dx, dy)
        const i = (y * SIZE + x) * 4
        if (dist > rad) {
          img.data[i + 3] = 0
          continue
        }
        const ang = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
        const [rr, gg, bb] = hsvToRgb(ang, Math.min(1, dist / rad), 1)
        img.data[i] = rr
        img.data[i + 1] = gg
        img.data[i + 2] = bb
        // feather the rim so it does not alias into a cog
        img.data[i + 3] = dist > rad - 1.5 ? Math.round((rad - dist) * 170) : 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [])

  const pickAt = useCallback((e: React.PointerEvent) => {
    const c = wheelRef.current!
    const rect = c.getBoundingClientRect()
    const rad = rect.width / 2
    const dx = e.clientX - rect.left - rad
    const dy = e.clientY - rect.top - rad
    const dist = Math.hypot(dx, dy)
    setH(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360)
    setS(Math.min(1, dist / rad))
  }, [])

  const markX = SIZE / 2 + Math.cos((h * Math.PI) / 180) * s * (SIZE / 2)
  const markY = SIZE / 2 + Math.sin((h * Math.PI) / 180) * s * (SIZE / 2)

  return (
    <div className="cp2" role="dialog" aria-label="Edit colours">
      <div className="cp2__panel">
        <div className="cp2__head">Edit colours</div>

        <div className="cp2__body">
          <div className="cp2__wheelWrap">
            <canvas
              ref={wheelRef}
              className="cp2__wheel"
              onPointerDown={(e) => {
                dragging.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                pickAt(e)
              }}
              onPointerMove={(e) => dragging.current && pickAt(e)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
            />
            {/* capped: at full dark the disc must still read as a colour wheel */}
            <span className="cp2__dim" style={{ opacity: (1 - v) * 0.62 }} />
            <span
              className="cp2__mark"
              style={{ left: `${(markX / SIZE) * 100}%`, top: `${(markY / SIZE) * 100}%` }}
            />
          </div>

          <div className="cp2__side">
            <label className="cp2__val">
              <span>Brightness</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={v}
                onChange={(e) => setV(Number(e.target.value))}
                style={{ background: `linear-gradient(90deg, #000, ${hex(...hsvToRgb(h, s, 1) as [number, number, number])})` }}
              />
            </label>

            <div className="cp2__preview" style={{ background: current }} />

            <label className="cp2__hex">
              <span>Hex</span>
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  const parsed = hexToHsv(e.target.value)
                  if (parsed) {
                    setH(parsed.h)
                    setS(parsed.s)
                    setV(parsed.v)
                  }
                }}
                spellCheck={false}
              />
            </label>

            <dl className="cp2__rgb">
              <div><dt>R</dt><dd>{r}</dd></div>
              <div><dt>G</dt><dd>{g}</dd></div>
              <div><dt>B</dt><dd>{b}</dd></div>
            </dl>
          </div>
        </div>

        <div className="cp2__foot">
          <button className="aero-btn" onClick={onClose}>Cancel</button>
          <button className="aero-btn aero-btn--primary" onClick={() => { onPick(current); onClose() }}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
