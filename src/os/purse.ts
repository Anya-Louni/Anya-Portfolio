/**
 * One purse for the whole desktop.
 *
 * The aquarium earns it and the games pay into it, so a hand of Solitaire
 * buys a clownfish. It lives outside React in a tiny store of its own for the
 * same reason the avatar does: several windows show the balance at once and
 * all of them have to move the moment it changes, whichever one changed it.
 *
 * It is per-browser and goes nowhere. There is no account behind it.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'os.coins'

const listeners = new Set<() => void>()
let coins = read()
/** bumped on every change, so the snapshot is a cheap primitive */
let version = 0

function read(): number {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) {
      const n = Number(raw)
      return Number.isFinite(n) && n >= 0 ? n : 0
    }
    /* The balance used to live inside the tank's save, before the games
       needed to pay into it too. Anyone who played before this split keeps
       what they had. */
    const tank = localStorage.getItem('os.tank')
    if (tank) {
      const old = Number((JSON.parse(tank) as { coins?: number }).coins)
      if (Number.isFinite(old) && old > 0) return old
    }
    return 0
  } catch {
    return 0
  }
}

function write() {
  try {
    localStorage.setItem(KEY, String(coins))
  } catch {
    /* a full or blocked store just means the balance does not persist */
  }
}

function changed() {
  version++
  listeners.forEach((l) => l())
}

export function getCoins() {
  return coins
}

export function addCoins(n: number) {
  if (!Number.isFinite(n) || n <= 0) return
  coins += n
  write()
  changed()
}

/** Takes the money only if there is enough of it. */
export function spendCoins(n: number): boolean {
  if (!Number.isFinite(n) || n < 0 || coins < n) return false
  coins -= n
  write()
  changed()
  return true
}

export function setCoins(n: number) {
  coins = Math.max(0, Number.isFinite(n) ? n : 0)
  write()
  changed()
}

/* The balance moves several times a second while the aquarium is open, so the
   snapshot is a version counter rather than the number itself. React only
   needs to know that something changed, and comparing an integer is free. */
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
const snapshot = () => version

export function useCoins(): number {
  useSyncExternalStore(subscribe, snapshot, () => 0)
  return coins
}

/** Compact money, because a late tank runs to eight figures. */
export function coinText(n: number) {
  if (n < 1000) return n.toFixed(n < 10 ? 1 : 0)
  const units = ['k', 'M', 'B', 'T']
  let v = n
  let u = -1
  while (v >= 1000 && u < units.length - 1) {
    v /= 1000
    u++
  }
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + units[u]
}
