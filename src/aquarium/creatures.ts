/**
 * The things you can stock the tank with.
 *
 * Each species is a silhouette drawn into the same 128x80 box the fish use,
 * so the engine renders bought creatures exactly the way it renders a
 * visitor's drawing. None of them have eyes: the shapes carry it, and a pair
 * of cartoon eyes on everything pulled the whole tank toward clip art.
 *
 * The numbers follow the usual idle-game shape. Each species earns a fixed
 * trickle, and each one you buy makes the next of that species dearer, so
 * there is always a choice between more of something cheap and one of
 * something better.
 */
import { FISH_H, FISH_W, fishPath, type Shape } from './silhouette'

export interface Species {
  id: string
  name: string
  blurb: string
  /** price of the first one; each after costs 1.16x the last */
  base: number
  /** coins per second, each */
  rate: number
  /** how big it swims, in tank units */
  size: number
  /** how fast, relative to a fish */
  pace: number
  /** where in the water it likes to be: 0 is the sand, 1 is the surface */
  band: [number, number]
  draw: (ctx: CanvasRenderingContext2D) => void
}

const shell = (ctx: CanvasRenderingContext2D, from: string, to: string) => {
  const g = ctx.createLinearGradient(0, 0, 0, FISH_H)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  return g
}

const outline = (ctx: CanvasRenderingContext2D, p: Path2D, w = 1.6) => {
  ctx.strokeStyle = 'rgba(10,26,52,0.5)'
  ctx.lineWidth = w
  ctx.stroke(p)
}

