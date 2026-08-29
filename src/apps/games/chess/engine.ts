/**
 * A complete chess engine: rules, move generation, and an opponent.
 *
 * The board is a 0x88 array — 128 squares, of which the real ones are those
 * where `sq & 0x88` is zero. It costs sixty-four wasted entries and buys the
 * only thing that actually matters here: a square that walks off the edge
 * fails that one test, so no move generator ever needs a file-and-rank
 * boundary check and none of them can be got wrong.
 *
 * Everything in this file is pure. The UI holds a Position and asks for the
 * legal moves; nothing here touches the DOM, which is what makes it possible
 * to check the move generator against published perft counts rather than by
 * playing and hoping.
 */

export type Colour = 'w' | 'b'
export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
/** upper case is white, lower case is black, as in FEN */
export type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

export interface Move {
  from: number
  to: number
  piece: Piece
  captured?: Piece
  promotion?: 'q' | 'r' | 'b' | 'n'
  /** set for the two-square pawn opening, which creates an en-passant square */
  double?: boolean
  enPassant?: boolean
  castle?: 'K' | 'Q'
}

export interface Position {
  board: (Piece | null)[]
  turn: Colour
  /** KQkq, as a set of those letters */
  castling: string
  /** the square a pawn may capture onto, or -1 */
  ep: number
  halfmove: number
  fullmove: number
}

export const colourOf = (p: Piece): Colour => (p === p.toUpperCase() ? 'w' : 'b')
export const kindOf = (p: Piece): PieceKind => p.toLowerCase() as PieceKind
export const onBoard = (sq: number) => (sq & 0x88) === 0
export const fileOf = (sq: number) => sq & 7
export const rankOf = (sq: number) => sq >> 4

/** a1 is 0x00 and h8 is 0x77, so rank 0 is White's back rank */
export const squareName = (sq: number) => 'abcdefgh'[fileOf(sq)] + (rankOf(sq) + 1)

const DIRS: Record<Exclude<PieceKind, 'p'>, number[]> = {
  n: [33, 31, 18, 14, -14, -18, -31, -33],
  b: [17, 15, -15, -17],
  r: [16, 1, -1, -16],
  q: [17, 16, 15, 1, -1, -15, -16, -17],
  k: [17, 16, 15, 1, -1, -15, -16, -17],
}
const SLIDES: PieceKind[] = ['b', 'r', 'q']

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function parseFen(fen: string): Position {
  const [placement, turn, castling, ep, half, full] = fen.trim().split(/\s+/)
  const board: (Piece | null)[] = new Array(128).fill(null)
  let sq = 0x70 // FEN starts at a8
  for (const ch of placement) {
    if (ch === '/') {
      sq -= 0x18 // back to file a, one rank down
    } else if (ch >= '1' && ch <= '8') {
      sq += Number(ch)
    } else {
      board[sq] = ch as Piece
      sq++
    }
  }
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling: castling === '-' ? '' : castling,
    ep: ep && ep !== '-' ? 'abcdefgh'.indexOf(ep[0]) + (Number(ep[1]) - 1) * 16 : -1,
    halfmove: Number(half) || 0,
    fullmove: Number(full) || 1,
  }
}

export function toFen(p: Position): string {
  let placement = ''
  for (let r = 7; r >= 0; r--) {
    let empty = 0
    for (let f = 0; f < 8; f++) {
      const piece = p.board[r * 16 + f]
      if (!piece) { empty++; continue }
      if (empty) { placement += empty; empty = 0 }
      placement += piece
    }
    if (empty) placement += empty
    if (r) placement += '/'
  }
  return [
    placement,
    p.turn,
    p.castling || '-',
    p.ep >= 0 ? squareName(p.ep) : '-',
    p.halfmove,
    p.fullmove,
  ].join(' ')
}

export const startPosition = () => parseFen(START_FEN)

export function findKing(p: Position, colour: Colour): number {
  const target: Piece = colour === 'w' ? 'K' : 'k'
  for (let sq = 0; sq < 128; sq++) {
    if (onBoard(sq) && p.board[sq] === target) return sq
  }
  return -1
}

