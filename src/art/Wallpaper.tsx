/**
 * "Aero" — the desktop wallpaper.
 *
 * The Frutiger Aero checklist, drawn rather than downloaded: a saturated sky
 * fading to white at the horizon, a sun with lens flare and bokeh, an aurora
 * band, glossy swoosh ribbons, a green hill, a water plane with glints, and
 * suspended bubbles with real speculars. All vector, all re-tinted from the
 * theme tokens.
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

/** bokeh discs — the out-of-focus light circles of the era */
const BOKEH = [
  { x: 74, y: 16, r: 46, o: 0.16 },
  { x: 83, y: 26, r: 28, o: 0.2 },
  { x: 67, y: 30, r: 18, o: 0.16 },
  { x: 88, y: 12, r: 22, o: 0.14 },
  { x: 60, y: 12, r: 14, o: 0.18 },
  { x: 78, y: 38, r: 12, o: 0.13 },
]

export function Wallpaper({ still = false }: { still?: boolean }) {
  return (
    <div className="wall" data-still={still}>
      <svg className="wall__scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="wSky" x1="0" y1="0" x2="0.08" y2="1">
            <stop offset="0" stopColor="var(--sky-deep)" />
            <stop offset="0.3" stopColor="var(--sky)" />
            <stop offset="0.56" stopColor="var(--sky-lite)" />
            <stop offset="0.76" stopColor="var(--aqua)" />
            <stop offset="0.9" stopColor="var(--foam)" />
            <stop offset="1" stopColor="var(--daylight)" />
          </linearGradient>

          <radialGradient id="wSun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="0.18" stopColor="var(--daylight)" stopOpacity="0.9" />
            <stop offset="0.45" stopColor="var(--aqua-lite)" stopOpacity="0.42" />
            <stop offset="1" stopColor="var(--aqua)" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="wAurora" x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0" stopColor="var(--violet-lite)" stopOpacity="0" />
            <stop offset="0.25" stopColor="var(--violet-lite)" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="var(--aqua)" stopOpacity="0.5" />
            <stop offset="0.8" stopColor="var(--leaf-lite)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--leaf-lite)" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="wRibA" x1="0" y1="0" x2="0.9" y2="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="0.4" stopColor="var(--aqua-lite)" stopOpacity="0.7" />
            <stop offset="1" stopColor="var(--sky-lite)" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="wRibB" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" stopColor="var(--violet-lite)" stopOpacity="0.7" />
            <stop offset="0.55" stopColor="var(--periwinkle)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--sky)" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id="wHill" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0" stopColor="var(--leaf-lite)" />
            <stop offset="0.45" stopColor="var(--leaf)" />
            <stop offset="1" stopColor="#1c7a52" />
          </linearGradient>
          <linearGradient id="wHillGloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="wWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--daylight)" stopOpacity="0.85" />
            <stop offset="0.16" stopColor="var(--aqua)" stopOpacity="0.7" />
            <stop offset="0.55" stopColor="var(--sky)" stopOpacity="0.72" />
            <stop offset="1" stopColor="var(--sky-deep)" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="wRay" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="wVig" cx="0.5" cy="0.44" r="0.78">
            <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#02132e" stopOpacity="0.34" />
          </radialGradient>

          <filter id="wSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="30" />
          </filter>
          <filter id="wSofter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="64" />
          </filter>
          <filter id="wBokeh" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* sky */}
        <rect width="1600" height="900" fill="url(#wSky)" />

        {/* aurora band */}
        <g className="wall__aurora" filter="url(#wSoft)" opacity="0.75">
          <path d="M-160 250 C 240 120, 620 300, 980 170 C 1260 70, 1470 190, 1760 120 L1760 300 C 1420 400, 1180 250, 900 340 C 600 436, 260 320, -160 420 Z" fill="url(#wAurora)" />
        </g>

        {/* clouds */}
        <g filter="url(#wSoft)" opacity="0.85">
          <ellipse cx="270" cy="410" rx="320" ry="52" fill="#ffffff" opacity="0.55" />
          <ellipse cx="1340" cy="352" rx="280" ry="44" fill="#ffffff" opacity="0.45" />
          <ellipse cx="760" cy="470" rx="380" ry="42" fill="#ffffff" opacity="0.5" />
          <ellipse cx="1080" cy="250" rx="200" ry="30" fill="#ffffff" opacity="0.35" />
        </g>

        {/* sun + bloom, upper right */}
        <circle cx="1245" cy="215" r="330" fill="url(#wSun)" />
        <circle cx="1245" cy="215" r="66" fill="#ffffff" filter="url(#wSofter)" opacity="0.95" />
        <circle cx="1245" cy="215" r="26" fill="#ffffff" />

        {/* lens flare down the optical axis */}
        <g className="wall__flare" opacity="0.55">
          <circle cx="1080" cy="330" r="30" fill="var(--aqua-lite)" opacity="0.3" />
          <circle cx="960" cy="410" r="15" fill="var(--leaf-lite)" opacity="0.35" />
          <circle cx="838" cy="492" r="46" fill="var(--violet-lite)" opacity="0.2" />
          <circle cx="700" cy="580" r="20" fill="var(--aqua)" opacity="0.28" />
          <circle cx="1160" cy="272" r="10" fill="#ffffff" opacity="0.6" />
          <path d="M1245 215 L1600 -40 L1660 30 Z" fill="#ffffff" opacity="0.12" />
          <path d="M1245 215 L880 560 L820 500 Z" fill="#ffffff" opacity="0.08" />
        </g>

        {/* light shafts */}
        <g className="wall__rays" opacity="0.42">
          <path d="M1245 215 L700 900 L900 900 Z" fill="url(#wRay)" />
          <path d="M1245 215 L1020 900 L1130 900 Z" fill="url(#wRay)" />
          <path d="M1245 215 L1420 900 L1620 900 Z" fill="url(#wRay)" />
        </g>

        {/* glossy swoosh ribbons — the signature Aero gesture */}
        <g className="wall__ribbons">
          <path
            d="M-140 700 C 220 560, 460 690, 820 596 C 1140 512, 1380 590, 1760 500 L1760 900 L-140 900 Z"
            fill="url(#wRibB)"
            opacity="0.75"
          />
          <path
            d="M-140 700 C 220 560, 460 690, 820 596 C 1140 512, 1380 590, 1760 500"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            opacity="0.75"
          />
          <path
            d="M-140 790 C 260 660, 520 780, 900 690 C 1220 614, 1440 690, 1760 620 L1760 900 L-140 900 Z"
            fill="url(#wRibA)"
            opacity="0.72"
          />
          <path
            d="M-140 790 C 260 660, 520 780, 900 690 C 1220 614, 1440 690, 1760 620"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            opacity="0.9"
          />
        </g>

        {/* green hill, bottom left — the nature half of the aesthetic */}
        <g className="wall__hill">
          <path
            d="M-140 900 L-140 780 C 140 690, 420 706, 660 782 C 840 838, 980 880, 1100 900 Z"
            fill="url(#wHill)"
          />
          <path
            d="M-140 780 C 140 690, 420 706, 660 782 C 500 760, 200 742, -140 812 Z"
            fill="url(#wHillGloss)"
          />
          <path
            d="M-140 780 C 140 690, 420 706, 660 782"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            opacity="0.6"
          />
        </g>

        {/* water plane */}
        <path
          d="M1100 900 C 1180 862, 1330 830, 1760 806 L1760 900 Z"
          fill="url(#wWater)"
          opacity="0.9"
        />
        <g className="wall__glints" opacity="0.7">
          <ellipse cx="1420" cy="852" rx="190" ry="4" fill="#ffffff" />
          <ellipse cx="1300" cy="874" rx="120" ry="3" fill="#ffffff" />
          <ellipse cx="1540" cy="888" rx="150" ry="3.5" fill="var(--aqua-lite)" />
        </g>

        {/* bokeh */}
        <g filter="url(#wBokeh)">
          {BOKEH.map((b, i) => (
            <circle
              key={i}
              cx={(b.x / 100) * 1600}
              cy={(b.y / 100) * 900}
              r={b.r}
              fill="#ffffff"
              opacity={b.o}
            />
          ))}
        </g>

        <rect width="1600" height="900" fill="url(#wVig)" />
      </svg>

      {/* suspended bubbles */}
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