/** A plain fish in one of the stock silhouettes, in a given colour. */
function drawFish(shape: Shape, body: [string, string], mark: string, style: 'stripes' | 'spots' | 'plain') {
  return (ctx: CanvasRenderingContext2D) => {
    const path = fishPath(shape)
    ctx.save()
    ctx.clip(path)
    ctx.fillStyle = shell(ctx, body[0], body[1])
    ctx.fillRect(0, 0, FISH_W, FISH_H)

    ctx.globalAlpha = 0.7
    ctx.fillStyle = mark
    if (style === 'stripes') {
      for (let x = 28; x < FISH_W; x += 22) {
        ctx.save(); ctx.translate(x, 0); ctx.rotate(0.16)
        ctx.fillRect(0, -20, 9, FISH_H + 40)
        ctx.restore()
      }
    } else if (style === 'spots') {
      for (let i = 0; i < 20; i++) {
        ctx.beginPath()
        ctx.arc(22 + ((i * 41) % (FISH_W - 30)), 10 + ((i * 59) % (FISH_H - 18)), 3.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    const belly = ctx.createLinearGradient(0, FISH_H * 0.45, 0, FISH_H)
    belly.addColorStop(0, 'rgba(255,255,255,0)')
    belly.addColorStop(1, 'rgba(255,255,255,0.45)')
    ctx.fillStyle = belly
    ctx.fillRect(0, 0, FISH_W, FISH_H)
    ctx.restore()
    outline(ctx, path)
  }
}

/* ---- the ones that are not fish, and so need their own silhouettes ---- */

function drawJelly(ctx: CanvasRenderingContext2D) {
  const bell = new Path2D()
  bell.moveTo(20, 44)
  bell.bezierCurveTo(20, 8, 108, 8, 108, 44)
  bell.bezierCurveTo(92, 36, 84, 52, 64, 44)
  bell.bezierCurveTo(44, 52, 36, 36, 20, 44)
  bell.closePath()

  ctx.save()
  ctx.globalAlpha = 0.88
  ctx.fillStyle = shell(ctx, '#ffd7f4', '#b06ce0')
  ctx.fill(bell)
  ctx.restore()
  outline(ctx, bell, 1.4)

  // a dome of light across the top of the bell
  ctx.save()
  ctx.clip(bell)
  const gloss = ctx.createRadialGradient(58, 18, 2, 58, 24, 44)
  gloss.addColorStop(0, 'rgba(255,255,255,0.85)')
  gloss.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gloss
  ctx.fillRect(0, 0, FISH_W, FISH_H)
  ctx.restore()

  ctx.strokeStyle = 'rgba(196,124,224,0.85)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let i = 0; i < 7; i++) {
    const x = 30 + i * 11
    ctx.beginPath()
    ctx.moveTo(x, 42)
    ctx.quadraticCurveTo(x + (i % 2 ? 7 : -7), 60, x + (i % 2 ? -4 : 4), 76)
    ctx.stroke()
  }
}

function drawSeahorse(ctx: CanvasRenderingContext2D) {
  const p = new Path2D()
  p.moveTo(86, 12)
  p.bezierCurveTo(104, 16, 104, 38, 84, 40)
  p.bezierCurveTo(66, 42, 58, 52, 58, 62)
  p.bezierCurveTo(58, 74, 44, 78, 38, 68)
  p.bezierCurveTo(34, 60, 46, 58, 46, 50)
  p.bezierCurveTo(46, 30, 62, 8, 86, 12)
  p.closePath()
  ctx.fillStyle = shell(ctx, '#ffe9a8', '#e0902a')
  ctx.fill(p)
  outline(ctx, p, 1.5)

  // the crest, and the ridges down the back
  const crest = new Path2D()
  crest.moveTo(84, 12)
  crest.quadraticCurveTo(92, 2, 100, 10)
  crest.quadraticCurveTo(92, 12, 84, 18)
  ctx.fillStyle = '#f6c465'
  ctx.fill(crest)
  ctx.strokeStyle = 'rgba(120,70,10,0.4)'
  ctx.lineWidth = 1.6
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(70 - i * 5, 26 + i * 8)
    ctx.lineTo(62 - i * 5, 30 + i * 8)
    ctx.stroke()
  }
}

function drawRay(ctx: CanvasRenderingContext2D) {
  const p = new Path2D()
  p.moveTo(110, 40)
  p.bezierCurveTo(96, 6, 40, 2, 22, 26)
  p.bezierCurveTo(10, 40, 10, 40, 22, 54)
  p.bezierCurveTo(40, 78, 96, 74, 110, 40)
  p.closePath()
  ctx.fillStyle = shell(ctx, '#a9c8e8', '#2f5c8f')
  ctx.fill(p)
  outline(ctx, p)

  ctx.save()
  ctx.clip(p)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#e8f4ff'
  for (let i = 0; i < 16; i++) {
    ctx.beginPath()
    ctx.arc(30 + ((i * 43) % 74), 16 + ((i * 31) % 48), 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  ctx.strokeStyle = '#2f5c8f'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(110, 40)
  ctx.quadraticCurveTo(124, 40, 126, 30)
  ctx.stroke()
}

function drawTurtle(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#7fae6a'
  for (const [x, y, w, h, r] of [[30, 20, 20, 12, -0.5], [30, 60, 20, 12, 0.5], [92, 22, 18, 11, 0.4], [92, 58, 18, 11, -0.4]] as const) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r)
    ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  const head = new Path2D()
  head.ellipse(112, 40, 14, 11, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#8cbc75'
  ctx.fill(head)
  outline(ctx, head, 1.3)

  const sh = new Path2D()
  sh.ellipse(62, 40, 44, 32, 0, 0, Math.PI * 2)
  ctx.fillStyle = shell(ctx, '#a3703c', '#5d3d1c')
  ctx.fill(sh)
  outline(ctx, sh)

  ctx.save()
  ctx.clip(sh)
  ctx.strokeStyle = 'rgba(255,236,196,0.55)'
  ctx.lineWidth = 2.4
  for (const [cx, cy, r] of [[62, 40, 14], [62, 40, 26]] as const) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(62 + Math.cos(a) * 12, 40 + Math.sin(a) * 12)
    ctx.lineTo(62 + Math.cos(a) * 34, 40 + Math.sin(a) * 34)
    ctx.stroke()
  }
  ctx.restore()
}

function drawOctopus(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#b8478f'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    const x = 26 + i * 13
    ctx.beginPath()
    ctx.moveTo(x, 46)
    ctx.quadraticCurveTo(x - 12 + i * 3, 64, x + (i % 2 ? 10 : -10), 74)
    ctx.stroke()
  }
  const head = new Path2D()
  head.moveTo(22, 44)
  head.bezierCurveTo(22, 4, 106, 4, 106, 44)
  head.bezierCurveTo(94, 56, 34, 56, 22, 44)
  head.closePath()
  ctx.fillStyle = shell(ctx, '#ffb0e0', '#a63080')
  ctx.fill(head)
  outline(ctx, head)

  ctx.save()
  ctx.clip(head)
  const g = ctx.createRadialGradient(52, 18, 2, 56, 22, 42)
  g.addColorStop(0, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, FISH_W, FISH_H)
  ctx.restore()
}

function drawWhale(ctx: CanvasRenderingContext2D) {
  const p = new Path2D()
  p.moveTo(18, 42)
  p.bezierCurveTo(24, 14, 74, 8, 104, 26)
  p.bezierCurveTo(118, 34, 118, 46, 104, 56)
  p.bezierCurveTo(74, 74, 24, 68, 18, 42)
  p.closePath()
  ctx.fillStyle = shell(ctx, '#8fb8dd', '#28527f')
  ctx.fill(p)

  const tail = new Path2D()
  tail.moveTo(20, 42)
  tail.quadraticCurveTo(4, 20, 2, 26)
  tail.quadraticCurveTo(10, 42, 2, 58)
  tail.quadraticCurveTo(4, 64, 20, 42)
  tail.closePath()
  ctx.fill(tail)
  outline(ctx, p)
  outline(ctx, tail, 1.3)

  ctx.save()
  ctx.clip(p)
  const belly = ctx.createLinearGradient(0, 42, 0, FISH_H)
  belly.addColorStop(0, 'rgba(255,255,255,0)')
  belly.addColorStop(1, 'rgba(255,255,255,0.72)')
  ctx.fillStyle = belly
  ctx.fillRect(0, 0, FISH_W, FISH_H)
  ctx.strokeStyle = 'rgba(20,50,90,0.28)'
  ctx.lineWidth = 2
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo(52 + i * 9, 52)
    ctx.lineTo(58 + i * 9, 70)
    ctx.stroke()
  }
  ctx.restore()
}

