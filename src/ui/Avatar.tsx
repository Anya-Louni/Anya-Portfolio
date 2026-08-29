/**
 * Frutiger Aero avatar.
 *
 * The figure is drawn to match the person in Windows 7's own icons: a tall
 * egg of a head with no face at all, a hair cap with one soft highlight, a
 * short neck almost entirely hidden by the collar, and shoulders that flare
 * to a rounded trapezoid with a white shirt V and a seam down the middle.
 *
 * Two details do most of the work, and both come straight from Microsoft's
 * icon guidelines. The light is above, in front and slightly left, so every
 * part carries a soft highlight up there and a darker crescent on the lower
 * right. And nothing is outlined in black — each outline is a darker version
 * of the colour it surrounds.
 *
 * The tile around it is the other half of the era: a bright gradient, bokeh,
 * and one restrained pane of glass. Built as SVG so it stays sharp at 24px in
 * the Start menu and 128px on the login screen.
 */
import { useId, useSyncExternalStore } from 'react'

export interface AvatarSpec {
  skin: number
  hair: number
  hairColour: number
  eyes: number
  shirt: number
  bg: number
  accessory: number
}

export const SKIN = ['#f6d9c2', '#efc4a0', '#dda87c', '#c1855a', '#95603c', '#6b4429']
export const HAIR_COLOUR = ['#2b1f18', '#5c3a1e', '#a8672c', '#d9a441', '#e8e2d4', '#6a4bd8', '#e0559b', '#2fb6c4']
export const SHIRT = ['#39a8f0', '#4fd48a', '#ff8f2e', '#e256c0', '#8b5cf6', '#ffd23f', '#f4f7fb', '#2b3550']
/* Two close, pale tones each. Windows 7's account pictures sit on plain
   near-white grounds; a saturated gradient behind the figure is what made
   these read as generated rather than drawn. */
export const BG = [
  ['#f6fbff', '#d9ebf8'],
  ['#f6fcf4', '#dcefd6'],
  ['#fdf6fc', '#f1dced'],
  ['#fffbf2', '#f8ead3'],
  ['#f8f6ff', '#e2dcf4'],
  ['#f4f6f9', '#dde4ec'],
]

export const DEFAULT_AVATAR: AvatarSpec = {
  skin: 1, hair: 0, hairColour: 0, eyes: 0, shirt: 0, bg: 0, accessory: 0,
}

const KEY = 'os.avatar'

/** Mix a hex colour toward black (k < 0) or white (k > 0). */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const t = k < 0 ? 0 : 255
  const p = Math.abs(k)
  const ch = (sh: number) => {
    const v = (n >> sh) & 255
    return Math.round(v + (t - v) * p)
  }
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/* ---- a tiny store so every surface updates the moment it is saved ---- */
const listeners = new Set<() => void>()
let cached: string | null = null

function read(): AvatarSpec {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== cached) cached = raw
    return raw ? { ...DEFAULT_AVATAR, ...(JSON.parse(raw) as AvatarSpec) } : DEFAULT_AVATAR
  } catch {
    return DEFAULT_AVATAR
  }
}