/**
 * Is `sq` attacked by any piece of `by`? Used for check and for castling.
 *
 * This walks outward from the square rather than scanning every piece on the
 * board. Both answer the same question, but the scan costs 128 squares times
 * eight directions on every single legality check — and legality checking is
 * most of what the search does. Walking out from the square is about thirty
 * lookups, and it took the engine's thinking time from seconds to a fifth of
 * a second.
 */
export function attacked(p: Position, sq: number, by: Colour): boolean {
  if (!onBoard(sq)) return false
  const pawn: Piece = by === 'w' ? 'P' : 'p'
  const knight: Piece = by === 'w' ? 'N' : 'n'
  const king: Piece = by === 'w' ? 'K' : 'k'
  const bishop: Piece = by === 'w' ? 'B' : 'b'
  const rook: Piece = by === 'w' ? 'R' : 'r'
  const queen: Piece = by === 'w' ? 'Q' : 'q'

  /* A white pawn on X attacks X+15 and X+17, so a square is attacked by one
     standing 15 or 17 behind it. */
  const back = by === 'w' ? -16 : 16
  for (const side of [1, -1]) {
    const at = sq + back + side
    if (onBoard(at) && p.board[at] === pawn) return true
  }
  for (const d of DIRS.n) {
    const at = sq + d
    if (onBoard(at) && p.board[at] === knight) return true
  }
  for (const d of DIRS.k) {
    const at = sq + d
    if (onBoard(at) && p.board[at] === king) return true
  }
  // the first piece along each ray is the only one that can be attacking
  for (const d of DIRS.q) {
    let at = sq + d
    while (onBoard(at)) {
      const found = p.board[at]
      if (found) {
        if (found === queen) return true
        const diagonal = d === 17 || d === 15 || d === -15 || d === -17
        if (found === (diagonal ? bishop : rook)) return true
        break
      }
      at += d
    }
  }
  return false
}

export const inCheck = (p: Position, colour: Colour = p.turn) =>
  attacked(p, findKing(p, colour), colour === 'w' ? 'b' : 'w')

/** Every move that follows the movement rules, ignoring whether it leaves the king in check. */
function pseudoLegal(p: Position): Move[] {
  const out: Move[] = []
  const me = p.turn
  const them: Colour = me === 'w' ? 'b' : 'w'

  const push = (m: Move) => {
    // a pawn reaching the last rank must promote, and may promote to four things
    if (kindOf(m.piece) === 'p' && (rankOf(m.to) === 7 || rankOf(m.to) === 0)) {
      for (const promotion of ['q', 'r', 'b', 'n'] as const) out.push({ ...m, promotion })
    } else {
      out.push(m)
    }
  }

  for (let from = 0; from < 128; from++) {
    if (!onBoard(from)) continue
    const piece = p.board[from]
    if (!piece || colourOf(piece) !== me) continue
    const kind = kindOf(piece)

    if (kind === 'p') {
      const dir = me === 'w' ? 16 : -16
      const start = me === 'w' ? 1 : 6
      const one = from + dir
      if (onBoard(one) && !p.board[one]) {
        push({ from, to: one, piece })
        const two = one + dir
        if (rankOf(from) === start && onBoard(two) && !p.board[two]) {
          push({ from, to: two, piece, double: true })
        }
      }
      for (const side of [1, -1]) {
        const to = from + dir + side
        if (!onBoard(to)) continue
        const target = p.board[to]
        if (target && colourOf(target) === them) push({ from, to, piece, captured: target })
        else if (to === p.ep) {
          push({ from, to, piece, enPassant: true, captured: (me === 'w' ? 'p' : 'P') as Piece })
        }
      }
      continue
    }

    const slide = SLIDES.includes(kind)
    for (const d of DIRS[kind as Exclude<PieceKind, 'p'>]) {
      let to = from + d
      while (onBoard(to)) {
        const target = p.board[to]
        if (!target) push({ from, to, piece })
        else {
          if (colourOf(target) === them) push({ from, to, piece, captured: target })
          break
        }
        if (!slide) break
        to += d
      }
    }
  }

  /* Castling. The king may not start in check, pass through an attacked
     square, or land on one — and the squares between must be empty. The
     rook's own square being attacked is famously fine. */
  const kingSq = me === 'w' ? 0x04 : 0x74
  const rights = me === 'w' ? ['K', 'Q'] : ['k', 'q']
  if (p.board[kingSq] === (me === 'w' ? 'K' : 'k') && !attacked(p, kingSq, them)) {
    if (p.castling.includes(rights[0]) && !p.board[kingSq + 1] && !p.board[kingSq + 2] &&
        !attacked(p, kingSq + 1, them) && !attacked(p, kingSq + 2, them)) {
      out.push({ from: kingSq, to: kingSq + 2, piece: p.board[kingSq]!, castle: 'K' })
    }
    if (p.castling.includes(rights[1]) && !p.board[kingSq - 1] && !p.board[kingSq - 2] &&
        !p.board[kingSq - 3] && !attacked(p, kingSq - 1, them) && !attacked(p, kingSq - 2, them)) {
      out.push({ from: kingSq, to: kingSq - 2, piece: p.board[kingSq]!, castle: 'Q' })
    }
  }

  return out
}

