import { useEffect, useRef } from 'react'
import { SUIT_GLYPH, SUITS, isRed, rankName } from './deck'

/**
 * The bouncing-cards win animation. Cards launch from the foundations, fall
 * under gravity and bounce off the bottom edge, smearing across the board —
 * exactly the thing everyone remembers about winning at Solitaire.
 */
export function WinCascade({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0
    let raf = 0
    const CW = 71
    const CH = 96

    type Flyer = { x: number; y: number; vx: number; vy: number; suit: number; rank: number }
    const flyers: Flyer[] = []
    let spawned = 0
    let last = 0

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = host!.offsetWidth
      H = host!.offsetHeight
      canvas!.width = Math.round(W * dpr)
      canvas!.height = Math.round(H * dpr)
      canvas!.style.width = `${W}px`
      canvas!.style.height = `${H}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function drawCard(f: Flyer) {
      const x = Math.round(f.x)
      const y = Math.round(f.y)
      ctx!.fillStyle = '#ffffff'
      ctx!.strokeStyle = '#8a8f99'
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.roundRect(x, y, CW, CH, 5)
      ctx!.fill()
      ctx!.stroke()
      const suit = SUITS[f.suit]
      ctx!.fillStyle = isRed(suit) ? '#c62828' : '#16181d'
      ctx!.font = '600 15px "Hanken Grotesk Variable", system-ui, sans-serif'
      ctx!.textBaseline = 'top'
      ctx!.fillText(rankName(f.rank), x + 5, y + 4)
      ctx!.font = '14px system-ui, sans-serif'
      ctx!.fillText(SUIT_GLYPH[suit], x + 5, y + 20)
      ctx!.font = '30px system-ui, sans-serif'
      ctx!.textAlign = 'center'
      ctx!.fillText(SUIT_GLYPH[suit], x + CW / 2, y + CH / 2 - 18)
      ctx!.textAlign = 'left'
    }

    function frame(now: number) {
      if (!last) last = now
      const dt = Math.min(40, now - last)
      last = now

      if (spawned < 52 && flyers.length < 52) {
        const i = spawned++
        flyers.push({
          x: W - 40 - (i % 4) * (CW + 12),
          y: 16,
          vx: (Math.random() * 2 + 1.6) * (Math.random() < 0.5 ? -1 : 1),
          vy: -Math.random() * 2,
          suit: i % 4,
          rank: 13 - Math.floor(i / 4),
        })
      }

      for (const f of flyers) {
        f.vy += 0.0016 * dt * 10
        f.x += f.vx * dt * 0.09
        f.y += f.vy * dt * 0.09
        if (f.y + CH > H) {
          f.y = H - CH
          f.vy = -f.vy * 0.72
          if (Math.abs(f.vy) < 1.2) f.vy = -6 - Math.random() * 3
        }
        drawCard(f)
      }

      // let them run off the sides, then stop
      if (flyers.every((f) => f.x < -CW * 2 || f.x > W + CW * 2) && spawned >= 52) {
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(size)
    ro.observe(host)
    size()
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="cascade" ref={hostRef}>
      <canvas ref={canvasRef} className="cascade__canvas" />
      <div className="cascade__panel">
        <p className="cascade__title">You win</p>
        <button className="aero-btn aero-btn--primary" onClick={onDone}>
          Deal again
        </button>
      </div>
    </div>
  )
}
