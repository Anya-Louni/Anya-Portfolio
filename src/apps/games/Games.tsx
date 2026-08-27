import { Icon, type IconName } from '../../ui/Icon'
import { launch } from '../../os/registry'

const TILES: { id: string; name: string; desc: string; icon: IconName }[] = [
  { id: 'klondike', name: 'Solitaire', desc: 'Klondike, draw one or three', icon: 'cards' },
  { id: 'spider', name: 'Spider Solitaire', desc: 'One, two or four suits', icon: 'spider' },
  { id: 'freecell', name: 'FreeCell', desc: 'Every deal is winnable-ish', icon: 'freecell' },
  { id: 'minesweeper', name: 'Minesweeper', desc: 'Beginner to expert', icon: 'mine' },
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
    </div>
  )
}
