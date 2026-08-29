/**
 * Chess.
 *
 * All the rules live in ./engine, which is pure and has been checked against
 * published perft counts for the five standard test positions, castling
 * through check, en-passant pins, promotion, the lot. This file is only the
 * board: what is selected, what is legal from here, and whose turn it is.
 *
 * The opponent runs on a timeout rather than inline, so a search that takes
 * half a second does not freeze the window while it thinks.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  chooseMove, colourOf, inCheck, legalMoves, makeMove, outcome, squareName, startPosition,
  toFen, toSan,
  type Colour, type Move, type Piece, type Position,
} from './engine'
import { ChessPiece } from './Pieces'
import { prize } from '../../../os/prize'
import { sound } from '../../../os/sound'

const LEVELS = [
  { id: 0, name: 'Drifting', note: 'Plays whatever comes to hand' },
  { id: 1, name: 'Casual', note: 'Sees one move ahead' },
  { id: 2, name: 'Careful', note: 'Sees the reply to the reply' },
  { id: 3, name: 'Sharp', note: 'Searches, and finishes trades' },
]
const PURSE = [0, 120, 400, 1200]

interface Snapshot {
  pos: Position
  san: string
}

export default function Chess() {
  const [pos, setPos] = useState<Position>(startPosition)
  const [past, setPast] = useState<Snapshot[]>([])
  const [side, setSide] = useState<Colour>('w')
  const [level, setLevel] = useState(2)
  const [from, setFrom] = useState<number | null>(null)
  const [pending, setPending] = useState<Move[] | null>(null)
  const [thinking, setThinking] = useState(false)
  const [last, setLast] = useState<Move | null>(null)
  const [gameId, setGameId] = useState(0)

  /* Repetition is a property of the game rather than of the position, so the
     board cannot work it out alone, the list of positions seen so far comes
     from here. */
  const history = useMemo(
    () => [...past.map((s) => s.pos), pos].map((p) => toFen(p).split(' ').slice(0, 4).join(' ')),
    [past, pos],
  )
  const result = useMemo(() => outcome(pos, history), [pos, history])
  const legal = useMemo(() => legalMoves(pos), [pos])
  const myTurn = pos.turn === side && !result.over && !pending

  const options = useMemo(
    () => (from === null ? [] : legal.filter((m) => m.from === from)),
    [legal, from],
  )

  const play = useCallback((m: Move) => {
    setPast((h) => [...h, { pos, san: toSan(pos, m) }])
    setPos(makeMove(pos, m))
    setLast(m)
    setFrom(null)
    sound.click(m.captured ? 1.3 : 0.9)
  }, [pos])

  /* ---------------- the opponent ---------------- */
  const posRef = useRef(pos)
  posRef.current = pos

  useEffect(() => {
    if (result.over || pos.turn === side || pending) return
    setThinking(true)
    /* Two frames of delay before the search, so React has painted the human's
       move before the main thread goes away to think about the reply. */
    const id = window.setTimeout(() => {
      const p = posRef.current
      const m = chooseMove(p, level)
      setThinking(false)
      if (!m) return
      setPast((h) => [...h, { pos: p, san: toSan(p, m) }])
      setPos(makeMove(p, m))
      setLast(m)
      sound.click(m.captured ? 1.3 : 0.9)
    }, 260)
    return () => { window.clearTimeout(id); setThinking(false) }
  }, [pos, side, level, result.over, pending])

  /* ---------------- the prize ---------------- */
  useEffect(() => {
    if (!result.over) return
    const won = (result.result === '1-0' && side === 'w') || (result.result === '0-1' && side === 'b')
    if (won) prize(`chess-${gameId}`, PURSE[level], `Chess, ${LEVELS[level].name}`)
    else if (result.result === '1/2-1/2') prize(`chess-${gameId}`, Math.round(PURSE[level] / 4), 'Chess, drawn')
  }, [result, side, level, gameId])

  /* ---------------- input ---------------- */
  const clickSquare = (sq: number) => {
    if (!myTurn) return
    const here = pos.board[sq]

    if (from !== null) {
      const picks = options.filter((m) => m.to === sq)
      if (picks.length > 1) { setPending(picks); return } // a promotion: ask which piece
      if (picks.length === 1) { play(picks[0]); return }
    }
    if (here && colourOf(here) === pos.turn) setFrom(sq === from ? null : sq)
    else setFrom(null)
  }

  const newGame = (asSide: Colour = side, lv = level) => {
    setPos(startPosition())
    setPast([])
    setFrom(null)
    setLast(null)
    setPending(null)
    setSide(asSide)
    setLevel(lv)
    setGameId((n) => n + 1)
    sound.click(1.1)
  }

  const undo = () => {
    if (!past.length) return
    /* Step back past the engine's reply as well, so undo returns the board to
       the player rather than handing them a position it is about to move in. */
    const back = past.length >= 2 && past[past.length - 1].pos.turn !== side ? 2 : 1
    const target = past[past.length - back]
    setPos(target.pos)
    setPast(past.slice(0, past.length - back))
    setFrom(null)
    setLast(null)
  }

  /* ---------------- board ---------------- */
  const files = side === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
  const ranks = side === 'w' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]
  const checkSq = inCheck(pos) ? findKingSq(pos, pos.turn) : -1

  const taken = useMemo(() => {
    const gone: Piece[] = []
    for (const s of past) {
      const m = legalMovesCaptured(s)
      if (m) gone.push(m)
    }
    return gone
  }, [past])

  const pairs = useMemo(() => {
    const rows: { n: number; w?: string; b?: string }[] = []
    past.forEach((s, i) => {
      const n = Math.floor(i / 2) + 1
      if (i % 2 === 0) rows.push({ n, w: s.san })
      else rows[rows.length - 1].b = s.san
    })
    return rows
  }, [past])

  return (
    <div className="chess">
      <div className="chess__bar">
        <button className="chess__go" onClick={() => newGame()}>New game</button>
        <button className="chess__btn" onClick={undo} disabled={!past.length || thinking}>Undo</button>
        <button
          className="chess__btn"
          onClick={() => newGame(side === 'w' ? 'b' : 'w')}
          title="Start again on the other side"
        >
          Play {side === 'w' ? 'black' : 'white'}
        </button>
        <div className="chess__levels">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              className="chess__level"
              data-on={level === l.id}
              title={l.note}
              onClick={() => setLevel(l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      <div className="chess__body">
        <div className="chess__boardWrap">
          <div className="chess__board" data-flipped={side === 'b'}>
            {ranks.map((r) =>
              files.map((f) => {
                const sq = r * 16 + f
                const piece = pos.board[sq]
                const option = options.find((m) => m.to === sq)
                const light = (f + r) % 2 === 1
                return (
                  <button
                    key={sq}
                    className="chess__sq"
                    data-light={light}
                    data-sel={from === sq}
                    data-from={last?.from === sq}
                    data-to={last?.to === sq}
                    data-check={checkSq === sq}
                    onClick={() => clickSquare(sq)}
                    aria-label={squareName(sq) + (piece ? ` ${piece}` : '')}
                  >
                    {piece ? <ChessPiece piece={piece} /> : null}
                    {option ? <span className="chess__dot" data-take={!!option.captured} /> : null}
                    {f === (side === 'w' ? 0 : 7) ? <i className="chess__rank">{r + 1}</i> : null}
                    {r === (side === 'w' ? 0 : 7) ? <i className="chess__file">{'abcdefgh'[f]}</i> : null}
                  </button>
                )
              }),
            )}
          </div>

          {pending ? (
            <div className="chess__promo">
              <p>Promote to</p>
              <div>
                {pending.map((m) => (
                  <button key={m.promotion} onClick={() => { setPending(null); play(m) }}>
                    <ChessPiece
                      piece={(side === 'w' ? m.promotion!.toUpperCase() : m.promotion!) as Piece}
                      size={40}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="chess__side">
          <p className="chess__turn" data-over={result.over}>
            {result.over
              ? result.reason
              : thinking
                ? 'Thinking…'
                : `${pos.turn === 'w' ? 'White' : 'Black'} to move${inCheck(pos) ? ' · check' : ''}`}
          </p>

          <div className="chess__taken">
            {taken.map((p, i) => (
              <ChessPiece key={i} piece={p} size={20} />
            ))}
          </div>

          <ol className="chess__moves">
            {pairs.map((row) => (
              <li key={row.n}>
                <b>{row.n}.</b>
                <span>{row.w}</span>
                <span>{row.b ?? ''}</span>
              </li>
            ))}
          </ol>

          <p className="chess__fen" title="The position, in Forsyth–Edwards notation">
            {toFen(pos)}
          </p>
        </aside>
      </div>
    </div>
  )
}

/* Small helpers kept out of the component, so it re-reads cleanly. */

function findKingSq(p: Position, colour: Colour): number {
  const want = colour === 'w' ? 'K' : 'k'
  for (let sq = 0; sq < 128; sq++) if ((sq & 0x88) === 0 && p.board[sq] === want) return sq
  return -1
}

/** What a recorded half-move captured, worked back out of its notation. */
function legalMovesCaptured(s: Snapshot): Piece | null {
  if (!s.san.includes('x')) return null
  const target = s.san.replace(/[+#]/, '').slice(-2)
  const f = 'abcdefgh'.indexOf(target[0])
  const r = Number(target[1]) - 1
  if (f < 0 || r < 0) return null
  const sq = r * 16 + f
  const piece = s.pos.board[sq]
  // an en-passant capture takes a pawn that is not on the destination square
  if (!piece) return s.pos.turn === 'w' ? 'p' : 'P'
  return piece
}
