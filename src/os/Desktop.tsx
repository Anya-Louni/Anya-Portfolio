import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useOS, type IconSize, type MenuItem, type Rect } from './store'
import { launch } from './registry'
import { useMenu } from './ContextMenu'
import { addGadget } from './Gadgets'
import { Icon, type IconName } from '../ui/Icon'
import { STICKIES, type Sticky } from '../content/notes'
import { GITHUB_PROFILE } from '../content/projects'

interface Shortcut {
  id: string
  label: string
  icon: IconName
  shortcut?: boolean
  run: () => void
}

const SHORTCUTS: Shortcut[] = [
  { id: 'computer', label: 'Computer', icon: 'computer', run: () => launch('computer') },
  { id: 'finder', label: 'Projects', icon: 'folderProjects', run: () => launch('finder') },
  {
    id: 'galaxy',
    label: 'Galaxy Compass',
    icon: 'star',
    shortcut: true,
    run: () => launch('project', { slug: 'galaxy-compass' }),
  },
  {
    id: 'deepsea',
    label: 'Deep-Sea OOD',
    icon: 'aquarium',
    shortcut: true,
    run: () => launch('project', { slug: 'deep-sea-ood' }),
  },
  { id: 'aquarium', label: 'Aquarium', icon: 'aquarium', run: () => launch('aquarium') },
  { id: 'explorer', label: 'Internet Explorer', icon: 'explorer', run: () => launch('explorer') },
  { id: 'paint', label: 'Paint', icon: 'paint', run: () => launch('paint') },
  { id: 'photobooth', label: 'Photo Booth', icon: 'camera', run: () => launch('photobooth') },
  { id: 'ipod', label: 'iPod', icon: 'ipod', run: () => launch('ipod') },
  { id: 'wmp', label: 'Media Player', icon: 'wmp', run: () => launch('wmp') },
  { id: 'ascii', label: 'ASCII Studio', icon: 'ascii', run: () => launch('ascii') },
  { id: 'sketchpad', label: 'Sketchpad', icon: 'sketchpad', run: () => launch('sketchpad') },
  { id: 'games', label: 'Games', icon: 'games', run: () => launch('games') },
  { id: 'contacts', label: 'Contacts', icon: 'contacts', run: () => launch('contacts') },
  { id: 'guestbook', label: 'Leave a note', icon: 'guestbook', run: () => launch('guestbook') },
  { id: 'control', label: 'Control Panel', icon: 'control', run: () => launch('control') },
  {
    id: 'github',
    label: 'GitHub',
    icon: 'github',
    shortcut: true,
    run: () => window.open(GITHUB_PROFILE, '_blank', 'noopener,noreferrer'),
  },
]

const SIZES: Record<IconSize, number> = { large: 48, medium: 40, small: 32 }

