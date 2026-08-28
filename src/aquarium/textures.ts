import { FISH_H, FISH_W, fishPath, type Shape } from './silhouette'

/**
 * Stock fish are painted once into offscreen canvases and then rendered by the
 * same slice-wiggle routine that draws visitor fish, so nothing in the tank
 * moves differently from anything else.
 */

export interface Pattern {
  shape: Shape
  /** body gradient, light to dark */
  body: [string, string, string]
  /** stripe / spot colour */
  mark: string
  style: 'stripes' | 'spots' | 'bands' | 'plain' | 'gradientOnly'
  fin: string
}

export const STOCK: Pattern[] = [
  { shape: 'round', body: ['#ffd97a', '#ff9f2e', '#e2670c'], mark: '#3b1d05', style: 'stripes', fin: '#ffbe5c' },
  { shape: 'standard', body: ['#9ef7ff', '#35c8f0', '#0a76b8'], mark: '#f6feff', style: 'bands', fin: '#7fe6ff' },
  { shape: 'tall', body: ['#ffe6f2', '#ff77b4', '#c62d78'], mark: '#7a0b40', style: 'spots', fin: '#ffa8d0' },
  { shape: 'angel', body: ['#fff6c2', '#ffd94a', '#d99b06'], mark: '#2b2410', style: 'bands', fin: '#ffe98a' },
  { shape: 'long', body: ['#c9ffe3', '#4fdc9b', '#128a55'], mark: '#f2fff8', style: 'stripes', fin: '#8bf0c1' },
  { shape: 'standard', body: ['#e2d7ff', '#9a7bf5', '#5433c0'], mark: '#f7f3ff', style: 'spots', fin: '#bda6ff' },
  { shape: 'round', body: ['#ffd4c4', '#ff7a5c', '#c8351a'], mark: '#fff1ea', style: 'bands', fin: '#ffab93' },
  { shape: 'tall', body: ['#d8fbff', '#6fe6e0', '#189a96'], mark: '#04413f', style: 'stripes', fin: '#9df1ec' },
  { shape: 'long', body: ['#fff0d6', '#ffb45e', '#d1701a'], mark: '#5a2f06', style: 'spots', fin: '#ffcf94' },
  { shape: 'angel', body: ['#dbe9ff', '#6ea8ff', '#2554c4'], mark: '#f4f8ff', style: 'bands', fin: '#a3c8ff' },
  { shape: 'standard', body: ['#ffe0f6', '#e07af0', '#8f21a8'], mark: '#fff0fb', style: 'stripes', fin: '#f0a6fa' },
  { shape: 'round', body: ['#e9ffcf', '#a8e04a', '#5f9410'], mark: '#26410a', style: 'spots', fin: '#c8ef83' },
]

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Paint one stock fish into its own canvas. */
export function makeStockTexture(p: Pattern): HTMLCanvasElement {
  const c = canvas(FISH_W, FISH_H)
  const ctx = c.getContext('2d')!
  const path = fishPath(p.shape)

  // fins first, so the body sits over their roots
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = p.fin
  ctx.fill(path)
  ctx.restore()

  ctx.save()
  ctx.clip(path)

  const g = ctx.createLinearGradient(0, 4, 0, FISH_H - 4)
  g.addColorStop(0, p.body[0])
  g.addColorStop(0.5, p.body[1])
  g.addColorStop(1, p.body[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, FISH_W, FISH_H)

  ctx.globalAlpha = 0.75
  ctx.fillStyle = p.mark
  if (p.style === 'stripes') {
    for (let x = 30; x < FISH_W; x += 20) {
      ctx.save()
      ctx.translate(x, 0)
      ctx.rotate(0.18)
      ctx.fillRect(0, -20, 8, FISH_H + 40)
      ctx.restore()
    }
  } else if (p.style === 'bands') {
    for (let y = 6; y < FISH_H; y += 18) ctx.fillRect(0, y, FISH_W, 6)
  } else if (p.style === 'spots') {
    for (let i = 0; i < 22; i++) {
      const x = 20 + ((i * 37) % (FISH_W - 26))
      const y = 8 + ((i * 53) % (FISH_H - 14))
      ctx.beginPath()
      ctx.arc(x, y, 3.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  // belly light and a top shade, so it reads round
  const belly = ctx.createLinearGradient(0, FISH_H * 0.45, 0, FISH_H)
  belly.addColorStop(0, 'rgba(255,255,255,0)')
  belly.addColorStop(1, 'rgba(255,255,255,0.5)')
  ctx.fillStyle = belly
  ctx.fillRect(0, 0, FISH_W, FISH_H)

  const top = ctx.createLinearGradient(0, 0, 0, FISH_H * 0.4)
  top.addColorStop(0, 'rgba(0,0,0,0.22)')
  top.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, FISH_W, FISH_H)

  ctx.restore()

  /* Outline only. The fish have no eyes, the same way the avatars have no
     faces and the pet has no mouth — the shapes carry it, and a pair of
     cartoon eyes on every one of them pulled the whole tank toward clip art. */
  ctx.strokeStyle = 'rgba(10,26,52,0.5)'
  ctx.lineWidth = 1.6
  ctx.stroke(path)
  return c
}

/** Turn a saved dataURL into a texture the engine can draw. */
export function imageTexture(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