const CASTLE_LOSS: Record<number, string> = {
  0x00: 'Q', 0x04: 'KQ', 0x07: 'K',
  0x70: 'q', 0x74: 'kq', 0x77: 'k',
}

export function makeMove(p: Position, m: Move): Position {
  const board = p.board.slice()
  board[m.from] = null
  board[m.to] = m.promotion
    ? ((colourOf(m.piece) === 'w' ? m.promotion.toUpperCase() : m.promotion) as Piece)
    : m.piece

  if (m.enPassant) {
    // the captured pawn is beside the destination, not on it
    board[m.to + (colourOf(m.piece) === 'w' ? -16 : 16)] = null
  }
  if (m.castle) {
    const rank = rankOf(m.from) * 16
    if (m.castle === 'K') { board[rank + 5] = board[rank + 7]; board[rank + 7] = null }
    else { board[rank + 3] = board[rank + 0]; board[rank + 0] = null }
  }

  // moving a king or a rook, or capturing a rook, costs the matching rights
  let castling = p.castling
  for (const sq of [m.from, m.to]) {
    const lost = CASTLE_LOSS[sq]
    if (lost) for (const ch of lost) castling = castling.replace(ch, '')
  }

  return {
    board,
    turn: p.turn === 'w' ? 'b' : 'w',
    castling,
    ep: m.double ? (m.from + m.to) / 2 : -1,
    halfmove: kindOf(m.piece) === 'p' || m.captured ? 0 : p.halfmove + 1,
    fullmove: p.turn === 'b' ? p.fullmove + 1 : p.fullmove,
  }
}

/** The moves that are actually allowed: pseudo-legal, minus those that leave the king attacked. */
export function legalMoves(p: Position): Move[] {
  const me = p.turn
  const them: Colour = me === 'w' ? 'b' : 'w'
  return pseudoLegal(p).filter((m) => {
    const next = makeMove(p, m)
    return !attacked(next, findKing(next, me), them)
  })
}

export function movesFrom(p: Position, from: number): Move[] {
  return legalMoves(p).filter((m) => m.from === from)
}

export type Outcome =
  | { over: false }
  | { over: true; result: '1-0' | '0-1' | '1/2-1/2'; reason: string }

/**
 * Whether the game has ended, and why.
 *
 * `history` is the list of positions that have occurred, as FEN without the
 * clocks, so threefold repetition can be detected. The caller keeps it because
 * repetition is a property of the game, not of the position.
 */
export function outcome(p: Position, history: string[] = []): Outcome {
  if (legalMoves(p).length === 0) {
    if (inCheck(p)) {
      return {
        over: true,
        result: p.turn === 'w' ? '0-1' : '1-0',
        reason: `Checkmate — ${p.turn === 'w' ? 'Black' : 'White'} wins`,
      }
    }
    return { over: true, result: '1/2-1/2', reason: 'Stalemate' }
  }
  if (p.halfmove >= 100) {
    return { over: true, result: '1/2-1/2', reason: 'Fifty-move rule' }
  }
  const key = toFen(p).split(' ').slice(0, 4).join(' ')
  if (history.filter((h) => h === key).length >= 3) {
    return { over: true, result: '1/2-1/2', reason: 'Threefold repetition' }
  }
  if (insufficient(p)) {
    return { over: true, result: '1/2-1/2', reason: 'Insufficient material' }
  }
  return { over: false }
}