export function Desktop() {
  const selected = useOS((s) => s.selected)
  const setSelected = useOS((s) => s.setSelected)
  const iconSize = useOS((s) => s.iconSize)
  const setIconSize = useOS((s) => s.setIconSize)
  const setStartOpen = useOS((s) => s.setStartOpen)
  const pushToast = useOS((s) => s.pushToast)
  const menu = useMenu()

  const fieldRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<Rect | null>(null)
  const anchor = useRef<{ x: number; y: number } | null>(null)
  const [order, setOrder] = useState(SHORTCUTS)

  /* ---------- marquee selection ---------- */
  const onFieldDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('.dicon, .sticky')) return
      setSelected([])
      setStartOpen(false)
      anchor.current = { x: e.clientX, y: e.clientY }
      fieldRef.current?.setPointerCapture(e.pointerId)
      setMarquee({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
    },
    [setSelected, setStartOpen],
  )

  const onFieldMove = useCallback(
    (e: React.PointerEvent) => {
      const a = anchor.current
      if (!a) return
      const r: Rect = {
        x: Math.min(a.x, e.clientX),
        y: Math.min(a.y, e.clientY),
        w: Math.abs(e.clientX - a.x),
        h: Math.abs(e.clientY - a.y),
      }
      setMarquee(r)
      const hit: string[] = []
      fieldRef.current?.querySelectorAll<HTMLElement>('.dicon').forEach((el) => {
        const b = el.getBoundingClientRect()
        if (b.left < r.x + r.w && b.right > r.x && b.top < r.y + r.h && b.bottom > r.y) {
          if (el.dataset.id) hit.push(el.dataset.id)
        }
      })
      setSelected(hit)
    },
    [setSelected],
  )

  const onFieldUp = useCallback(() => {
    anchor.current = null
    setMarquee(null)
  }, [])

  /* ---------- shell menus ---------- */
  const desktopMenu = (e: React.MouseEvent) => {
    const viewItems: MenuItem[] = (['large', 'medium', 'small'] as IconSize[]).map((s) => ({
      id: `size-${s}`,
      label: `${s[0].toUpperCase()}${s.slice(1)} icons`,
      checked: iconSize === s,
      run: () => setIconSize(s),
    }))
    menu(e, [
      { id: 'view', label: 'View', submenu: viewItems },
      {
        id: 'sort',
        label: 'Sort by',
        submenu: [
          {
            id: 'sort-name',
            label: 'Name',
            run: () => setOrder([...order].sort((a, b) => a.label.localeCompare(b.label))),
          },
          { id: 'sort-default', label: 'Default', run: () => setOrder(SHORTCUTS) },
        ],
      },
      { id: 'd1', divider: true },
      {
        id: 'refresh',
        label: 'Refresh',
        run: () => pushToast({ icon: 'star', title: 'Refreshed', body: 'Everything is where you left it.' }),
      },
      { id: 'd2', divider: true },
      {
        id: 'gadgets',
        label: 'Gadgets',
        submenu: [
          { id: 'g-clock', label: 'Clock', run: () => addGadget('clock') },
          { id: 'g-weather', label: 'Weather', run: () => addGadget('weather') },
          { id: 'g-cal', label: 'Calendar', run: () => addGadget('calendar') },
        ],
      },
      { id: 'new', label: 'New', disabled: true },
      { id: 'd3', divider: true },
      { id: 'personalize', label: 'Personalize', icon: 'control', run: () => launch('control') },
    ])
  }

  const iconMenu = (e: React.MouseEvent, s: Shortcut) => {
    setSelected([s.id])
    menu(e, [
      { id: 'open', label: 'Open', bold: true, run: s.run },
      { id: 'd1', divider: true },
      { id: 'shortcut', label: 'Create shortcut', disabled: true },
      { id: 'delete', label: 'Delete', disabled: true },
      { id: 'rename', label: 'Rename', disabled: true },
      { id: 'd2', divider: true },
      { id: 'props', label: 'Properties', disabled: true },
    ])
  }

  return (
    <div className="desktop" onContextMenu={desktopMenu}>
      <div
        className="desktop__field"
        ref={fieldRef}
        /* Chrome will not accept var() inside repeat(), so the grid tracks are
           computed here rather than in the stylesheet. */
        style={
          {
            ['--dicon' as string]: `${SIZES[iconSize]}px`,
            gridTemplateRows: `repeat(auto-fill, ${SIZES[iconSize] + 42}px)`,
            gridAutoColumns: `${SIZES[iconSize] + 44}px`,
          } as CSSProperties
        }
        data-size={iconSize}
        onPointerDown={onFieldDown}
        onPointerMove={onFieldMove}
        onPointerUp={onFieldUp}
        onPointerCancel={onFieldUp}
      >
        {order.map((s) => (
          <button
            key={s.id}
            className="dicon"
            data-id={s.id}
            aria-label={`Open ${s.label}`}
            data-selected={selected.includes(s.id)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) =>
              setSelected(e.ctrlKey || e.metaKey ? [...new Set([...selected, s.id])] : [s.id])
            }
            onDoubleClick={s.run}
            onContextMenu={(e) => iconMenu(e, s)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') s.run()
            }}
          >
            <span className="dicon__artwrap">
              <Icon name={s.icon} className="dicon__art" />
              {s.shortcut ? (
                <svg className="dicon__badge" viewBox="0 0 16 16" aria-hidden>
                  <rect x="0.5" y="0.5" width="15" height="15" rx="1.5" fill="#f6f8fc" stroke="#6b7d94" />
                  <path
                    d="M5 11 11 5M6.6 4.8H11.2V9.4"
                    fill="none"
                    stroke="#1d3a5c"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span className="dicon__label">{s.label}</span>
          </button>
        ))}
      </div>

      {marquee ? (
        <div
          className="marquee"
          style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
        />
      ) : null}

      <div className="stickies">
        {STICKIES.map((n) => (
          <StickyNote key={n.id} note={n} />
        ))}
      </div>
    </div>
  )
}

function StickyNote({ note }: { note: Sticky }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [held, setHeld] = useState(false)
  const off = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setPos({
      x: (note.x / 100) * window.innerWidth,
      y: (note.y / 100) * (window.innerHeight - 46),
    })
  }, [note.x, note.y])

  const down = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    off.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    el.setPointerCapture(e.pointerId)
    setHeld(true)
  }, [])

  const move = useCallback(
    (e: React.PointerEvent) => {
      if (!held) return
      setPos({
        x: Math.max(4, Math.min(e.clientX - off.current.x, window.innerWidth - 60)),
        y: Math.max(4, Math.min(e.clientY - off.current.y, window.innerHeight - 92)),
      })
    },
    [held],
  )

  if (!pos) return null

  return (
    <div
      ref={ref}
      className="sticky"
      data-tint={note.tint}
      data-held={held}
      style={{ left: pos.x, top: pos.y, ['--rot' as string]: `${note.rot}deg` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
    >
      <span className="sticky__tape" aria-hidden />
      <p className="sticky__text">{note.text}</p>
    </div>
  )
}
