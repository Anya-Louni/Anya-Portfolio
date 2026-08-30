import { useCallback, useEffect, useRef, useState } from 'react'
import { useOS } from './store'
import { loadPinned, type Pinned } from '../content/pinned'
import { coarse } from '../lib/touch'

/**
 * Desktop gadgets, the Windows 7 sidebar ones, floating loose on the desktop.
 * Draggable, closable, and remembered. Weather comes from Open-Meteo, which
 * needs no key and allows cross-origin requests.
 */

export type GadgetKind = 'clock' | 'weather' | 'calendar' | 'pinned'

interface Placed {
  id: string
  kind: GadgetKind
  x: number
  y: number
}

const KEY = 'os.gadgets'

const DEFAULTS: Placed[] = [
  { id: 'g1', kind: 'clock', x: -200, y: 24 },
  { id: 'g2', kind: 'weather', x: -200, y: 210 },
  { id: 'g3', kind: 'pinned', x: -200, y: 396 },
]

function load(): Placed[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Placed[]) : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function Gadgets() {
  const phase = useOS((s) => s.phase)
  const [items, setItems] = useState<Placed[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* nothing to do */
    }
  }, [items])

  const move = useCallback((id: string, x: number, y: number) => {
    setItems((all) => all.map((g) => (g.id === id ? { ...g, x, y } : g)))
  }, [])

  const close = useCallback((id: string) => {
    setItems((all) => all.filter((g) => g.id !== id))
  }, [])

  if (phase !== 'desktop') return null

  /* A phone already has a clock and a weather app. The pinned repository is
     the only one worth the room. */
  const shown = coarse ? items.filter((g) => g.kind === 'pinned') : items

  return (
    <div className="gad__layer">
      {shown.map((g) => (
        <Gadget key={g.id} item={g} onMove={move} onClose={close} />
      ))}
    </div>
  )
}

/** Add one from the desktop's right-click menu. */
export function addGadget(kind: GadgetKind) {
  try {
    const all = load()
    const next = [...all, { id: `g${Date.now()}`, kind, x: -210, y: 60 + all.length * 40 }]
    localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('os:gadgets'))
  } catch {
    /* nothing to do */
  }
}

function Gadget({
  item,
  onMove,
  onClose,
}: {
  item: Placed
  onMove: (id: string, x: number, y: number) => void
  onClose: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const grab = useRef<{ dx: number; dy: number } | null>(null)
  /* a negative x means "hang off the right edge", which is where Windows put them */
  const left = item.x < 0 ? window.innerWidth + item.x : item.x

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.gad__close')) return
    const r = ref.current!.getBoundingClientRect()
    grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    ref.current?.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const g = grab.current
    if (!g) return
    onMove(
      item.id,
      Math.max(0, Math.min(e.clientX - g.dx, window.innerWidth - 60)),
      Math.max(0, Math.min(e.clientY - g.dy, window.innerHeight - 90)),
    )
  }
  const up = () => (grab.current = null)

  return (
    <div
      className="gad"
      data-kind={item.kind}
      ref={ref}
      style={{ left, top: item.y }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <button className="gad__close" aria-label="Close gadget" onClick={() => onClose(item.id)}>
        ×
      </button>
      {item.kind === 'clock' ? <ClockGadget /> : null}
      {item.kind === 'weather' ? <WeatherGadget /> : null}
      {item.kind === 'calendar' ? <CalendarGadget /> : null}
      {item.kind === 'pinned' ? <PinnedGadget /> : null}
    </div>
  )
}

/* ---------------- pinned repo ---------------- */
function PinnedGadget() {
  const [repo, setRepo] = useState<Pinned | null>(null)

  useEffect(() => {
    let dead = false
    void loadPinned().then(({ repo }) => { if (!dead) setRepo(repo) })
    /* The file is rewritten by a scheduled Action, so a desktop left open
       for days should pick up a change without a reload. */
    const id = window.setInterval(() => {
      void loadPinned().then(({ repo }) => { if (!dead) setRepo(repo) })
    }, 30 * 60 * 1000)
    return () => { dead = true; window.clearInterval(id) }
  }, [])

  if (!repo) return <div className="gad__pin gad__pin--wait">Loading</div>

  return (
    <a
      className="gad__pin"
      href={repo.url}
      target="_blank"
      rel="noreferrer noopener"
      title={`Open ${repo.name} on GitHub`}
    >
      <span className="gad__pinTop">Pinned</span>
      <b className="gad__pinName">{repo.name}</b>
      {repo.description ? <span className="gad__pinDesc">{repo.description}</span> : null}
      <span className="gad__pinFoot">
        {repo.language ? <i className="gad__pinLang">{repo.language}</i> : null}
        {repo.stars > 0 ? <i>{repo.stars} stars</i> : null}
      </span>
    </a>
  )
}

/* ---------------- clock ---------------- */
function ClockGadget() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const s = now.getSeconds()
  const m = now.getMinutes() + s / 60
  const h = (now.getHours() % 12) + m / 60

  const hand = (angle: number, len: number, w: number, colour: string, cap = true) => (
    <line
      x1="50"
      y1="50"
      x2={50 + Math.sin((angle * Math.PI) / 180) * len}
      y2={50 - Math.cos((angle * Math.PI) / 180) * len}
      stroke={colour}
      strokeWidth={w}
      strokeLinecap={cap ? 'round' : 'butt'}
    />
  )

  return (
    <div className="gad__clock">
      <svg viewBox="0 0 100 100" width="118" height="118" aria-label={now.toLocaleTimeString()}>
        <defs>
          <radialGradient id="gadFace" cx="0.36" cy="0.28" r="0.8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#e8f1fb" />
            <stop offset="1" stopColor="#bccadb" />
          </radialGradient>
          <linearGradient id="gadRim" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="#f6f9fd" />
            <stop offset="0.5" stopColor="#9aa9bd" />
            <stop offset="1" stopColor="#5b6a80" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="49" fill="url(#gadRim)" />
        <circle cx="50" cy="50" r="44" fill="url(#gadFace)" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <line
              key={i}
              x1={50 + Math.sin(a) * 37}
              y1={50 - Math.cos(a) * 37}
              x2={50 + Math.sin(a) * 41}
              y2={50 - Math.cos(a) * 41}
              stroke="#5b6a80"
              strokeWidth={i % 3 === 0 ? 2.6 : 1.2}
              strokeLinecap="round"
            />
          )
        })}
        {hand(h * 30, 22, 4.2, '#25334a')}
        {hand(m * 6, 32, 3, '#25334a')}
        {hand(s * 6, 35, 1.4, '#e0553a')}
        <circle cx="50" cy="50" r="3.2" fill="#25334a" />
        <path d="M14 30a44 44 0 0 1 72 0 44 44 0 0 0-72 0Z" fill="#ffffff" opacity="0.55" />
      </svg>
      <p className="gad__digital">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  )
}