/** King versus king, king and a minor, or two same-coloured bishops. */
function insufficient(p: Position): boolean {
  const minors: { kind: PieceKind; light: boolean }[] = []
  for (let sq = 0; sq < 128; sq++) {
    if (!onBoard(sq)) continue
    const piece = p.board[sq]
    if (!piece) continue
    const kind = kindOf(piece)
    if (kind === 'k') continue
    if (kind === 'p' || kind === 'r' || kind === 'q') return false
    minors.push({ kind, light: (fileOf(sq) + rankOf(sq)) % 2 === 1 })
  }
  if (minors.length <= 1) return true
  if (minors.length === 2 && minors.every((m) => m.kind === 'b')) {
    return minors[0].light === minors[1].light
  }
  return false
}

/* ------------------------------------------------------------------ *
 * Notation
 * ------------------------------------------------------------------ */

export function toSan(p: Position, m: Move): string {
  if (m.castle) return m.castle === 'K' ? 'O-O' : 'O-O-O'
  const kind = kindOf(m.piece)
  const target = squareName(m.to)
  let san = ''

  if (kind === 'p') {
    san = m.captured ? `${'abcdefgh'[fileOf(m.from)]}x${target}` : target
  } else {
    /* Disambiguate only as far as needed: by file if that is enough, then by
       rank, then by the whole square. */
    const rivals = legalMoves(p).filter(
      (o) => o.to === m.to && o.piece === m.piece && o.from !== m.from,
    )
    let hint = ''
    if (rivals.length) {
      const sameFile = rivals.some((o) => fileOf(o.from) === fileOf(m.from))
      const sameRank = rivals.some((o) => rankOf(o.from) === rankOf(m.from))
      if (!sameFile) hint = 'abcdefgh'[fileOf(m.from)]
      else if (!sameRank) hint = String(rankOf(m.from) + 1)
      else hint = squareName(m.from)
    }
    san = kind.toUpperCase() + hint + (m.captured ? 'x' : '') + target
  }

  if (m.promotion) san += '=' + m.promotion.toUpperCase()

  const next = makeMove(p, m)
  if (inCheck(next)) san += legalMoves(next).length ? '+' : '#'
  return san
}

/* ------------------------------------------------------------------ *
 * The opponent
 * ------------------------------------------------------------------ */

const VALUE: Record<PieceKind, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

/* Piece-square tables, from White's point of view and read from a1. They are
   the cheapest way to give a material-only engine any positional sense at
   all: knights toward the middle, pawns forward, the king tucked away. */
const PST: Record<PieceKind, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10,-20,-20, 10, 10,  5,
     5, -5,-10,  0,  0,-10, -5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5,  5, 10, 25, 25, 10,  5,  5,
    10, 10, 20, 30, 30, 20, 10, 10,
    50, 50, 50, 50, 50, 50, 50, 50,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  5, 10, 10,  5,  0,  0,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     5, 10, 10, 10, 10, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -10,  5,  5,  5,  5,  5,  0,-10,
      0,  0,  5,  5,  5,  5,  0, -5,
     -5,  0,  5,  5,  5,  5,  0, -5,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
     20, 30, 10,  0,  0, 10, 30, 20,
     20, 20,  0,  0,  0,  0, 20, 20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
  ],
}

/** Centipawns, from White's point of view. */
export function evaluate(p: Position): number {
  let score = 0
  for (let sq = 0; sq < 128; sq++) {
    if (!onBoard(sq)) continue
    const piece = p.board[sq]
    if (!piece) continue
    const kind = kindOf(piece)
    const white = colourOf(piece) === 'w'
    const index = white ? rankOf(sq) * 8 + fileOf(sq) : (7 - rankOf(sq)) * 8 + fileOf(sq)
    const value = VALUE[kind] + PST[kind][index]
    score += white ? value : -value
  }
  return score
}

const MATE = 100000

