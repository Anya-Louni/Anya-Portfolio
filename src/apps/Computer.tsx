import { useEffect, useState } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { launch } from '../os/registry'
import { useOS } from '../os/store'
import { SPECIES } from '../aquarium/creatures'
import { coinText, getCoins } from '../os/purse'
import { load as loadTank, ratePerSecond } from '../aquarium/economy'
import { GITHUB_PROFILE, PROJECTS, REPOS } from '../content/projects'

type Drive = {
  letter: string
  name: string
  icon: IconName
  used: number
  size: number
  unit: string
  open: () => void
}

export default function Computer() {
  const userName = useOS((s) => s.userName)
  const theme = useOS((s) => s.theme)
  const skin = useOS((s) => s.skin)
  const [res, setRes] = useState(`${window.innerWidth} × ${window.innerHeight}`)
  /* Read once, when the window opens: the drive is a snapshot, and polling
     the tank's save five times a second to keep a bar in sync would be
     absurd for something nobody is watching. */
  const [tank] = useState(loadTank)
  const stocked = SPECIES.reduce((n, s) => n + (tank.owned[s.id] ?? 0), 0)

  useEffect(() => {
    const on = () => setRes(`${window.innerWidth} × ${window.innerHeight}`)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const drives: Drive[] = [
    {
      letter: 'P:',
      name: 'Projects',
      icon: 'folderProjects',
      used: PROJECTS.length,
      size: 6,
      unit: 'folders',
      open: () => launch('finder'),
    },
    {
      letter: 'Q:',
      name: 'Aquarium',
      icon: 'aquarium',
      used: stocked,
      size: Math.max(12, Math.ceil(stocked * 1.4)),
      unit: 'creatures',
      open: () => launch('aquarium'),
    },
    {
      letter: 'C:',
      name: 'System',
      icon: 'control',
      used: 3,
      size: 12,
      unit: 'panels',
      open: () => launch('control'),
    },
  ]

  const openProfile = () => window.open(GITHUB_PROFILE, '_blank', 'noopener,noreferrer')

  return (
    <div className="cmp">
      <p className="cmp__head">Hard disk drives</p>
      <div className="cmp__drives">
        {drives.map((d) => {
          const pct = Math.round((d.used / d.size) * 100)
          return (
            <button key={d.letter} className="drive" onDoubleClick={d.open} onClick={d.open}>
              <Icon name={d.icon} className="drive__icon" />
              <div className="drive__meta">
                <span className="drive__name">
                  {d.name} <em>({d.letter})</em>
                </span>
                <span className="drive__bar" aria-hidden>
                  <i style={{ width: `${pct}%` }} data-full={pct > 85} />
                </span>
                <span className="drive__free">
                  {d.used} of {d.size} {d.unit}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <p className="cmp__head">Network location</p>
      <div className="cmp__drives">
        <button className="drive" onClick={openProfile} onDoubleClick={openProfile}>
          <Icon name="github" className="drive__icon" />
          <div className="drive__meta">
            <span className="drive__name">
              GitHub <em>(github.com/Anya-Louni)</em>
            </span>
            <span className="drive__free">
              {PROJECTS.length + REPOS.length} repositories · opens in a new tab
            </span>
          </div>
        </button>
      </div>

      <p className="cmp__head">This machine</p>
      <dl className="cmp__spec">
        <div>
          <dt>Signed in as</dt>
          <dd>{userName || 'Guest'}</dd>
        </div>
        <div>
          <dt>Display</dt>
          <dd>{res}</dd>
        </div>
        <div>
          <dt>Theme</dt>
          <dd>{skin === 'luna' ? 'Windows XP' : theme === 'night' ? 'Deep Field' : 'Aero'}</dd>
        </div>
        <div>
          <dt>Aquarium</dt>
          <dd>
            {stocked} creature{stocked === 1 ? '' : 's'} · {coinText(getCoins())} coins ·{' '}
            {coinText(ratePerSecond(tank.owned))}/s
          </dd>
        </div>
        <div>
          <dt>Session storage</dt>
          <dd>Local only. Nothing leaves this browser</dd>
        </div>
      </dl>
    </div>
  )
}
