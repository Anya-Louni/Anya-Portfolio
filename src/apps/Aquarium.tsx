/**
 * Aquarium.
 *
 * Every fish — stock or visitor-drawn — is a 128x80 texture rendered in
 * vertical slices with a travelling sine offset, so the whole body swims
 * rather than sliding. Amplitude rises toward the tail, which is what sells it.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { FISH_H, FISH_W } from '../aquarium/silhouette'
import { STOCK, imageTexture, makeStockTexture } from '../aquarium/textures'
import { listFish } from '../lib/fish'
import { launch } from '../os/registry'

type Tex = HTMLCanvasElement | HTMLImageElement

interface Swimmer {
  tex: Tex
  name?: string
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  phase: number
  speed: number
  wanderT: number
  tx: number
  ty: number
  hunger: number
  depth: number
  turn: number
  /** false until the fish has been dropped into a canvas of known size */
  placed: boolean
}

interface Bubble { x: number; y: number; r: number; vy: number; wob: number }
interface Pellet { x: number; y: number; vy: number; life: number }

const SLICES = 14

export default function Aquarium() {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const swimmersRef = useRef<Swimmer[]>([])
  const [count, setCount] = useState({ drawn: 0, total: 0 })
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null)

  /* ---------------- load the visitors' fish ---------------- */
  const loadDrawn = useCallback(async () => {
    const rows = await listFish(40)
    const added: Swimmer[] = []
    for (const row of rows) {
      try {
        const img = await imageTexture(row.image)
        added.push(makeSwimmer(img, row.name))
      } catch {
        /* a corrupt drawing just doesn't join the tank */
      }
    }
    // keep stock fish, replace the drawn ones
    swimmersRef.current = [
      ...swimmersRef.current.filter((s) => !s.name),
      ...added,
    ]
    setCount({ drawn: added.length, total: swimmersRef.current.length })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /* Reduced motion slows the tank right down rather than freezing it — a
       still aquarium is a broken aquarium, not an accessible one. */
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rate = calm ? 0.3 : 1
    let complained = false
    let W = 0
    let H = 0
    let raf = 0
    let t = 0
    const bubbles: Bubble[] = []
    const pellets: Pellet[] = []
    const kelp: { x: number; h: number; w: number; sway: number; tint: string }[] = []
    const coral: { x: number; s: number; hue: string; kind: number }[] = []
    const motes: { x: number; y: number; r: number; vy: number }[] = []

    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    /* ---------------- setup ---------------- */
    function resize() {
      /* offsetWidth, not getBoundingClientRect: a window measured during its
         open animation is still scaled, and the rect reports the scaled size —
         the canvas ends up permanently 92% of its container. Transforms do not
         retrigger a ResizeObserver, so it never corrects itself. */
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const hadSize = W > 0
      W = Math.max(260, host!.offsetWidth)
      H = Math.max(180, host!.offsetHeight)
      if (hadSize) {
        // keep everyone inside the new glass
        for (const f of swimmersRef.current) {
          f.x = Math.min(Math.max(f.x, 40), W - 40)
          f.y = Math.min(Math.max(f.y, H * 0.12), H * 0.82)
        }
      }
      canvas!.width = Math.round(W * dpr)
      canvas!.height = Math.round(H * dpr)
      canvas!.style.width = `${W}px`
      canvas!.style.height = `${H}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function seedScenery() {
      const greens = ['#0f6b4a', '#12805a', '#0a5940', '#177d5e']
      for (let i = 0; i < 14; i++) {
        kelp.push({ x: rand(0.02, 0.98), h: rand(0.18, 0.62), w: rand(6, 18), sway: rand(0, 6.3), tint: greens[i % 4] })
      }
      const hues = ['#ff7a5c', '#ff9f2e', '#e256c0', '#8b5cf6', '#25c9c0', '#ffd23f']
      for (let i = 0; i < 9; i++) {
        coral.push({ x: rand(0.04, 0.96), s: rand(0.7, 1.5), hue: hues[i % hues.length], kind: i % 3 })
      }
      for (let i = 0; i < 40; i++) {
        motes.push({ x: rand(0, 1), y: rand(0, 1), r: rand(0.6, 1.9), vy: rand(0.02, 0.09) })
      }
    }

    /* ---------------- painting ---------------- */
    function paintWater() {
      const g = ctx!.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#6fd3ff')
      g.addColorStop(0.18, '#39a8f0')
      g.addColorStop(0.52, '#1f6fd0')
      g.addColorStop(0.82, '#12408f')
      g.addColorStop(1, '#0a2360')
      ctx!.fillStyle = g
      ctx!.fillRect(0, 0, W, H)

      const s = ctx!.createLinearGradient(0, 0, 0, H * 0.16)
      s.addColorStop(0, 'rgba(226,252,255,0.75)')
      s.addColorStop(1, 'rgba(226,252,255,0)')
      ctx!.fillStyle = s
      ctx!.fillRect(0, 0, W, H * 0.16)
    }

    function paintRays() {
      ctx!.save()
      ctx!.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 7; i++) {
        const base = ((i + 0.5) / 7) * W
        const drift = Math.sin(t * 0.00024 + i * 1.7) * W * 0.07
        const wide = W * 0.08 + Math.sin(t * 0.0004 + i) * W * 0.025
        const g = ctx!.createLinearGradient(0, 0, 0, H * 0.95)
        g.addColorStop(0, 'rgba(210,248,255,0.26)')
        g.addColorStop(1, 'rgba(210,248,255,0)')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.moveTo(base + drift - 12, -10)
        ctx!.lineTo(base + drift + 12, -10)
        ctx!.lineTo(base + drift + wide, H * 0.95)
        ctx!.lineTo(base + drift - wide, H * 0.95)
        ctx!.closePath()
        ctx!.fill()
      }
      ctx!.restore()
    }

    function paintSand() {
      const floor = H * 0.87
      const g = ctx!.createLinearGradient(0, floor - 30, 0, H)
      g.addColorStop(0, 'rgba(240,214,160,0)')
      g.addColorStop(0.35, 'rgba(233,205,150,0.75)')
      g.addColorStop(1, '#d9bd85')
      ctx!.fillStyle = g
      ctx!.beginPath()
      ctx!.moveTo(0, H)
      ctx!.lineTo(0, floor + 14)
      for (let x = 0; x <= W; x += 22) {
        ctx!.lineTo(x, floor + Math.sin(x * 0.013) * 8 + Math.cos(x * 0.031) * 4)
      }
      ctx!.lineTo(W, H)
      ctx!.closePath()
      ctx!.fill()

      ctx!.save()
      ctx!.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 12; i++) {
        const x = ((i / 12) * W + Math.sin(t * 0.0006 + i) * 40 + W) % W
        const y = floor + 20 + Math.cos(t * 0.0009 + i * 2) * 9
        ctx!.fillStyle = 'rgba(190,240,255,0.075)'
        ctx!.beginPath()
        ctx!.ellipse(x, y, 48, 9, 0, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.restore()
    }

    function paintCoral() {
      const floor = H * 0.9
      for (const c of coral) {
        const x = c.x * W
        const s = c.s * Math.min(1.4, H / 300)
        ctx!.save()
        ctx!.translate(x, floor)
        ctx!.scale(s, s)
        ctx!.fillStyle = c.hue
        ctx!.globalAlpha = 0.92
        if (c.kind === 0) {
          // branching
          for (let b = -2; b <= 2; b++) {
            ctx!.save()
            ctx!.rotate(b * 0.26)
            ctx!.beginPath()
            ctx!.roundRect(-4, -46, 8, 46, 4)
            ctx!.fill()
            ctx!.restore()
          }
        } else if (c.kind === 1) {
          // brain
          ctx!.beginPath()
          ctx!.ellipse(0, -16, 24, 17, 0, Math.PI, 0)
          ctx!.fill()
          ctx!.strokeStyle = 'rgba(255,255,255,0.35)'
          ctx!.lineWidth = 2
          for (let l = -14; l <= 14; l += 7) {
            ctx!.beginPath()
            ctx!.arc(l * 0.5, -14, 9 - Math.abs(l) * 0.25, Math.PI, 0)
            ctx!.stroke()
          }
        } else {
          // anemone
          for (let a = 0; a < 12; a++) {
            const ang = -Math.PI / 2 + (a - 5.5) * 0.19
            const wig = Math.sin(t * 0.002 + a) * 3
            ctx!.beginPath()
            ctx!.moveTo(0, 0)
            ctx!.quadraticCurveTo(Math.cos(ang) * 16, -22 + wig, Math.cos(ang) * 26, -36 + wig)
            ctx!.lineWidth = 4
            ctx!.strokeStyle = c.hue
            ctx!.lineCap = 'round'
            ctx!.stroke()
          }
        }
        ctx!.restore()
      }
      ctx!.globalAlpha = 1
    }

    function paintKelp() {
      const floor = H * 0.9
      for (const k of kelp) {
        const x = k.x * W
        const h = k.h * H
        const sway = Math.sin(t * 0.0008 + k.sway) * 20
        ctx!.beginPath()
        ctx!.moveTo(x - k.w / 2, floor)
        ctx!.quadraticCurveTo(x - k.w / 2 + sway * 0.6, floor - h * 0.55, x + sway, floor - h)
        ctx!.quadraticCurveTo(x + k.w / 2 + sway * 0.6, floor - h * 0.55, x + k.w / 2, floor)
        ctx!.closePath()
        ctx!.fillStyle = k.tint
        ctx!.globalAlpha = 0.88
        ctx!.fill()
        ctx!.globalAlpha = 1
      }
    }

    /** the swim: vertical slices, sine offset growing toward the tail */
    function paintFish(f: Swimmer) {
      const dir = f.vx >= 0 ? 1 : -1
      const w = FISH_W * f.scale
      const h = FISH_H * f.scale
      const sliceW = FISH_W / SLICES
      const amp = Math.min(7, 2.4 + f.scale * 4)

      ctx!.save()
      ctx!.translate(f.x, f.y)
      ctx!.rotate(Math.max(-0.32, Math.min(0.32, f.vy * 0.2)) * dir + f.turn)
      ctx!.scale(dir, 1)
      ctx!.globalAlpha = f.depth
      ctx!.translate(-w / 2, -h / 2)

      for (let i = 0; i < SLICES; i++) {
        // tail is at low x in the texture, so weight the wave that way
        const k = 1 - i / (SLICES - 1)
        const off = Math.sin(f.phase - i * 0.55) * amp * k * k
        ctx!.drawImage(
          f.tex,
          i * sliceW,
          0,
          sliceW + 0.6,
          FISH_H,
          i * sliceW * f.scale,
          off,
          sliceW * f.scale + 0.6,
          h,
        )
      }
      ctx!.restore()
      ctx!.globalAlpha = 1
    }

    function paintBubble(b: Bubble) {
      ctx!.beginPath()
      ctx!.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx!.strokeStyle = 'rgba(226,250,255,0.7)'
      ctx!.lineWidth = 1
      ctx!.fillStyle = 'rgba(190,232,255,0.2)'
      ctx!.fill()
      ctx!.stroke()
      ctx!.beginPath()
      ctx!.arc(b.x - b.r * 0.32, b.y - b.r * 0.34, Math.max(0.6, b.r * 0.27), 0, Math.PI * 2)
      ctx!.fillStyle = 'rgba(255,255,255,0.9)'
      ctx!.fill()
    }

    function paintGlass() {
      const v = ctx!.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.22, W / 2, H * 0.5, Math.max(W, H) * 0.75)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(2,18,58,0.5)')
      ctx!.fillStyle = v
      ctx!.fillRect(0, 0, W, H)
      const sheen = ctx!.createLinearGradient(0, 0, W * 0.55, H)
      sheen.addColorStop(0, 'rgba(255,255,255,0.13)')
      sheen.addColorStop(0.24, 'rgba(255,255,255,0.03)')
      sheen.addColorStop(0.5, 'rgba(255,255,255,0)')
      ctx!.fillStyle = sheen
      ctx!.fillRect(0, 0, W, H)
    }

    /* ---------------- simulation ---------------- */
    /** scatter anything that has just joined the tank */
    function placeNew() {
      for (const f of swimmersRef.current) {
        if (f.placed) continue
        f.x = rand(0.12, 0.88) * W
        f.y = rand(0.18, 0.78) * H
        f.tx = rand(0.08, 0.92)
        f.ty = rand(0.12, 0.8)
        f.placed = true
      }
    }

    function step(dt: number) {
      const fish = swimmersRef.current
      for (const f of fish) {
        f.wanderT -= dt
        if (f.wanderT <= 0) {
          f.wanderT = rand(1600, 4200)
          f.tx = rand(0.06, 0.94)
          f.ty = rand(0.1, 0.8)
        }

        // food wins over wandering
        let targetX = f.tx * W
        let targetY = f.ty * H
        let urgency = 1
        if (pellets.length) {
          let best: Pellet | null = null
          let bd = 1e9
          for (const p of pellets) {
            const d = (p.x - f.x) ** 2 + (p.y - f.y) ** 2
            if (d < bd) {
              bd = d
              best = p
            }
          }
          if (best && bd < 320 * 320) {
            targetX = best.x
            targetY = best.y
            urgency = 3.2
            if (bd < 18 * 18) {
              best.life = 0
              f.hunger = 0
            }
          }
        }

        const ax = (targetX - f.x) * 0.00030 * urgency
        const ay = (targetY - f.y) * 0.00038 * urgency
        f.vx += ax * dt
        f.vy += ay * dt
        const sp = Math.hypot(f.vx, f.vy)
        const max = f.speed * urgency
        if (sp > max) {
          f.vx = (f.vx / sp) * max
          f.vy = (f.vy / sp) * max
        }
        f.x += f.vx * dt * 0.06
        f.y += f.vy * dt * 0.06
        f.phase += dt * 0.009 * (0.6 + sp * 1.4)
        f.turn += (0 - f.turn) * 0.02

        const padX = FISH_W * f.scale * 0.6
        const padY = FISH_H * f.scale * 0.6
        if (f.x < padX) { f.x = padX; f.vx = Math.abs(f.vx); f.turn = 0.2 }
        if (f.x > W - padX) { f.x = W - padX; f.vx = -Math.abs(f.vx); f.turn = -0.2 }
        if (f.y < H * 0.1 + padY) { f.y = H * 0.1 + padY; f.vy = Math.abs(f.vy) }
        if (f.y > H * 0.84 - padY) { f.y = H * 0.84 - padY; f.vy = -Math.abs(f.vy) }
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]
        b.y -= b.vy * dt * 0.07
        b.wob += dt * 0.004
        b.x += Math.sin(b.wob) * 0.4
        if (b.y < H * 0.05) bubbles.splice(i, 1)
      }
      if (bubbles.length < 40 && Math.random() < 0.07) {
        const vent = [0.12, 0.34, 0.62, 0.88][Math.floor(Math.random() * 4)]
        bubbles.push({ x: vent * W + rand(-10, 10), y: H * 0.88, r: rand(1.6, 4.6), vy: rand(0.4, 0.9), wob: rand(0, 6) })
      }

      for (let i = pellets.length - 1; i >= 0; i--) {
        const p = pellets[i]
        p.y += p.vy * dt * 0.05
        p.life -= dt / 9000
        if (p.life <= 0 || p.y > H * 0.86) pellets.splice(i, 1)
      }

      for (const m of motes) {
        m.y -= m.vy * dt * 0.001
        if (m.y < 0) m.y = 1
      }
    }

    function frame(now: number) {
      const dt = Math.min(48, now - t || 16) * rate
      t = now
      placeNew()
      paintWater()
      paintRays()
      paintSand()
      paintCoral()
      paintKelp()

      // drifting specks, for depth
      ctx!.fillStyle = 'rgba(226,250,255,0.4)'
      for (const m of motes) {
        ctx!.beginPath()
        ctx!.arc(m.x * W, m.y * H, m.r, 0, Math.PI * 2)
        ctx!.fill()
      }

      for (const b of bubbles) paintBubble(b)

      // far fish first
      const fish = swimmersRef.current.slice().sort((a, b) => a.depth - b.depth)
      for (const f of fish) paintFish(f)

      for (const p of pellets) {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, 2.6, 0, Math.PI * 2)
        ctx!.fillStyle = '#e8a33c'
        ctx!.fill()
      }

      paintGlass()
      step(dt)
      raf = requestAnimationFrame(frame)
    }

    /** One bad frame must not stop the tank forever. */
    function safeFrame(now: number) {
      try {
        frame(now)
      } catch (err) {
        if (!complained) {
          complained = true
          console.error('aquarium frame failed', err)
        }
        raf = requestAnimationFrame(safeFrame)
      }
    }

    /* ---------------- boot ---------------- */
    const ro = new ResizeObserver(() => {
      resize()
    })
    ro.observe(host)
    resize()
    seedScenery()

    if (!swimmersRef.current.length) {
      swimmersRef.current = STOCK.map((p) => makeSwimmer(makeStockTexture(p)))
    }

    safeFrame(performance.now())

    /* If the loop was starved while the window was hidden, restart it. */
    const onVisible = () => {
      if (document.hidden) return
      cancelAnimationFrame(raf)
      t = 0
      raf = requestAnimationFrame(safeFrame)
    }
    document.addEventListener('visibilitychange', onVisible)

    const onDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      for (let i = 0; i < 5; i++) {
        pellets.push({ x: x + rand(-14, 14), y: y + rand(-8, 8), vy: rand(0.25, 0.6), life: 1 })
      }
      for (let i = 0; i < 8; i++) {
        bubbles.push({ x: x + rand(-12, 12), y: y + rand(-6, 6), r: rand(1.4, 4), vy: rand(0.4, 1), wob: rand(0, 6) })
      }
    }
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      let found: Swimmer | null = null
      for (const f of swimmersRef.current) {
        if (!f.name) continue
        const w = FISH_W * f.scale * 0.5
        const h = FISH_H * f.scale * 0.5
        if (Math.abs(mx - f.x) < w && Math.abs(my - f.y) < h) found = f
      }
      setHover(found ? { name: found.name!, x: found.x, y: found.y - FISH_H * found.scale * 0.55 } : null)
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', () => setHover(null))

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
    }
  }, [])

  useEffect(() => {
    void loadDrawn()
  }, [loadDrawn])

  return (
    <div className="aq" ref={hostRef}>
      <canvas ref={canvasRef} className="aq__canvas" />
      <div className="aq__frame" aria-hidden />

      {hover ? (
        <span className="aq__tag" style={{ left: hover.x, top: hover.y }}>
          {hover.name}
        </span>
      ) : null}

      <div className="aq__hud">
        <button className="aq__add" onClick={() => launch('fishpainter')}>
          Draw a fish
        </button>
        <span className="aq__count">
          {count.drawn} drawn · {count.total} swimming
        </span>
        <button className="aq__refresh" onClick={() => void loadDrawn()} title="Check for new fish">
          Refresh
        </button>
      </div>

      <p className="aq__hint">tap the glass to feed them</p>
    </div>
  )
}

function makeSwimmer(tex: Tex, name?: string): Swimmer {
  const scale = name ? 0.42 + Math.random() * 0.2 : 0.3 + Math.random() * 0.34
  return {
    tex,
    name,
    x: 0,
    y: 0,
    vx: Math.random() < 0.5 ? -1 : 1,
    vy: 0,
    scale,
    phase: Math.random() * 6.28,
    speed: (0.4 + Math.random() * 0.5) * (0.55 / scale),
    wanderT: Math.random() * 2000,
    tx: 0.1 + Math.random() * 0.8,
    ty: 0.15 + Math.random() * 0.6,
    hunger: 0,
    depth: 0.7 + Math.random() * 0.3,
    turn: 0,
    placed: false,
  }
}
