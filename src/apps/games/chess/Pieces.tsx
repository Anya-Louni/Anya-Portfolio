/**
 * The pieces, as glass.
 *
 * Staunton silhouettes drawn on a 45-unit grid — the same grid the standard
 * open-source chess sets use, so the proportions are the ones the eye
 * expects. What is not standard is the finish: each piece is a body gradient
 * with a specular sweep down one side and a rim in a darker version of its
 * own colour, which is the Aero treatment applied to a chess set rather than
 * to a button.
 */
import type { Piece } from './engine'

const PATHS: Record<string, string> = {
  // king
  k: 'M22.5 11.63V6M20 8h5M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7Z',
  // queen
  q: 'M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14L7 14l2 12ZM9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0Z',
  // rook
  r: 'M9 39h27v-3H9v3ZM12 36v-4h21v4H12ZM11 14V9h4v2h5V9h5v2h5V9h4v5M34 14l-3 3H14l-3-3M31 17v12.5H14V17M31 29.5l1.5 2.5h-20l1.5-2.5M11 14h23',
  // bishop
  b: 'M9 36c3.4-1 10.1 .4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6 .5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1 .5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4 .5-2.3 .5-3-.5 1.4-2 3-2 3-2ZM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5 .5 0 2ZM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0ZM17.5 26h10M15 30h15M22.5 15.5v5M20 18h5',
  // knight
  n: 'M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21M24 18c.4 2.4-4.6 8.4-8 10-3.4 1.6-5 5-5 5-1 2-3 3-3 3-1 1-.5 2.5-.5 2.5-1 1.5 0 3 0 3 1.5 3 6 2 6 2 3.5 0 8-1 8-1 2-1 2-4 2-4 0-3-2-4-2-4-2-1-4 1-4 1-2 1-1 3-1 3 1 2 3 1 3 1 1.5 0 2-1 2-1',
  // pawn
  p: 'M22.5 9c-2.21 0-4 1.79-4 4 0 .89 .29 1.71 .78 2.38C17.33 16.5 16 18.59 16 21c0 2.03 .94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62 .49-.67 .78-1.49 .78-2.38 0-2.21-1.79-4-4-4Z',
}

/** the shapes above are outlines; these want a stroke as well as a fill */
const STROKED = new Set(['k', 'r', 'b', 'n'])

const LIGHT = { body: '#ffffff', mid: '#e9eef6', deep: '#b9c6d8', rim: '#5b6b82' }
const DARK = { body: '#5d6a80', mid: '#2f3b4f', deep: '#161e2c', rim: '#070b12' }

export function ChessPiece({ piece, size = 48 }: { piece: Piece; size?: number }) {
  const white = piece === piece.toUpperCase()
  const kind = piece.toLowerCase()
  const c = white ? LIGHT : DARK
  const id = `${white ? 'w' : 'b'}${kind}`

  return (
    <svg viewBox="0 0 45 45" width={size} height={size} className="chess__piece" aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} x1="0.25" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor={c.body} />
          <stop offset="0.42" stopColor={c.mid} />
          <stop offset="1" stopColor={c.deep} />
        </linearGradient>
        {/* one sweep of light down the left shoulder, the way a moulded
            piece catches a window */}
        <linearGradient id={`${id}s`} x1="0.1" y1="0" x2="0.6" y2="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity={white ? 0.9 : 0.44} />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity={white ? 0.28 : 0.12} />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={PATHS[kind]} />
        </clipPath>
      </defs>

      <g
        transform="translate(0 1)"
        fill="rgba(6,16,32,0.32)"
        stroke="rgba(6,16,32,0.32)"
        strokeWidth={STROKED.has(kind) ? 1.6 : 0}
        strokeLinejoin="round"
      >
        <path d={PATHS[kind]} />
      </g>

      <g
        fill={`url(#${id}g)`}
        stroke={c.rim}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d={PATHS[kind]} />
      </g>

      <g clipPath={`url(#${id}c)`}>
        <path d={PATHS[kind]} fill={`url(#${id}s)`} stroke="none" />
      </g>
    </svg>
  )
}