export function saveAvatar(spec: AvatarSpec) {
  try {
    localStorage.setItem(KEY, JSON.stringify(spec))
  } catch {
    /* nothing to do */
  }
  cached = JSON.stringify(spec)
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
function snapshot() {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function useAvatar(): AvatarSpec {
  useSyncExternalStore(subscribe, snapshot, () => '')
  return read()
}

/* The head is an egg that tapers to a chin, not a circle; the torso flares
   from the neck and is cut off square at the bottom of the tile. */
/* Drawn 5 units lower than it was, so the jaw reaches the collar. */
const HEAD = 'M48 24c10 0 17.5 8.4 17.5 18.6 0 12.4-7.8 21.4-17.5 21.4s-17.5-9-17.5-21.4C30.5 32.4 38 24 48 24Z'
const TORSO = 'M7 96c0-17.5 14-29 41-29s41 11.5 41 29Z'

export function Avatar({
  spec,
  size = 48,
  className = '',
}: {
  spec?: AvatarSpec
  size?: number
  className?: string
}) {
  const live = useAvatar()
  const a = spec ?? live
  /* ids must be unique per instance: several avatars sit on screen at once
     and the browser resolves url(#id) to whichever appeared first */
  const id = useId().replace(/:/g, '')
  const [bg1, bg2] = BG[a.bg % BG.length]
  const skin = SKIN[a.skin % SKIN.length]
  const hair = HAIR_COLOUR[a.hairColour % HAIR_COLOUR.length]
  const shirt = SHIRT[a.shirt % SHIRT.length]

  return (
    <svg viewBox="0 0 96 96" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={bg1} />
          <stop offset="1" stopColor={bg2} />
        </linearGradient>
        {/* light from above, in front and slightly left — so the highlight
            sits on the upper left of the forehead and the colour deepens
            toward the lower right */}
        <radialGradient id={`${id}skin`} cx="0.36" cy="0.26" r="0.86">
          <stop offset="0" stopColor={shade(skin, 0.4)} />
          <stop offset="0.42" stopColor={skin} />
          <stop offset="1" stopColor={shade(skin, -0.22)} />
        </radialGradient>
        {/* Top to bottom, and barely: hair reads as form, not as plastic. */}
        <linearGradient id={`${id}hair`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={shade(hair, 0.16)} />
          <stop offset="0.55" stopColor={hair} />
          <stop offset="1" stopColor={shade(hair, -0.14)} />
        </linearGradient>
        <linearGradient id={`${id}shirt`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={shade(shirt, 0.34)} />
          <stop offset="0.4" stopColor={shirt} />
          <stop offset="1" stopColor={shade(shirt, -0.24)} />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <rect x="4" y="4" width="88" height="88" rx="1" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}clip)`}>
        <rect width="96" height="96" fill={`url(#${id}bg)`} />

        {/* scaled about the bottom centre, so the shoulders stay pinned to the
            bottom edge and the head grows into the frame */}
        <g transform="translate(48 96) scale(1.1) translate(-48 -96)">

        {/* shoulders: a rounded trapezoid, wide at the cut, narrow at the neck */}
        <path d={TORSO} fill={`url(#${id}shirt)`} />
        <path d={TORSO} fill="none" stroke={shade(shirt, -0.34)} strokeWidth="1.2" />
        {/* the shirt showing at the collar, and the seam below it */}
        <path d="M40.5 66.5 48 82l7.5-15.5c-4.5-1.6-10.5-1.6-15 0Z" fill="#f4f8fc" />
        <path d="M48 82v14" stroke={shade(shirt, -0.3)} strokeWidth="1.4" strokeLinecap="round" />

        {/* head. No face, and no ears. */}
        <path d={HEAD} fill={`url(#${id}skin)`} />
        <path d={HEAD} fill="none" stroke={shade(skin, -0.32)} strokeWidth="1.1" />
        {/* shadow down the right, away from the light */}
        <path
          d="M65 38c1.6 4 2 8 2 11 0 12-8 21-17 21 12-2 17-11 17-21 0-4-.6-8-2-11Z"
          fill={shade(skin, -0.3)}
          opacity="0.65"
        />

        {/* hair. Matte: a shallow gradient for form, no highlight streak. */}
        {a.hair % 4 === 0 ? (
          <path
            d="M30.5 48c0-14.5 7.5-25 17.5-25s17.5 10.5 17.5 25c0-7-3-11.5-8-13-3.5 2.5-16.5 2.5-20 0-5 1.5-7 6-7 13Z"
            fill={`url(#${id}hair)`}
          />
        ) : null}
        {a.hair % 4 === 1 ? (
          <>
            <path
              d="M30.5 48c0-14.5 7.5-25 17.5-25s17.5 10.5 17.5 25c0-7-3-11.5-8-13-3.5 2.5-16.5 2.5-20 0-5 1.5-7 6-7 13Z"
              fill={`url(#${id}hair)`}
            />
            <path d="M31 43c-3 12-3 23 0 31 0-11 2-22 5-29Z" fill={`url(#${id}hair)`} />
            <path d="M65 43c3 12 3 23 0 31 0-11-2-22-5-29Z" fill={`url(#${id}hair)`} />
          </>
        ) : null}
        {a.hair % 4 === 2 ? (
          <>
            <path
              d="M30.5 48c0-14.5 7.5-25 17.5-25s17.5 10.5 17.5 25c0-7-3-11.5-8-13-3.5 2.5-16.5 2.5-20 0-5 1.5-7 6-7 13Z"
              fill={`url(#${id}hair)`}
            />
            <circle cx="29" cy="30" r="7.5" fill={`url(#${id}hair)`} />
            <circle cx="67" cy="30" r="7.5" fill={`url(#${id}hair)`} />
          </>
        ) : null}
        {a.hair % 4 === 3 ? (
          <path
            d="M30.5 49c0-15 7.5-26 17.5-26s17.5 11 17.5 26c-1-11-4-17-9-19-6 7-19 6-23 1-2.5 3.5-3.5 10-3 18Z"
            fill={`url(#${id}hair)`}
          />
        ) : null}

        {/* accessories */}
        {a.accessory % 4 === 1 ? (
          <g>
            <path
              d="M29 40q19 7 38 0v6q-19 8-38 0Z"
              fill="#7fdcff"
              fillOpacity="0.65"
              stroke="#2b3550"
              strokeWidth="1.4"
            />
            <path d="M31 41q17 6 34 0v2q-17 6-34 0Z" fill="#ffffff" opacity="0.5" />
          </g>
        ) : null}
        {a.accessory % 4 === 2 ? (
          <g>
            <path d="M26 42a22 22 0 0 1 44 0" fill="none" stroke="#2b3550" strokeWidth="4" />
            <rect x="20" y="38" width="11" height="16" rx="5" fill="#2b3550" />
            <rect x="65" y="38" width="11" height="16" rx="5" fill="#2b3550" />
            <rect x="22" y="40" width="7" height="6" rx="3" fill="#7fe0ff" opacity="0.7" />
          </g>
        ) : null}
        {a.accessory % 4 === 3 ? (
          <path
            d="M48 14c1.4 4.6 3 6 7.6 7.4-4.6 1.4-6.2 2.8-7.6 7.4-1.4-4.6-3-6-7.6-7.4 4.6-1.4 6.2-2.8 7.6-7.4Z"
            fill="#fff7b0"
            stroke="#e8c33c"
            strokeWidth="1"
          />
        ) : null}
        </g>
      </g>

      {/* The frame Windows 7 puts around an account picture: a white mat, a
          grey line outside it, and a hairline of shadow inside. It is what
          makes the tile read as a framed picture rather than as a sticker. */}
      <rect x="2" y="2" width="92" height="92" rx="2" fill="none" stroke="#ffffff" strokeWidth="4" />
      <rect x="0.5" y="0.5" width="95" height="95" rx="3" fill="none" stroke="#9aa6b4" />
      <rect x="4.5" y="4.5" width="87" height="87" rx="1" fill="none" stroke="#000000" strokeOpacity="0.16" />
    </svg>
  )
}
