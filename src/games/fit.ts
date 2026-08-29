import { useEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * How big a card can be on this table.
 *
 * A card is 71x96 wherever there is room for one. When the window is too
 * narrow for the whole layout the cards shrink until it fits, because a
 * patience you have to scroll sideways is not a patience. Everything on the
 * card is sized in em from this, so it all comes down together.
 */

const FULL = 71
const RATIO = 96 / 71
const PAD = 28 // .game__board padding, both sides

export interface Fit {
  /** Put on the board: .card and friends read these. */
  style: CSSProperties
  cw: number
  ch: number
  /** How far a face up card is offset from the one under it. */
  fanUp: number
  fanDown: number
  /** The three card waste spread. */
  spread: number
  /** Gap between columns, shrunk along with the cards. */
  gap: number
}

export function useFit(cols: number, gap: number, min = 24) {
  const ref = useRef<HTMLDivElement>(null)
  const [cw, setCw] = useState(FULL)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      /* The gaps shrink with the cards, so they are part of the division
         rather than a fixed subtraction. */
      const room = (el.clientWidth - PAD) / (cols + ((cols - 1) * gap) / FULL)
      setCw(Math.max(min, Math.min(FULL, Math.floor(room))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cols, gap, min])

  const k = cw / FULL
  const fit: Fit = {
    cw,
    ch: Math.round(cw * RATIO),
    fanUp: Math.max(9, Math.round(20 * k)),
    fanDown: Math.max(3, Math.round(6 * k)),
    spread: Math.max(9, Math.round(18 * k)),
    gap: Math.max(3, Math.round(gap * k)),
    style: {
      ['--cw' as string]: `${cw}px`,
      ['--ch' as string]: `${Math.round(cw * RATIO)}px`,
      ['--gap' as string]: `${Math.max(3, Math.round(gap * k))}px`,
    } as CSSProperties,
  }
  return [ref, fit] as const
}
