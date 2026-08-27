import type { CSSProperties } from 'react'
import { SUIT_GLYPH, isRed, rankName, type Card } from './deck'

/**
 * A playing card in the Windows Solitaire proportions (71x96 at 1x).
 * Face cards get a simple ornamental panel rather than a portrait — the
 * originals used bitmaps we obviously cannot ship.
 */
export function CardView({
  card,
  style,
  className = '',
  onPointerDown,
  onDoubleClick,
  dim,
}: {
  card: Card
  style?: CSSProperties
  className?: string
  onPointerDown?: (e: React.PointerEvent) => void
  onDoubleClick?: (e: React.MouseEvent) => void
  dim?: boolean
}) {
  if (!card.faceUp) {
    return (
      <div
        className={`card card--back ${className}`}
        style={style}
        onPointerDown={onPointerDown}
        aria-hidden
      />
    )
  }

  const red = isRed(card.suit)
  const glyph = SUIT_GLYPH[card.suit]
  const face = card.rank >= 11

  return (
    <div
      className={`card ${className}`}
      style={style}
      data-red={red}
      data-dim={dim}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      role="img"
      aria-label={`${rankName(card.rank)} of ${
        { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }[card.suit]
      }`}
    >
      <span className="card__corner card__corner--tl">
        <b>{rankName(card.rank)}</b>
        <i>{glyph}</i>
      </span>
      <span className="card__corner card__corner--br">
        <b>{rankName(card.rank)}</b>
        <i>{glyph}</i>
      </span>

      {face ? (
        <span className="card__face">
          <span className="card__faceLetter">{rankName(card.rank)}</span>
          <span className="card__facePip">{glyph}</span>
        </span>
      ) : (
        <span className="card__pips" data-rank={card.rank}>
          {Array.from({ length: card.rank }, (_, i) => (
            <i key={i}>{glyph}</i>
          ))}
        </span>
      )}
    </div>
  )
}

/** An empty pile outline — where a card may be dropped. */
export function Slot({
  style,
  label,
  className = '',
}: {
  style?: CSSProperties
  label?: string
  className?: string
}) {
  return (
    <div className={`slot ${className}`} style={style}>
      {label ? <span className="slot__mark">{label}</span> : null}
    </div>
  )
}
