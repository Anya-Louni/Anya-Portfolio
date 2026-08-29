/**
 * The flourish that grows across the iPod screen while a song plays.
 *
 * The vocabulary is the one from the reference: long curling stems that spiral
 * in on themselves, rosettes of concentric rings, daisies, leaves hanging off
 * the stems, and scattered dots. It is drawn rather than illustrated, so it is
 * different every time and costs nothing to ship.
 *
 * Two colours only, and neither of them pink: a pale Aero blue on the screen's
 * own dark ground. Monochrome is what keeps this readable at 230 pixels wide,
 * and it is the half of the reference that survives the shrink — at this size
 * the colour would only be mud.
 *
 * The stems draw themselves in over the first bars rather than appearing all
 * at once, because a flourish that arrives finished is wallpaper and one that
 * arrives growing is a visualiser.
 */
import { useEffect, useRef } from 'react'

interface Stem {
  pts: { x: number; y: number }[]
  born: number
  /** how long the stem takes to finish drawing, in seconds */
  span: number
  width: number
  leaves: { at: number; side: number; size: number }[]
  bloom: { kind: 'rose' | 'daisy'; size: number; spin: number } | null
}

interface Dot { x: number; y: number; r: number; phase: number }

/** A stem: a long sweep that tightens into a spiral at its end. */
function growStem(rand: () => number, w: number, h: number): Stem {
  const pts: { x: number; y: number }[] = []
  // start off one edge so the stem appears to come from outside the screen
  const edge = Math.floor(rand() * 4)
  let x = edge === 0 ? -6 : edge === 1 ? w + 6 : rand() * w
  let y = edge === 2 ? -6 : edge === 3 ? h + 6 : rand() * h
  let a = Math.atan2(h / 2 - y, w / 2 - x) + (rand() - 0.5) * 1.1

  const steps = 90 + Math.floor(rand() * 70)
  const curl = (0.006 + rand() * 0.012) * (rand() < 0.5 ? 1 : -1)
  let step = 2.4 + rand() * 1.6
  let bend = curl

  for (let i = 0; i < steps; i++) {
    pts.push({ x, y })
    // the curl tightens as the stem runs on, which is what makes the spiral
    bend *= 1.028
    a += bend
    step *= 0.988
    x += Math.cos(a) * step
    y += Math.sin(a) * step
  }

  const leaves: Stem['leaves'] = []
  const count = 1 + Math.floor(rand() * 3)
  for (let i = 0; i < count; i++) {
    leaves.push({
      at: 0.18 + rand() * 0.5,
      side: rand() < 0.5 ? 1 : -1,
      size: 5 + rand() * 5,
    })
  }

  return {
    pts,
    born: 0,
    span: 2.4 + rand() * 3.2,
    width: 0.9 + rand() * 1.8,
    leaves,
    bloom: rand() < 0.55
      ? { kind: rand() < 0.5 ? 'rose' : 'daisy', size: 5 + rand() * 7, spin: (rand() - 0.5) * 0.5 }
      : null,
  }
}

