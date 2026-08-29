import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useFit } from '../../games/fit'
import { useCardDrag, type DragState } from '../../games/useCardDrag'
import { WinCascade } from '../../games/WinCascade'
import { sound } from '../../os/sound'
import { prize } from '../../os/prize'


interface Game {
  stock: Card[]
  waste: Card[]
  foundations: Card[][]
  tableau: Card[][]
  seed: number
  draw: 1 | 3
  moves: number
}

function deal(seed: number, draw: 1 | 3): Game {
  const cards = shuffle(makeDeck(1), mulberry32(seed))
  const tableau: Card[][] = []
  let k = 0
  for (let col = 0; col < 7; col++) {
    const pile: Card[] = []
    for (let i = 0; i <= col; i++) {
      const c = { ...cards[k++] }
      c.faceUp = i === col
      pile.push(c)
    }
    tableau.push(pile)
  }
  return {
    stock: cards.slice(k).map((c) => ({ ...c, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    seed,
    draw,
    moves: 0,
  }
}

const canFoundation = (pile: Card[], card: Card) =>
  pile.length === 0 ? card.rank === 1 : pile[pile.length - 1].suit === card.suit && pile[pile.length - 1].rank === card.rank - 1

const canTableau = (pile: Card[], card: Card) =>
  pile.length === 0 ? card.rank === 13 : stacksAlternating(pile[pile.length - 1], card)

export default function Klondike() {
  const [board, fit] = useFit(7, 12)
  const [g, setG] = useState<Game>(() => deal(newSeed(), 1))
  const [ticks, setTicks] = useState(0)
  const [won, setWon] = useState(false)

  const score = useMemo(() => g.foundations.reduce((n, f) => n + f.length, 0), [g.foundations])

  useEffect(() => {
    if (won) return
    const id = setInterval(() => setTicks((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [won])

  useEffect(() => {
    if (score === 52 && !won) {
      setWon(true)
      sound.chime()
      // draw three is the harder deal, so it pays better
      prize(`klondike-${g.seed}`, g.draw === 3 ? 220 : 140, `Solitaire, draw ${g.draw}`)
    }
  }, [score, won, g.seed, g.draw])

  const reset = (draw: 1 | 3 = g.draw, seed = newSeed()) => {
    setG(deal(seed, draw))
    setTicks(0)
    setWon(false)
    sound.click(1.1)
  }

  /* ---------------- moves ---------------- */

  const flipStock = () => {
    setG((s) => {
      if (!s.stock.length) {
        if (!s.waste.length) return s
        sound.click(0.8)
        return { ...s, stock: s.waste.slice().reverse().map((c) => ({ ...c, faceUp: false })), waste: [], moves: s.moves + 1 }
      }
      const n = Math.min(s.draw, s.stock.length)
      const taken = s.stock.slice(s.stock.length - n).map((c) => ({ ...c, faceUp: true }))
      sound.click(1.2)
      return {
        ...s,
        stock: s.stock.slice(0, s.stock.length - n),
        waste: [...s.waste, ...taken],
        moves: s.moves + 1,
      }
    })
  }

  const applyMove = useCallback((drag: DragState, target: string | null) => {
    if (!target || target === drag.src) return
    setG((s) => {
      const next: Game = {
        ...s,
        waste: s.waste.slice(),
        foundations: s.foundations.map((f) => f.slice()),
        tableau: s.tableau.map((t) => t.slice()),
      }
      const moving = drag.cards

      // validate destination
      if (target.startsWith('f')) {
        if (moving.length !== 1) return s
        const fi = Number(target.slice(1))
        if (!canFoundation(next.foundations[fi], moving[0])) return s
        next.foundations[fi].push(moving[0])
      } else if (target.startsWith('t')) {
        const ti = Number(target.slice(1))
        if (!canTableau(next.tableau[ti], moving[0])) return s
        next.tableau[ti].push(...moving)
      } else return s

      // remove from source
      if (drag.src === 'waste') next.waste.splice(drag.index, moving.length)
      else if (drag.src.startsWith('t')) {
        const si = Number(drag.src.slice(1))
        next.tableau[si].splice(drag.index, moving.length)
        const rest = next.tableau[si]
        if (rest.length && !rest[rest.length - 1].faceUp) {
          rest[rest.length - 1] = { ...rest[rest.length - 1], faceUp: true }
        }
      } else if (drag.src.startsWith('f')) {
        next.foundations[Number(drag.src.slice(1))].pop()
      }

      next.moves = s.moves + 1
      sound.click(0.95)
      return next
    })
  }, [])

  const { drag, start } = useCardDrag(applyMove)

  /** double-click sends a card home if it will go */
  const sendHome = (src: string, index: number) => {
    setG((s) => {
      const pile =
        src === 'waste' ? s.waste : src.startsWith('t') ? s.tableau[Number(src.slice(1))] : null
      if (!pile || index !== pile.length - 1) return s
      const card = pile[index]
      const fi = s.foundations.findIndex((f) => canFoundation(f, card))
      if (fi < 0) return s
      const next: Game = {
        ...s,
        waste: s.waste.slice(),
        foundations: s.foundations.map((f) => f.slice()),
        tableau: s.tableau.map((t) => t.slice()),
      }
      next.foundations[fi].push(card)
      if (src === 'waste') next.waste.pop()
      else {
        const ti = Number(src.slice(1))
        next.tableau[ti].pop()
        const rest = next.tableau[ti]
        if (rest.length && !rest[rest.length - 1].faceUp) {
          rest[rest.length - 1] = { ...rest[rest.length - 1], faceUp: true }
        }
      }
      next.moves = s.moves + 1
      sound.click(1.3)
      return next
    })
  }

  const canAuto =
    !won && g.tableau.every((p) => p.every((c) => c.faceUp)) && score < 52

  const autoFinish = () => {
    setG((s) => {
      const next: Game = {
        ...s,
        waste: s.waste.slice(),
        stock: s.stock.slice(),
        foundations: s.foundations.map((f) => f.slice()),
        tableau: s.tableau.map((t) => t.slice()),
      }
      let progress = true
      while (progress) {
        progress = false
        const sources: { pile: Card[]; kind: 'w' | 't' }[] = [
          { pile: next.waste, kind: 'w' },
          ...next.tableau.map((p) => ({ pile: p, kind: 't' as const })),
        ]
        for (const { pile } of sources) {
          if (!pile.length) continue
          const card = pile[pile.length - 1]
          const fi = next.foundations.findIndex((f) => canFoundation(f, card))
          if (fi >= 0) {
            next.foundations[fi].push(pile.pop()!)
            progress = true
          }
        }
      }
      return next
    })
  }

  const time = `${Math.floor(ticks / 60)}:${String(ticks % 60).padStart(2, '0')}`

  return (
    <div className="game game--felt" style={fit.style}>
      <div className="game__bar">
        <button className="game__btn" onClick={() => reset()}>
          New game
        </button>
        <button className="game__btn" onClick={() => reset(g.draw, g.seed)}>
          Restart deal
        </button>
        <label className="game__opt">
          <input
            type="checkbox"
            id="kd-draw3"
            checked={g.draw === 3}
            onChange={(e) => reset(e.target.checked ? 3 : 1)}
          />
          <label htmlFor="kd-draw3">Draw three</label>
        </label>
        {canAuto ? (
          <button className="game__btn game__btn--go" onClick={autoFinish}>
            Finish
          </button>
        ) : null}
        <span className="game__spacer" />
        <span className="game__stat">Deal {g.seed}</span>
        <span className="game__stat">Moves {g.moves}</span>
        <span className="game__stat">{time}</span>
      </div>

      <div className="game__board" ref={board}>
        {/* stock + waste */}
        <div className="kd__top">
          <div className="kd__stock" onClick={flipStock} data-drop="stock">
            {g.stock.length ? (
              <CardView card={{ ...g.stock[g.stock.length - 1], faceUp: false }} />
            ) : (
              <Slot label="↻" />
            )}
          </div>

          <div className="kd__waste">
            {g.waste.slice(-3).map((c, i, arr) => {
              const abs = g.waste.length - arr.length + i
              const top = abs === g.waste.length - 1
              return (
                <CardView
                  key={c.id}
                  card={c}
                  style={{ left: i * fit.spread }}
                  className={top ? 'card--live' : ''}
                  onPointerDown={top ? (e) => start(e, [c], 'waste', abs) : undefined}
                  onDoubleClick={top ? () => sendHome('waste', abs) : undefined}
                />
              )
            })}
            {!g.waste.length ? <Slot /> : null}
          </div>

          <span className="kd__gap" />

          {g.foundations.map((f, i) => (
            <div className="kd__foundation" key={i} data-drop={`f${i}`}>
              {f.length ? (
                <CardView
                  card={f[f.length - 1]}
                  className="card--live"
                  onPointerDown={(e) => start(e, [f[f.length - 1]], `f${i}`, f.length - 1)}
                />
              ) : (
                <Slot label="A" />
              )}
            </div>
          ))}
        </div>

        {/* tableau */}
        <div className="kd__tableau">
          {g.tableau.map((pile, ti) => {
            let y = 0
            return (
              <div className="kd__col" key={ti} data-drop={`t${ti}`} style={{ minHeight: fit.ch }}>
                {pile.length === 0 ? <Slot label="K" /> : null}
                {pile.map((c, i) => {
                  const top = y
                  y += c.faceUp ? fit.fanUp : fit.fanDown
                  const run = c.faceUp ? runLength(pile, i, false) : 0
                  const grabbable = c.faceUp && i + run === pile.length
                  return (
                    <CardView
                      key={c.id}
                      card={c}
                      style={{ top }}
                      className={grabbable ? 'card--live' : ''}
                      onPointerDown={
                        grabbable ? (e) => start(e, pile.slice(i), `t${ti}`, i) : undefined
                      }
                      onDoubleClick={
                        i === pile.length - 1 ? () => sendHome(`t${ti}`, i) : undefined
                      }
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* the stack in hand */}
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
