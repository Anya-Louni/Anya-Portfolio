import { useEffect, useState } from 'react'
import { makeDeck, mulberry32, newSeed, shuffle, type Card, type Suit } from '../../games/deck'
import { CardView, Slot } from '../../games/CardView'
import { useFit } from '../../games/fit'
import { useCardDrag, type DragState } from '../../games/useCardDrag'
import { WinCascade } from '../../games/WinCascade'
import { sound } from '../../os/sound'
import { prize } from '../../os/prize'


type Difficulty = 1 | 2 | 4

interface Game {
  tableau: Card[][]
  stock: Card[][]
  done: number
  seed: number
  suits: Difficulty
  moves: number
}

const SUIT_SETS: Record<Difficulty, Suit[]> = {
  1: ['S'],
  2: ['S', 'H'],
  4: ['S', 'H', 'D', 'C'],
}

function deal(seed: number, suits: Difficulty): Game {
  const set = SUIT_SETS[suits]
  const copies = 8 / set.length
  const cards = shuffle(makeDeck(copies, set), mulberry32(seed))
  const tableau: Card[][] = []
  let k = 0
  for (let col = 0; col < 10; col++) {
    const n = col < 4 ? 6 : 5
    const pile: Card[] = []
    for (let i = 0; i < n; i++) {
      pile.push({ ...cards[k++], faceUp: i === n - 1 })
    }
    tableau.push(pile)
  }
  const stock: Card[][] = []
  while (k < cards.length) {
    stock.push(cards.slice(k, k + 10).map((c) => ({ ...c, faceUp: false })))
    k += 10
  }
  return { tableau, stock, done: 0, seed, suits, moves: 0 }
}

/** how many cards from `i` form a descending same-suit run */
function grabbable(pile: Card[], i: number) {
  if (!pile[i]?.faceUp) return 0
  let n = 1
  for (let j = i; j < pile.length - 1; j++) {
    const a = pile[j]
    const b = pile[j + 1]
    if (!b.faceUp || a.suit !== b.suit || a.rank !== b.rank + 1) return n
    n++
  }
  return n
}

export default function Spider() {
  const [board, fit] = useFit(10, 8)
  const [g, setG] = useState<Game>(() => deal(newSeed(), 1))
  const [won, setWon] = useState(false)

  useEffect(() => {
    if (g.done === 8 && !won) {
      setWon(true)
      sound.chime()
      prize(`spider-${g.seed}`, { 1: 200, 2: 480, 4: 1100 }[g.suits], `Spider, ${g.suits} suit${g.suits > 1 ? 's' : ''}`)
    }
  }, [g.done, won, g.seed, g.suits])

  const reset = (suits: Difficulty = g.suits, seed = newSeed()) => {
    setG(deal(seed, suits))
    setWon(false)
    sound.click(1.1)
  }

  /** pull completed King-to-Ace suits off the board */
  const harvest = (t: Card[][]) => {
    let found = 0
    for (const pile of t) {
      if (pile.length < 13) continue
      const tail = pile.slice(-13)
      const ok =
        tail.every((c) => c.faceUp) &&
        tail.every((c, i) => c.suit === tail[0].suit && c.rank === 13 - i)
      if (ok) {
        pile.splice(pile.length - 13, 13)
        if (pile.length && !pile[pile.length - 1].faceUp) {
          pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true }
        }
        found++
      }
    }
    return found
  }

  const onDrop = (drag: DragState, target: string | null) => {
    if (!target || target === drag.src || !target.startsWith('t')) return
    setG((s) => {
      const ti = Number(target.slice(1))
      const dest = s.tableau[ti]
      const head = drag.cards[0]
      const ok = dest.length === 0 || dest[dest.length - 1].rank === head.rank + 1
      if (!ok) return s
      const tableau = s.tableau.map((p) => p.slice())
      tableau[ti].push(...drag.cards)
      const si = Number(drag.src.slice(1))
      tableau[si].splice(drag.index, drag.cards.length)
      const rest = tableau[si]
      if (rest.length && !rest[rest.length - 1].faceUp) {
        rest[rest.length - 1] = { ...rest[rest.length - 1], faceUp: true }
      }
      const got = harvest(tableau)
      if (got) sound.chime()
      else sound.click(0.95)
      return { ...s, tableau, done: s.done + got, moves: s.moves + 1 }
    })
  }

  const { drag, start } = useCardDrag(onDrop)

  const dealRow = () => {
    setG((s) => {
      if (!s.stock.length) return s
      if (s.tableau.some((p) => p.length === 0)) return s
      const [row, ...rest] = s.stock
      const tableau = s.tableau.map((p, i) => [...p, { ...row[i], faceUp: true }])
      const got = harvest(tableau)
      sound.click(1.2)
      return { ...s, tableau, stock: rest, done: s.done + got, moves: s.moves + 1 }
    })
  }

  const blocked = g.tableau.some((p) => p.length === 0)

  return (
    <div className="game game--felt" style={fit.style}>
      <div className="game__bar">
        <button className="game__btn" onClick={() => reset()}>
          New game
        </button>
        <button className="game__btn" onClick={() => reset(g.suits, g.seed)}>
          Restart deal
        </button>
        <span className="game__group">
          {([1, 2, 4] as Difficulty[]).map((n) => (
            <button
              key={n}
              className="game__btn"
              data-on={g.suits === n}
              onClick={() => reset(n)}
            >
              {n} suit{n > 1 ? 's' : ''}
            </button>
          ))}
        </span>
        <span className="game__spacer" />
        <span className="game__stat">Suits done {g.done}/8</span>
        <span className="game__stat">Moves {g.moves}</span>
      </div>

      <div className="game__board" ref={board}>
        <div className="sp__tableau">
          {g.tableau.map((pile, ti) => {
            let y = 0
            return (
              <div className="sp__col" key={ti} data-drop={`t${ti}`} style={{ minHeight: fit.ch }}>
                {pile.length === 0 ? <Slot /> : null}
                {pile.map((c, i) => {
                  const top = y
                  y += c.faceUp ? fit.fanUp : fit.fanDown
                  const run = grabbable(pile, i)
                  const live = run > 0 && i + run === pile.length
                  return (
                    <CardView
                      key={c.id}
                      card={c}
                      style={{ top }}
                      className={live ? 'card--live' : ''}
                      onPointerDown={live ? (e) => start(e, pile.slice(i), `t${ti}`, i) : undefined}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="sp__stock">
          {g.stock.map((_, i) => (
            <button
              key={i}
              className="sp__stockCard"
              style={{ right: i * 12 }}
              onClick={dealRow}
              disabled={blocked}
              aria-label="Deal a row"
              title={blocked ? 'Every column must have a card first' : 'Deal a row'}
            />
          ))}
          {g.stock.length === 0 ? <span className="sp__stockEmpty">stock empty</span> : null}
        </div>
      </div>

      {drag ? (
        <div className="game__hand" style={{ left: drag.x - drag.dx, top: drag.y - drag.dy }}>
          {drag.cards.map((c, i) => (
            <CardView key={c.id} card={c} style={{ top: i * fit.fanUp }} />
          ))}
        </div>
      ) : null}

      {won ? <WinCascade onDone={() => reset()} /> : null}
    </div>
  )
}
