import { useEffect, useRef, useState } from 'react'
import { useOS } from './store'
import { getApp, launch } from './registry'
import { Glyph, Icon, Mark, type IconName } from '../ui/Icon'
import { StartMenu } from './StartMenu'
import { useMenu } from './ContextMenu'
import { viewport, type MenuItem } from './store'

/* Kept short on purpose. Everything else is on the desktop and in Start. */
const PINNED = ['finder', 'explorer', 'games', 'aquarium']

interface Slot {
  key: string
  appId: string
  title: string
  icon: IconName
  winIds: string[]
}

export function Taskbar() {
  const wins = useOS((s) => s.wins)
  const activeId = useOS((s) => s.activeId)
  const focus = useOS((s) => s.focus)
  const minimize = useOS((s) => s.minimize)
  const startOpen = useOS((s) => s.startOpen)
  const setStartOpen = useOS((s) => s.setStartOpen)
  const soundOn = useOS((s) => s.soundOn)
  const setSound = useOS((s) => s.setSound)
  const setPeeking = useOS((s) => s.setPeeking)
  const minimizeAll = useOS((s) => s.minimizeAll)

  const close = useOS((s) => s.close)
  const toggleMax = useOS((s) => s.toggleMax)
  const setRect = useOS((s) => s.setRect)
  const menu = useMenu()
  const [hover, setHover] = useState<{ slot: Slot; x: number } | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 20)
    return () => clearInterval(id)
  }, [])

  const live = wins.filter((w) => !w.closing)
  const slots: Slot[] = []
  for (const appId of PINNED) {
    const app = getApp(appId)
    if (!app) continue
    const mine = live.filter((w) => w.appId === appId)
    slots.push({
      key: `pin-${appId}`,
      appId,
      title: mine[0]?.title ?? app.title,
      icon: app.icon,
      winIds: mine.map((w) => w.id),
    })
  }
  for (const w of live) {
    if (PINNED.includes(w.appId)) continue
    slots.push({ key: w.id, appId: w.appId, title: w.title, icon: w.icon, winIds: [w.id] })
  }

  const onSlot = (slot: Slot) => {
    if (!slot.winIds.length) {
      launch(slot.appId)
      return
    }
    const first = slot.winIds[0]
    const w = live.find((x) => x.id === first)
    if (w && !w.minimized && activeId === first) minimize(first)
    else focus(first)
  }

  /* jump list, right-clicking a taskbar button in Windows 7 */
  const jumpList = (e: React.MouseEvent, slot: Slot) => {
    const items: MenuItem[] = [
      { id: 'head', label: slot.title, bold: true, icon: slot.icon, disabled: true },
      { id: 'd0', divider: true },
      { id: 'open', label: slot.winIds.length ? 'Switch to' : 'Open', run: () => onSlot(slot) },
      {
        id: 'maximize',
        label: 'Maximize',
        disabled: !slot.winIds.length,
        run: () => slot.winIds[0] && toggleMax(slot.winIds[0], viewport()),
      },
      { id: 'd1', divider: true },
      {
        id: 'close',
        label: 'Close window',
        disabled: !slot.winIds.length,
        run: () => slot.winIds.forEach((id) => close(id)),
      },
    ]
    menu(e, items)
  }

  /* the taskbar's own menu, including a real Cascade */
  const barMenu = (e: React.MouseEvent) => {
    const cascade = () => {
      const vp = viewport()
      const open = live.filter((w) => !w.minimized)
      open
        .slice()
        .sort((a, b) => a.z - b.z)
        .forEach((w, i) => {
          setRect(w.id, {
            x: 40 + i * 26,
            y: 24 + i * 26,
            w: Math.min(w.w, vp.w - 120),
            h: Math.min(w.h, vp.h - 120),
          })
          if (w.maximized) toggleMax(w.id, vp)
        })
    }
    menu(e, [
      { id: 'toolbars', label: 'Toolbars', disabled: true },
      { id: 'd0', divider: true },
      { id: 'cascade', label: 'Cascade windows', disabled: live.length < 2, run: cascade },
      { id: 'showdesk', label: 'Show the desktop', run: minimizeAll },
      { id: 'd1', divider: true },
      { id: 'props', label: 'Properties', icon: 'control', run: () => launch('control') },
    ])
  }

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const date = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <>
      {startOpen ? (
        <>
          <div className="scrim" onPointerDown={() => setStartOpen(false)} />
          <StartMenu />
        </>
      ) : null}

      {hover ? (
        <PeekCard slot={hover.slot} x={hover.x} />
      ) : null}

      <div className="taskbar no-select" onContextMenu={barMenu}>
        <button
          className="orb"
          aria-label="Start"
          aria-expanded={startOpen}
          data-open={startOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setStartOpen(!startOpen)}
        >
          <Mark />
        </button>

        <div className="tasks">
          {slots.map((slot) => {
            const running = slot.winIds.length > 0
            const focused = slot.winIds.includes(activeId ?? '')
            return (
              <button
                key={slot.key}
                className="taskbtn"
                aria-label={running ? `${slot.title}, switch` : `Open ${slot.title}`}
                data-running={running}
                data-focused={focused}
                onClick={() => onSlot(slot)}
                onContextMenu={(e) => jumpList(e, slot)}
                title={running ? slot.title : `Open ${slot.title}`}
                onPointerEnter={(e) =>
                  running && setHover({ slot, x: e.currentTarget.getBoundingClientRect().left })
                }
                onPointerLeave={() => setHover(null)}
              >
                <Icon name={slot.icon} />
              </button>
            )
          })}
        </div>

        <div className="tray">
          <button
            className="tray__btn"
            data-off={!soundOn}
            aria-label={soundOn ? 'Mute interface sounds' : 'Unmute interface sounds'}
            title={soundOn ? 'Sound: on' : 'Sound: muted'}
            aria-pressed={soundOn}
            onClick={() => setSound(!soundOn)}
          >
            {soundOn ? <Glyph.sound /> : <Glyph.soundOff />}
          </button>
          <button
            className="tray__btn"
            aria-label="Network: connected"
            title="Local session, nothing leaves this browser"
            onClick={() => launch('computer')}
          >
            <Glyph.network />
          </button>
          <button
            className="clock"
            aria-label={`${time}, ${date}`}
            title={now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            onClick={() => launch('control')}
          >
            <span className="clock__time">{time}</span>
            <span className="clock__date">{date}</span>
          </button>
          <button
            className="showdesk"
            aria-label="Show desktop"
            title="Show desktop"
            onPointerEnter={() => setPeeking(true)}
            onPointerLeave={() => setPeeking(false)}
            onClick={() => {
              setPeeking(false)
              minimizeAll()
            }}
          />
        </div>
      </div>
    </>
  )
}

function PeekCard({ slot, x }: { slot: Slot; x: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const left = Math.max(8, Math.min(x - 72, window.innerWidth - 200))
  return (
    <div className="peek" ref={ref} style={{ left }}>
      <div className="peek__head">
        <Icon name={slot.icon} />
        <span className="peek__title">{slot.title}</span>
      </div>
      <div className="peek__frame">
        <Icon name={slot.icon} />
      </div>
    </div>
  )
}
