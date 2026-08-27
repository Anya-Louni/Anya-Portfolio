import { useEffect, useState } from 'react'
import {
  makeDeck,
  mulberry32,
  newSeed,
  runLength,
  shuffle,
  stacksAlternating,
  type Card,
} from '../../games/deck'
import { CardView, Slot } from '../../games/CardView'
import { useCardDrag, type DragState } from '../../games/useCardDrag'
import { WinCascade } from '../../games/WinCascade'
import { sound } from '../../os/sound'

const CH = 96
const FAN = 22

interface Game {
  free: (Card | null)[]
  foundations: Card[][]
  tableau: Card[][]
  seed: number
  moves: number
}

function deal(seed: number): Game {
  const cards = shuffle(makeDeck(1), mulberry32(seed)).map((c) => ({ ...c, faceUp: true }))
  const tableau: Card[][] = Array.from({ length: 8 }, () => [])
  cards.forEach((c, i) => tableau[i % 8].push(c))
  return { free: [null, null, null, null], foundations: [[], [], [], []], tableau, seed, moves: 0 }
}

const canFoundation = (pile: Card[], c: Card) =>
  pile.length === 0 ? c.rank === 1 : pile[pile.length - 1].suit === c.suit && pile[pile.length - 1].rank === c.rank - 1

const canTableau = (pile: Card[], c: Card) =>
  pile.length === 0 ? true : stacksAlternating(pile[pile.length - 1], c)

export default function FreeCell() {
  const [g, setG] = useState<Game>(() => deal(newSeed()))
  const [won, setWon] = useState(false)
  const home = g.foundations.reduce((n, f) => n + f.length, 0)

  useEffect(() => {
    if (home === 52 && !won) {
      setWon(true)
      sound.chime()
    }
  }, [home, won])

  const reset = (seed = newSeed()) => {
    setG(deal(seed))
    setWon(false)
    sound.click(1.1)
  }

  /** FreeCell's move limit: (free cells + 1) x 2^(empty columns) */
  const capacity = (s: Game, destEmpty: boolean) => {
    const freeCells = s.free.filter((f) => f === null).length
    const emptyCols = s.tableau.filter((t) => t.length === 0).length - (destEmpty ? 1 : 0)
    return (freeCells + 1) * Math.pow(2, Math.max(0, emptyCols))
  }

  const onDrop = (drag: DragState, target: string | null) => {
    if (!target || target === drag.src) return
    setG((s) => {
      const next: Game = {
        ...s,
        free: s.free.slice(),
        foundations: s.foundations.map((f) => f.slice()),
        tableau: s.tableau.map((t) => t.slice()),
      }
      const moving = drag.cards
      const head = moving[0]

      if (target.startsWith('c')) {
        const ci = Number(target.slice(1))
        if (moving.length !== 1 || next.free[ci]) return s
        next.free[ci] = head
      } else if (target.startsWith('f')) {
        const fi = Number(target.slice(1))
        if (moving.length !== 1 || !canFoundation(next.foundations[fi], head)) return s
        next.foundations[fi].push(head)
      } else if (target.startsWith('t')) {
        const ti = Number(target.slice(1))
        const dest = next.tableau[ti]
        if (!canTableau(dest, head)) return s
        if (moving.length > capacity(s, dest.length === 0)) return s
        dest.push(...moving)
      } else return s

      if (drag.src.startsWith('c')) next.free[Number(drag.src.slice(1))] = null
      else if (drag.src.startsWith('f')) next.foundations[Number(drag.src.slice(1))].pop()
      else if (drag.src.startsWith('t'))
        next.tableau[Number(drag.src.slice(1))].splice(drag.index, moving.length)

      next.moves = s.moves + 1
      sound.click(0.95)
      return next
    })
  }

  const { drag, start } = useCardDrag(onDrop)

  const sendHome = (src: string, index: number) => {
    setG((s) => {
      const pile =
        src.startsWith('t') ? s.tableau[Number(src.slice(1))] : src.startsWith('c') ? [] : []
      const card = src.startsWith('c') ? s.free[Number(src.slice(1))] : pile[index]
      if (!card) return s
      if (src.startsWith('t') && index !== pile.length - 1) return s
      const fi = s.foundations.findIndex((f) => canFoundation(f, card))
      if (fi < 0) return s
      const next: Game = {
        ...s,
        free: s.free.slice(),
        foundations: s.foundations.map((f) => f.slice()),
        tableau: s.tableau.map((t) => t.slice()),
      }
      next.foundations[fi].push(card)
      if (src.startsWith('c')) next.free[Number(src.slice(1))] = null
      else next.tableau[Number(src.slice(1))].pop()
      next.moves = s.moves + 1
      sound.click(1.3)
      return next
    })
  }

  const freeCount = g.free.filter((f) => f === null).length

  return (
    <div className="game game--felt">
      <div className="game__bar">
        <button className="game__btn" onClick={() => reset()}>
          New game
        </button>
        <button className="game__btn" onClick={() => reset(g.seed)}>
          Restart deal
        </button>
        <span className="game__spacer" />
        <span className="game__stat">Deal {g.seed}</span>
        <span className="game__stat">Free {freeCount}</span>
        <span className="game__stat">Moves {g.moves}</span>
      </div>

      <div className="game__board">
        <div className="fc__top">
          {g.free.map((c, i) => (
            <div className="fc__cell" key={`c${i}`} data-drop={`c${i}`}>
              {c ? (
                <CardView
                  card={c}
                  className="card--live"
                  onPointerDown={(e) => start(e, [c], `c${i}`, 0)}
                  onDoubleClick={() => sendHome(`c${i}`, 0)}
                />
              ) : (
                <Slot />
              )}
            </div>
          ))}
          <span className="fc__gap" />
          {g.foundations.map((f, i) => (
            <div className="fc__cell" key={`f${i}`} data-drop={`f${i}`}>
              {f.length ? <CardView card={f[f.length - 1]} /> : <Slot label="A" />}
            </div>
          ))}
        </div>

        <div className="fc__tableau">
          {g.tableau.map((pile, ti) => (
            <div className="fc__col" key={ti} data-drop={`t${ti}`} style={{ minHeight: CH }}>
              {pile.length === 0 ? <Slot /> : null}
              {pile.map((c, i) => {
                const run = runLength(pile, i, false)
                const live = i + run === pile.length
                return (
                  <CardView
                    key={c.id}
                    card={c}
                    style={{ top: i * FAN }}
                    className={live ? 'card--live' : ''}
                    onPointerDown={live ? (e) => start(e, pile.slice(i), `t${ti}`, i) : undefined}
                    onDoubleClick={
                      i === pile.length - 1 ? () => sendHome(`t${ti}`, i) : undefined
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {drag ? (
        <div className="game__hand" style={{ left: drag.x - drag.dx, top: drag.y - drag.dy }}>
          {drag.cards.map((c, i) => (
            <CardView key={c.id} card={c} style={{ top: i * FAN }} />
          ))}
        </div>
      ) : null}

      {won ? <WinCascade onDone={() => reset()} /> : null}
    </div>
  )
}