export const SPECIES: Species[] = [
  {
    id: 'guppy', name: 'Guppy', blurb: 'Cheap and busy',
    base: 12, rate: 0.12, size: 2.2, pace: 1.15, band: [0.25, 0.85],
    draw: drawFish('standard', ['#9ef7ff', '#0a76b8'], '#f6feff', 'stripes'),
  },
  {
    id: 'clown', name: 'Clownfish', blurb: 'Keeps to the middle',
    base: 70, rate: 0.55, size: 2.6, pace: 1.0, band: [0.2, 0.7],
    draw: drawFish('round', ['#ffd97a', '#e2670c'], '#3b1d05', 'stripes'),
  },
  {
    id: 'angel', name: 'Angelfish', blurb: 'Slow and showy',
    base: 340, rate: 2.2, size: 3.2, pace: 0.8, band: [0.3, 0.9],
    draw: drawFish('angel', ['#fff6c2', '#d99b06'], '#2b2410', 'spots'),
  },
  {
    id: 'jelly', name: 'Jellyfish', blurb: 'Drifts near the surface',
    base: 1500, rate: 8.5, size: 3.0, pace: 0.42, band: [0.55, 0.98],
    draw: drawJelly,
  },
  {
    id: 'seahorse', name: 'Seahorse', blurb: 'Hangs about the weed',
    base: 6800, rate: 34, size: 2.6, pace: 0.5, band: [0.05, 0.45],
    draw: drawSeahorse,
  },
  {
    id: 'ray', name: 'Ray', blurb: 'Cruises the floor',
    base: 30000, rate: 140, size: 4.4, pace: 0.75, band: [0.02, 0.35],
    draw: drawRay,
  },
  {
    id: 'turtle', name: 'Turtle', blurb: 'In no hurry whatsoever',
    base: 140000, rate: 600, size: 4.8, pace: 0.55, band: [0.15, 0.8],
    draw: drawTurtle,
  },
  {
    id: 'octopus', name: 'Octopus', blurb: 'Keeps low, thinks hard',
    base: 700000, rate: 2600, size: 4.2, pace: 0.6, band: [0.02, 0.4],
    draw: drawOctopus,
  },
  {
    id: 'whale', name: 'Whale', blurb: 'Owns the tank now',
    base: 4000000, rate: 12000, size: 9.5, pace: 0.45, band: [0.3, 0.9],
    draw: drawWhale,
  },
]

export const priceOf = (s: Species, owned: number) => Math.ceil(s.base * Math.pow(1.16, owned))

/** Paint a species into its own canvas, once. */
export function makeCreatureTexture(s: Species): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = FISH_W
  c.height = FISH_H
  const ctx = c.getContext('2d')!
  s.draw(ctx)
  return c
}

/** Compact money, because the late tank runs to eight figures. */
export function coinText(n: number) {
  if (n < 1000) return n.toFixed(n < 10 ? 1 : 0)
  const units = ['k', 'M', 'B', 'T']
  let v = n
  let u = -1
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++ }
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + units[u]
}
