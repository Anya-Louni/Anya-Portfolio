/**
 * "Aero" — the desktop wallpaper.
 *
 * The scene itself is a rendered image (public/wall, one per theme, wired up
 * through the --wall token) rather than a stack of SVG shapes. Drawing it in
 * vectors gave hard edges and visible banding across the sky; the renderer in
 * tools/wall.py works in floating point and dithers on the way out, which is
 * what a sky this large needs.
 *
 * What stays in the DOM is only the part that moves: the suspended bubbles.
 */
import type { CSSProperties } from 'react'

const BUBBLES = [
  { x: 7, y: 63, r: 52, d: 0, dur: 27, o: 0.72 },
  { x: 17, y: 38, r: 22, d: 3, dur: 21, o: 0.6 },
  { x: 26, y: 76, r: 34, d: 6, dur: 31, o: 0.66 },
  { x: 38, y: 27, r: 14, d: 1.5, dur: 18, o: 0.55 },
  { x: 49, y: 68, r: 64, d: 9, dur: 35, o: 0.55 },
  { x: 61, y: 45, r: 25, d: 4, dur: 24, o: 0.62 },
  { x: 71, y: 73, r: 40, d: 12, dur: 29, o: 0.6 },
  { x: 81, y: 31, r: 17, d: 7, dur: 20, o: 0.58 },
  { x: 90, y: 60, r: 30, d: 2, dur: 26, o: 0.62 },
  { x: 33, y: 53, r: 10, d: 5, dur: 16, o: 0.7 },
  { x: 66, y: 20, r: 11, d: 10, dur: 19, o: 0.55 },
  { x: 13, y: 22, r: 13, d: 8, dur: 22, o: 0.5 },
  { x: 95, y: 42, r: 18, d: 14, dur: 24, o: 0.55 },
  { x: 44, y: 84, r: 26, d: 11, dur: 33, o: 0.5 },
]

export function Wallpaper({ still = false }: { still?: boolean }) {
  return (
    <div className="wall" data-still={still}>
      <div className="wall__bubbles">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="bub"
            style={
              {
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.r * 2}px`,
                height: `${b.r * 2}px`,
                opacity: b.o,
                animationDelay: `${-b.d}s`,
                animationDuration: `${b.dur}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  )
}
