import { byArcadeId } from '../content/arcade'

/**
 * One of somebody else's games, in a window.
 *
 * The credit bar sits above the game and stays there while it is played. It
 * is not a footnote: the name and the studio are the first thing in the
 * window and the studio is a link to their own page.
 *
 * With no embed agreed, the window is the card and a way through to itch.io
 * rather than the game. See src/content/arcade.ts.
 */

export default function ArcadeGame({ params }: { params?: Record<string, unknown> }) {
  const game = byArcadeId(String(params?.id ?? ''))
  if (!game) return <div className="ag ag--gone">That game is not on the shelf.</div>

  return (
    <div className="ag">
      <header className="ag__credit">
        <div>
          <b>{game.title}</b>
          <span>
            by{' '}
            <a href={game.page} target="_blank" rel="noreferrer noopener">
              {game.studio}
            </a>
          </span>
        </div>
        <a className="ag__out" href={game.page} target="_blank" rel="noreferrer noopener">
          Open on itch.io
        </a>
      </header>

      {game.frame ? (
        <iframe
          className="ag__frame"
          src={game.frame}
          title={`${game.title} by ${game.studio}`}
          allow="autoplay; fullscreen; gamepad; keyboard-map"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
        />
      ) : (
        <div className="ag__stage">
          <img className="ag__cover" src={game.cover} alt="" />
          <p className="ag__blurb">{game.blurb}</p>
          <a className="aero-btn aero-btn--primary" href={game.page} target="_blank" rel="noreferrer noopener">
            Play it on itch.io
          </a>
          <p className="ag__note">
            {game.studio} made this one. It opens on their page, where the downloads and
            anything they are selling live.
          </p>
        </div>
      )}
    </div>
  )
}
