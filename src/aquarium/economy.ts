/**
 * The tank's economy.
 *
 * Every creature you own earns a trickle of coins, and coins buy more
 * creatures. It all lives in this browser, there is no account and nothing
 * is sent anywhere, so a visitor's tank is theirs alone. The shared part of
 * the aquarium is still the drawn fish, which come from Supabase and cost
 * nothing.
 *
 * Time spent away counts, up to a point. Idle games are pleasant to come back
 * to and unpleasant to farm, so the offline catch-up is capped at eight hours.
 */
import { SPECIES, priceOf } from './creatures'
import { addCoins, getCoins, spendCoins } from '../os/purse'

const KEY = 'os.tank'
const OFFLINE_CAP = 8 * 3600
/** Feeding pays a short dividend, which gives tapping the glass a point. */
export const FED_FOR = 30
export const FED_MULTIPLIER = 2

export interface Tank {
  owned: Record<string, number>
  /** seconds of unix time when the tank was last written */
  seen: number
  /** unix seconds until which the fish are well fed */
  fedUntil: number
  /** lifetime earnings, for the header */
  earned: number
}

export const emptyTank = (): Tank => ({
  owned: { guppy: 1 },
  seen: Math.floor(Date.now() / 1000),
  fedUntil: 0,
  earned: 0,
})

export function ratePerSecond(owned: Record<string, number>) {
  let r = 0
  for (const s of SPECIES) r += (owned[s.id] ?? 0) * s.rate
  return r
}

export function load(): Tank {
  let t: Tank
  try {
    const raw = localStorage.getItem(KEY)
    t = raw ? { ...emptyTank(), ...(JSON.parse(raw) as Tank) } : emptyTank()
  } catch {
    t = emptyTank()
  }
  // sanity: a corrupted or hand-edited save should not break the tank
  if (!t.owned || typeof t.owned !== 'object') t.owned = {}
  return t
}

export function save(t: Tank) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...t, seen: Math.floor(Date.now() / 1000) }))
  } catch {
    /* a full or blocked store just means the tank does not persist */
  }
}

/** What was earned while the page was closed, and for how long. */
export function catchUp(t: Tank): { coins: number; seconds: number } {
  const now = Math.floor(Date.now() / 1000)
  const away = Math.min(OFFLINE_CAP, Math.max(0, now - t.seen))
  // a clock moved backwards should not pay out, and neither should a fresh tank
  if (away < 60) return { coins: 0, seconds: 0 }
  return { coins: ratePerSecond(t.owned) * away, seconds: away }
}

/** Takes the money from the shared purse, or returns null and takes nothing. */
export function buy(t: Tank, id: string): Tank | null {
  const s = SPECIES.find((x) => x.id === id)
  if (!s) return null
  const price = priceOf(s, t.owned[id] ?? 0)
  if (!spendCoins(price)) return null
  return { ...t, owned: { ...t.owned, [id]: (t.owned[id] ?? 0) + 1 } }
}

export function affordable(t: Tank, id: string) {
  const s = SPECIES.find((x) => x.id === id)
  return !!s && getCoins() >= priceOf(s, t.owned[id] ?? 0)
}

/** Pay the tank's takings into the purse. */
export function payOut(n: number) {
  addCoins(n)
}

export function awayText(seconds: number) {
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
  const h = seconds / 3600
  return `${h < 10 ? h.toFixed(1) : Math.round(h)} hours`
}
