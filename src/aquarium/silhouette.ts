/**
 * Fish silhouettes, all drawn facing right inside a 128x80 box.
 * The painter clips a visitor's strokes to `standard`; the engine renders any
 * texture built on the same box, so drawn fish and stock fish move alike.
 */

export const FISH_W = 128
export const FISH_H = 80

export type Shape = 'standard' | 'round' | 'long' | 'tall' | 'angel'

export function fishPath(shape: Shape = 'standard'): Path2D {
  const p = new Path2D()
  switch (shape) {
    case 'round':
      // tail
      p.moveTo(34, 40)
      p.quadraticCurveTo(12, 8, 4, 16)
      p.quadraticCurveTo(14, 40, 4, 64)
      p.quadraticCurveTo(12, 72, 34, 40)
      p.closePath()
      // fins
      p.moveTo(62, 12)
      p.quadraticCurveTo(80, -2, 92, 16)
      p.closePath()
      p.moveTo(60, 68)
      p.quadraticCurveTo(74, 80, 86, 66)
      p.closePath()
      p.ellipse(72, 40, 42, 32, 0, 0, Math.PI * 2)
      break

    case 'long':
      p.moveTo(24, 40)
      p.quadraticCurveTo(8, 22, 2, 28)
      p.quadraticCurveTo(10, 40, 2, 52)
      p.quadraticCurveTo(8, 58, 24, 40)
      p.closePath()
      p.moveTo(56, 24)
      p.quadraticCurveTo(76, 12, 96, 26)
      p.closePath()
      p.ellipse(70, 40, 50, 18, 0, 0, Math.PI * 2)
      break

    case 'tall':
      p.moveTo(32, 40)
      p.quadraticCurveTo(10, 12, 3, 20)
      p.quadraticCurveTo(13, 40, 3, 60)
      p.quadraticCurveTo(10, 68, 32, 40)
      p.closePath()
      p.moveTo(58, 8)
      p.quadraticCurveTo(78, -4, 94, 14)
      p.closePath()
      p.moveTo(56, 72)
      p.quadraticCurveTo(74, 84, 88, 68)
      p.closePath()
      p.ellipse(72, 40, 38, 36, 0, 0, Math.PI * 2)
      break

    case 'angel':
      p.moveTo(30, 40)
      p.quadraticCurveTo(10, 16, 4, 24)
      p.quadraticCurveTo(14, 40, 4, 56)
      p.quadraticCurveTo(10, 64, 30, 40)
      p.closePath()
      // long trailing fins
      p.moveTo(62, 14)
      p.quadraticCurveTo(72, -8, 86, 4)
      p.quadraticCurveTo(88, 14, 84, 22)
      p.closePath()
      p.moveTo(60, 66)
      p.quadraticCurveTo(68, 88, 84, 78)
      p.quadraticCurveTo(86, 68, 82, 60)
      p.closePath()
      p.ellipse(70, 40, 38, 28, 0, 0, Math.PI * 2)
      break

    default:
      // tail
      p.moveTo(30, 40)
      p.quadraticCurveTo(10, 10, 2, 18)
      p.quadraticCurveTo(12, 40, 2, 62)
      p.quadraticCurveTo(10, 70, 30, 40)
      p.closePath()
      // dorsal
      p.moveTo(58, 15)
      p.quadraticCurveTo(76, 0, 92, 18)
      p.closePath()
      // ventral
      p.moveTo(56, 65)
      p.quadraticCurveTo(70, 78, 84, 64)
      p.closePath()
      // body
      p.ellipse(72, 40, 44, 27, 0, 0, Math.PI * 2)
  }
  return p
}

/** Where the eye sits for each silhouette. */
export const EYE: Record<Shape, { x: number; y: number; r: number }> = {
  standard: { x: 98, y: 33, r: 5.4 },
  round: { x: 98, y: 33, r: 5.6 },
  long: { x: 106, y: 37, r: 4.4 },
  tall: { x: 96, y: 32, r: 5.2 },
  angel: { x: 96, y: 33, r: 5 },
}
