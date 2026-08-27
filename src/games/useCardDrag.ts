import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card } from './deck'

export interface DragState {
  cards: Card[]
  src: string
  index: number
  /** pointer offset inside the grabbed card */
  dx: number
  dy: number
  x: number
  y: number
  moved: boolean
}

/**
 * Pointer-driven card dragging. Drop targets are any element carrying
 * `data-drop="<id>"`; the topmost one under the pointer wins.
 */
export function useCardDrag(onDrop: (drag: DragState, target: string | null) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const ref = useRef<DragState | null>(null)
  ref.current = drag

  const start = useCallback(
    (e: React.PointerEvent, cards: Card[], src: string, index: number) => {
      if (e.button !== 0 || !cards.length) return
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setDrag({
        cards,
        src,
        index,
        dx: e.clientX - r.left,
        dy: e.clientY - r.top,
        x: e.clientX,
        y: e.clientY,
        moved: false,
      })
    },
    [],
  )

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      setDrag((d) =>
        d
          ? {
              ...d,
              x: e.clientX,
              y: e.clientY,
              moved: d.moved || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 2,
            }
          : d,
      )
    }
    const up = (e: PointerEvent) => {
      const d = ref.current
      setDrag(null)
      if (!d) return
      const hit = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el) => (el as HTMLElement).dataset?.drop) as HTMLElement | undefined
      onDrop(d, hit?.dataset.drop ?? null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag, onDrop])

  return { drag, start }
}
