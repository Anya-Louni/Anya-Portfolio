/**
 * Frutiger Aero avatar.
 *
 * The era's look: a glossy 3D-rendered bust on a bright gradient with bokeh
 * and an aurora sweep — Windows Live Messenger display pictures, Xbox 360
 * avatars, Wii-era portraits. Built as SVG so it stays sharp at 24px in the
 * Start menu and 128px on the login screen, and lit with the same specular
 * filter the icons use.
 */
import { useSyncExternalStore } from 'react'

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
export const BG = [
  ['#7fe0ff', '#2b80e6'],
  ['#b8f5c8', '#25b06a'],
  ['#ffd6f0', '#c14fd0'],
  ['#ffe9a8', '#ef8c2e'],
  ['#d9d2ff', '#6a4fe6'],
  ['#c9fbff', '#0f8fa8'],
]

export const DEFAULT_AVATAR: AvatarSpec = {
  skin: 1, hair: 0, hairColour: 0, eyes: 0, shirt: 0, bg: 0, accessory: 0,
}

const KEY = 'os.avatar'

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
  const id = `av${a.bg}${a.shirt}${a.hairColour}${a.skin}`
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
        <linearGradient id={`${id}gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.49" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.18" />
        </linearGradient>
        <radialGradient id={`${id}skin`} cx="0.38" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor={skin} />
          <stop offset="1" stopColor={skin} />
        </radialGradient>
        <linearGradient id={`${id}shirt`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor={shirt} />
          <stop offset="1" stopColor={shirt} />
        </linearGradient>
        <linearGradient id={`${id}aurora`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <rect x="0" y="0" width="96" height="96" rx="14" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}clip)`}>
        <rect width="96" height="96" fill={`url(#${id}bg)`} />

        {/* aurora sweep + bokeh, the two things that date it correctly */}
        <path d="M-10 62 C 20 40, 50 74, 106 44 L106 96 L-10 96 Z" fill={`url(#${id}aurora)`} />
        <g opacity="0.5">
          <circle cx="76" cy="18" r="11" fill="#fff" opacity="0.3" />
          <circle cx="88" cy="34" r="6" fill="#fff" opacity="0.28" />
          <circle cx="14" cy="16" r="7" fill="#fff" opacity="0.24" />
          <circle cx="24" cy="30" r="3.4" fill="#fff" opacity="0.35" />
        </g>

        {/* shoulders */}
        <path d="M14 96c0-16 15-25 34-25s34 9 34 25Z" fill={`url(#${id}shirt)`} />
        <path d="M14 96c0-16 15-25 34-25s34 9 34 25Z" fill={`url(#${id}gloss)`} opacity="0.5" />

        {/* neck + head */}
        <rect x="41" y="56" width="14" height="16" rx="7" fill={skin} />
        <ellipse cx="48" cy="42" rx="21" ry="23" fill={`url(#${id}skin)`} />

        {/* hair */}
        {a.hair % 4 === 0 ? (
          <path d="M27 40c0-14 9-22 21-22s21 8 21 22c0-8-8-11-21-11s-21 3-21 11Z" fill={hair} />
        ) : null}
        {a.hair % 4 === 1 ? (
          <>
            <path d="M27 42c0-15 9-24 21-24s21 9 21 24v6c-2-10-4-14-9-16-6 3-19 3-24-1-5 3-7 6-9 11Z" fill={hair} />
            <path d="M25 44c0 14 3 22 6 26-6-6-9-16-8-26Z" fill={hair} />
            <path d="M71 44c0 14-3 22-6 26 6-6 9-16 8-26Z" fill={hair} />
          </>
        ) : null}
        {a.hair % 4 === 2 ? (
          <>
            <path d="M27 41c0-14 9-23 21-23s21 9 21 23c0-7-9-10-21-10s-21 3-21 10Z" fill={hair} />
            <circle cx="26" cy="30" r="8" fill={hair} />
            <circle cx="70" cy="30" r="8" fill={hair} />
          </>
        ) : null}
        {a.hair % 4 === 3 ? (
          <path
            d="M28 44c-1-17 8-26 20-26s21 9 20 26c2-16-4-22-8-24-5 6-22 7-27 2-4 3-6 10-5 22Z"
            fill={hair}
          />
        ) : null}

        {/* eyes */}
        {a.eyes % 3 === 0 ? (
          <>
            <ellipse cx="40" cy="43" rx="3.1" ry="3.7" fill="#1a1a26" />
            <ellipse cx="56" cy="43" rx="3.1" ry="3.7" fill="#1a1a26" />
            <circle cx="41.2" cy="41.6" r="1.1" fill="#fff" />
            <circle cx="57.2" cy="41.6" r="1.1" fill="#fff" />
          </>
        ) : null}
        {a.eyes % 3 === 1 ? (
          <>
            <path d="M36.5 43.5q3.5-4 7 0" fill="none" stroke="#1a1a26" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M52.5 43.5q3.5-4 7 0" fill="none" stroke="#1a1a26" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : null}
        {a.eyes % 3 === 2 ? (
          <>
            <ellipse cx="40" cy="43" rx="4" ry="4.4" fill="#fff" stroke="#1a1a26" strokeWidth="1" />
            <ellipse cx="56" cy="43" rx="4" ry="4.4" fill="#fff" stroke="#1a1a26" strokeWidth="1" />
            <circle cx="40.8" cy="43.4" r="2.1" fill="#2f6fd8" />
            <circle cx="56.8" cy="43.4" r="2.1" fill="#2f6fd8" />
            <circle cx="41.6" cy="42.2" r="0.8" fill="#fff" />
            <circle cx="57.6" cy="42.2" r="0.8" fill="#fff" />
          </>
        ) : null}

        {/* mouth + blush */}
        <path d="M43 52q5 4 10 0" fill="none" stroke="#8c4a4a" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="33" cy="48" rx="4" ry="2.4" fill="#ff9db0" opacity="0.4" />
        <ellipse cx="63" cy="48" rx="4" ry="2.4" fill="#ff9db0" opacity="0.4" />

        {/* accessories */}
        {a.accessory % 4 === 1 ? (
          <g fill="none" stroke="#2b3550" strokeWidth="2">
            <circle cx="40" cy="43" r="7.5" fill="#bfe6ff" fillOpacity="0.42" />
            <circle cx="56" cy="43" r="7.5" fill="#bfe6ff" fillOpacity="0.42" />
            <path d="M47.5 43h1M25 41l7.5 1M71 41l-7.5 1" />
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

        {/* the glass pane over everything, which is the whole look */}
        <rect width="96" height="96" fill={`url(#${id}gloss)`} />
        <rect x="0.5" y="0.5" width="95" height="95" rx="13.5" fill="none" stroke="#ffffff" strokeOpacity="0.65" />
      </g>
    </svg>
  )
}
