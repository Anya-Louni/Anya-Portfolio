import { Icon, type IconName } from '../../ui/Icon'
import { ARCADE } from '../../content/arcade'
import { launch } from '../../os/registry'

const TILES: { id: string; name: string; desc: string; icon: IconName }[] = [
  { id: 'klondike', name: 'Solitaire', desc: 'Sort the whole deck', icon: 'cards' },
  { id: 'spider', name: 'Spider Solitaire', desc: 'Build runs. Clear suits.', icon: 'spider' },
  { id: 'freecell', name: 'FreeCell', desc: 'Every card face up', icon: 'freecell' },
  { id: 'minesweeper', name: 'Minesweeper', desc: 'Find every hidden mine', icon: 'mine' },
  { id: 'chess', name: 'Chess', desc: 'Checkmate the other king', icon: 'games' },
  { id: 'nightline', name: 'The Night Line', desc: 'Find the culprit', icon: 'notes' },
  { id: 'bubblebeat', name: 'Bubble Beat', desc: 'Catch notes on the beat', icon: 'arcade' },
]

export default function Games() {
  return (
    <div className="arcade">
      {TILES.map((t) => (
        <button
          key={t.id}
          className="arcade__tile"
          onDoubleClick={() => launch(t.id)}
          onClick={() => launch(t.id)}
        >
          <Icon name={t.icon} />
          <span className="arcade__name">{t.name}</span>
          <span className="arcade__desc">{t.desc}</span>
        </button>
      ))}

      {/* Other people's games. Named, credited and linked on the tile itself,
          so the shelf never reads as though these were made here. */}
      <p className="arcade__shelf">From itch.io, by their makers</p>
      {ARCADE.map((g) => (
        <button
          key={g.id}
          className="arcade__tile arcade__tile--guest"
          onClick={() => launch('arcadegame', { id: g.id })}
        >
          <img className="arcade__cover" src={g.cover} alt="" loading="lazy" />
          <span className="arcade__name">{g.title}</span>
          <span className="arcade__desc">by {g.studio}</span>
        </button>
      ))}
    </div>
  )
}