export function Flourish({
  playing,
  /** 0..1 loudness, when the source is something we are allowed to measure */
  level = 0,
  className = '',
}: {
  playing: boolean
  level?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const playingRef = useRef(playing)
  const levelRef = useRef(level)
  playingRef.current = playing
  levelRef.current = level

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0
    let last = performance.now()
    let stems: Stem[] = []
    let dots: Dot[] = []
    let w = 0
    let h = 0
    let seed = Math.floor(Math.random() * 1e9)
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }

    const reseed = () => {
      stems = []
      dots = []
      for (let i = 0; i < 9; i++) {
        const s = growStem(rand, w, h)
        s.born = i * 0.55
        stems.push(s)
      }
      for (let i = 0; i < 26; i++) {
        dots.push({ x: rand() * w, y: rand() * h, r: 0.6 + rand() * 2.2, phase: rand() * 6.3 })
      }
    }

    const rose = (cx: number, cy: number, size: number, turn: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(turn)
      // concentric rings with a gap, so they read as a spiral rather than a target
      for (let i = 3; i >= 1; i--) {
        ctx.beginPath()
        ctx.arc(0, 0, (size * i) / 3, 0.6, Math.PI * 2)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const daisy = (cx: number, cy: number, size: number, turn: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(turn)
      const petals = 8
      for (let i = 0; i < petals; i++) {
        ctx.save()
        ctx.rotate((i / petals) * Math.PI * 2)
        ctx.beginPath()
        ctx.ellipse(size * 0.72, 0, size * 0.6, size * 0.24, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      /* clientWidth, never written back: the canvas is sized by CSS, and
         setting a pixel width here would grow its container. */
      const cw = Math.max(40, canvas.clientWidth)
      const ch = Math.max(40, canvas.clientHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr)
        canvas.height = Math.round(ch * dpr)
        w = cw
        h = ch
        reseed()
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      if (!playingRef.current) {
        t = 0
        return
      }
      t += dt

      // the whole thing breathes with the music, or on its own if it cannot hear it
      const pulse = 1 + levelRef.current * 0.5 + Math.sin(t * 1.4) * 0.03

      for (const s of stems) {
        const age = t - s.born
        if (age <= 0) continue
        const done = Math.min(1, age / s.span)
        // ease out, so a stem slows as it finishes rather than stopping dead
        const eased = 1 - Math.pow(1 - done, 2.2)
        const upto = Math.max(2, Math.floor(eased * s.pts.length))

        ctx.strokeStyle = 'rgba(178, 222, 255, 0.88)'
        ctx.fillStyle = 'rgba(178, 222, 255, 0.88)'
        ctx.lineWidth = s.width * pulse
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(s.pts[0].x, s.pts[0].y)
        for (let i = 1; i < upto; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y)
        ctx.stroke()

        // leaves, once the stem has grown past where they sit
        ctx.lineWidth = Math.max(0.7, s.width * 0.7)
        for (const leaf of s.leaves) {
          const at = Math.floor(leaf.at * s.pts.length)
          if (at >= upto - 1 || at < 1) continue
          const p = s.pts[at]
          const q = s.pts[at - 1]
          const a = Math.atan2(p.y - q.y, p.x - q.x) + leaf.side * 1.05
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.quadraticCurveTo(
            p.x + Math.cos(a - 0.5) * leaf.size,
            p.y + Math.sin(a - 0.5) * leaf.size,
            p.x + Math.cos(a) * leaf.size * 1.6,
            p.y + Math.sin(a) * leaf.size * 1.6,
          )
          ctx.quadraticCurveTo(
            p.x + Math.cos(a + 0.5) * leaf.size,
            p.y + Math.sin(a + 0.5) * leaf.size,
            p.x,
            p.y,
          )
          ctx.stroke()
        }

        // and the bloom at the tip, which opens as the stem arrives
        if (s.bloom && done > 0.55) {
          const open = Math.min(1, (done - 0.55) / 0.45)
          const tip = s.pts[Math.min(s.pts.length - 1, upto - 1)]
          ctx.lineWidth = Math.max(0.8, s.width * 0.8)
          const size = s.bloom.size * open * pulse
          if (s.bloom.kind === 'rose') rose(tip.x, tip.y, size, t * s.bloom.spin)
          else daisy(tip.x, tip.y, size, t * s.bloom.spin)
        }
      }

      // scattered dots, coming up slowly behind everything
      for (const d of dots) {
        const a = 0.14 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.9 + d.phase))
        ctx.fillStyle = `rgba(150, 206, 245, ${a * Math.min(1, t / 2)})`
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2)
        ctx.fill()
      }

      /* Once everything has drawn itself, hold the finished arrangement for a
         while before starting a new one. Clearing it promptly wasted the part
         worth looking at. */
      const longest = stems.reduce((m, s) => Math.max(m, s.born + s.span), 0)
      if (t > longest + 16) {
        t = 0
        reseed()
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className={`flourish ${className}`} aria-hidden />
}
