/** Shared card model for Klondike, Spider and FreeCell. */

export type Suit = 'S' | 'H' | 'D' | 'C'

export interface Card {
  id: string
  suit: Suit
  /** 1 = Ace … 13 = King */
  rank: number
  faceUp: boolean
}

export const SUITS: Suit[] = ['S', 'H', 'D', 'C']
export const SUIT_GLYPH: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }
export const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export const isRed = (s: Suit) => s === 'H' || s === 'D'
export const rankName = (r: number) => RANKS[r] ?? String(r)

/** Deterministic PRNG so a deal number reproduces a deal, like the originals. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Build a deck. `suits` controls Spider's 1/2/4-suit variants; `copies` is how
 * many times the whole suit set repeats.
 */
export function makeDeck(copies = 1, suits: Suit[] = SUITS): Card[] {
  const out: Card[] = []
  for (let c = 0; c < copies; c++) {
    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        out.push({ id: `${suit}${rank}-${c}`, suit, rank, faceUp: false })
      }
    }
  }
  return out
}

export const newSeed = () => Math.floor(Math.random() * 32000) + 1

/** Klondike/FreeCell tableau rule: descending rank, alternating colour. */
export const stacksAlternating = (upper: Card, lower: Card) =>
  upper.rank === lower.rank + 1 && isRed(upper.suit) !== isRed(lower.suit)

/** Spider tableau rule: descending rank, any suit. */
export const stacksDescending = (upper: Card, lower: Card) => upper.rank === lower.rank + 1

/** A run that can be picked up as one unit. */
export function runLength(pile: Card[], from: number, sameSuit: boolean) {
  let n = 1
  for (let i = from; i < pile.length - 1; i++) {
    const a = pile[i]
    const b = pile[i + 1]
    if (!a.faceUp || !b.faceUp) return n
    const ok = sameSuit
      ? a.rank === b.rank + 1 && a.suit === b.suit
      : stacksAlternating(a, b)
    if (!ok) return n
    n++
  }
  return n
}