/* ---------------- weather ---------------- */
const CITIES = [
  { name: 'Algiers', lat: 36.75, lon: 3.06 },
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Paris', lat: 48.86, lon: 2.35 },
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
  { name: 'Reykjavík', lat: 64.15, lon: -21.94 },
]

const SKY: Record<number, { label: string; icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' }> = {
  0: { label: 'Clear', icon: 'sun' },
  1: { label: 'Mostly clear', icon: 'sun' },
  2: { label: 'Part cloudy', icon: 'cloud' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', icon: 'cloud' },
  51: { label: 'Drizzle', icon: 'rain' },
  61: { label: 'Rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  71: { label: 'Snow', icon: 'snow' },
  73: { label: 'Snow', icon: 'snow' },
  80: { label: 'Showers', icon: 'rain' },
  95: { label: 'Storm', icon: 'storm' },
}

function WeatherGadget() {
  const [city, setCity] = useState(() => {
    try {
      return Number(localStorage.getItem('os.weather') ?? 0)
    } catch {
      return 0
    }
  })
  const [temp, setTemp] = useState<number | null>(null)
  const [code, setCode] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setTemp(null)
    setFailed(false)
    const c = CITIES[city % CITIES.length]
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setTemp(Math.round(d?.current?.temperature_2m))
        setCode(d?.current?.weather_code ?? 0)
      })
      .catch(() => alive && setFailed(true))
    try {
      localStorage.setItem('os.weather', String(city))
    } catch {
      /* nothing to do */
    }
    return () => {
      alive = false
    }
  }, [city])

  const sky = code !== null ? (SKY[code] ?? { label: 'Cloudy', icon: 'cloud' as const }) : null

  return (
    <div className="gad__weather">
      <div className="gad__sky" data-icon={sky?.icon ?? 'cloud'}>
        {sky?.icon === 'sun' ? <span className="gad__sun" /> : null}
        {sky?.icon !== 'sun' ? <span className="gad__cloud" /> : null}
        {sky?.icon === 'rain' || sky?.icon === 'storm' ? <span className="gad__rain" /> : null}
        {sky?.icon === 'snow' ? <span className="gad__snow" /> : null}
      </div>
      <p className="gad__temp">{failed ? 'n/a' : temp === null ? '··' : `${temp}°`}</p>
      <p className="gad__cond">{failed ? 'Offline' : (sky?.label ?? 'Loading')}</p>
      <button
        className="gad__city"
        onClick={() => setCity((c) => (c + 1) % CITIES.length)}
        title="Next city"
      >
        {CITIES[city % CITIES.length].name}
      </button>
    </div>
  )
}

/* ---------------- calendar ---------------- */
function CalendarGadget() {
  const now = new Date()
  return (
    <div className="gad__cal">
      <p className="gad__calMonth">{now.toLocaleDateString([], { month: 'long' })}</p>
      <p className="gad__calDay">{now.getDate()}</p>
      <p className="gad__calWeekday">{now.toLocaleDateString([], { weekday: 'long' })}</p>
    </div>
  )
}