/** Captures first, best capture first: the single biggest win for alpha-beta. */
function ordered(moves: Move[]): Move[] {
  return moves
    .map((m) => ({
      m,
      k: m.captured ? 10 * VALUE[kindOf(m.captured)] - VALUE[kindOf(m.piece)] : m.promotion ? 800 : 0,
    }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.m)
}

/* The search is bounded by a clock, not by a depth. A fixed depth is fast in
   the opening and unbearable in a sharp middlegame — the same three ply that
   took under a second from the start position took eleven seconds once the
   board opened up, and the window is frozen for every one of them. So: search
   depth one, then two, then three, keeping the best move from the last depth
   that *finished*, and stop when the time is up. The move is always from a
   completed search, and the wait is always the same length. */
let deadline = 0
let aborted = false
let nodes = 0

function outOfTime(): boolean {
  if (aborted) return true
  // checking the clock every node costs more than the search does
  if ((nodes++ & 1023) === 0 && performance.now() > deadline) aborted = true
  return aborted
}

/** Search captures only, so the search never stops in the middle of a trade. */
function quiesce(p: Position, alpha: number, beta: number, sign: number, depth: number): number {
  const stand = sign * evaluate(p)
  if (depth <= 0 || outOfTime()) return stand
  if (stand >= beta) return beta
  if (stand > alpha) alpha = stand
  for (const m of ordered(legalMoves(p).filter((x) => x.captured || x.promotion))) {
    const score = -quiesce(makeMove(p, m), -beta, -alpha, -sign, depth - 1)
    if (outOfTime()) return alpha
    if (score >= beta) return beta
    if (score > alpha) alpha = score
  }
  return alpha
}

function search(p: Position, depth: number, alpha: number, beta: number, sign: number): number {
  if (outOfTime()) return sign * evaluate(p)
  const moves = legalMoves(p)
  if (!moves.length) return inCheck(p) ? -MATE - depth : 0
  if (depth === 0) return quiesce(p, alpha, beta, sign, 4)
  for (const m of ordered(moves)) {
    const score = -search(makeMove(p, m), depth - 1, -beta, -alpha, -sign)
    if (outOfTime()) return alpha
    if (score >= beta) return beta
    if (score > alpha) alpha = score
  }
  return alpha
}

/** milliseconds of thinking, and the depth it will not search past */
/* The search blocks the main thread while it runs, so these are also how long
   the window is frozen for. A second and a half was noticeable; this is not. */
const BUDGET = [0, 90, 300, 850]
const CEILING = [0, 2, 4, 6]

/**
 * Pick a move. `skill` is 0-3: the lowest plays whatever comes to hand, and
 * the highest thinks for about a second and a half.
 */
export function chooseMove(p: Position, skill: number): Move | null {
  const moves = legalMoves(p)
  if (!moves.length) return null
  if (skill <= 0) return moves[Math.floor(Math.random() * moves.length)]

  const lv = Math.min(skill, 3)
  const sign = p.turn === 'w' ? 1 : -1
  deadline = performance.now() + BUDGET[lv]
  aborted = false
  nodes = 0

  let settled: Move[] = [moves[0]]
  for (let depth = 1; depth <= CEILING[lv]; depth++) {
    let best: Move[] = []
    let bestScore = -Infinity
    for (const m of ordered(moves)) {
      const score = -search(makeMove(p, m), depth - 1, -Infinity, Infinity, -sign)
      if (aborted) break
      if (score > bestScore) { bestScore = score; best = [m] }
      else if (score === bestScore) best.push(m)
    }
    // an unfinished depth is thrown away: half a search is worse than none
    if (aborted || !best.length) break
    settled = best
  }
  // choose among equals at random, so it does not play the same game twice
  return settled[Math.floor(Math.random() * settled.length)]
}

/**
 * Count the leaves of the move tree to a given depth.
 *
 * This exists to be checked against published numbers. Move generators are
 * easy to get subtly wrong — a missing en-passant pin, a castle through
 * check — and perft is the only way to find that out short of losing a game
 * to it.
 */
export function perft(p: Position, depth: number): number {
  if (depth === 0) return 1
  const moves = legalMoves(p)
  if (depth === 1) return moves.length
  let n = 0
  for (const m of moves) n += perft(makeMove(p, m), depth - 1)
  return n
}
