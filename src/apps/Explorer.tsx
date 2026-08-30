import { useCallback, useEffect, useRef, useState } from 'react'
import { STOPS, YEARS, normalise, waybackUrl } from '../content/oldweb'
import { Glyph, Icon } from '../ui/Icon'
import { sound } from '../os/sound'

/**
 * Internet Explorer.
 *
 * A real browser: tabs, history, an address bar that loads what you type.
 * The time slider swaps the address for a Wayback snapshot of the same site,
 * which is why the old web actually renders instead of being screenshotted.
 *
 * Plenty of modern sites refuse to be framed, so a blocked load falls back to
 * the page IE always showed when it could not display something.
 */

interface Tab {
  id: number
  title: string
  url: string
  /** null = live web */
  year: number | null
  history: string[]
  at: number
}

let seq = 0
const newTab = (url = '', year: number | null = null): Tab => ({
  id: ++seq,
  title: 'New Tab',
  url,
  year,
  history: url ? [url] : [],
  at: url ? 0 : -1,
})

export default function Explorer() {
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab()])
  const [active, setActive] = useState(0)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [blocked, setBlocked] = useState(false)
  /** bumped to force the frame to remount, which is what Retry needs */
  const [nonce, setNonce] = useState(0)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const guard = useRef<number | null>(null)

  const tab = tabs[active]
  const src = tab?.history[tab.at] ?? ''

  /* A site that refuses to be framed still fires load, and what it leaves
     behind cannot be read from out here: the frame is sandboxed, so even
     about:blank inside it is a foreign origin. There is no way to ask whether
     the page arrived. So rather than guess, the two addresses known to frame
     are named, and everything else gets a line offering the way out. Saying
     "this might be blank" is honest; claiming it failed would not be. */
  const framesFine = /(^|\/\/)(web\.archive\.org|wiby\.me)/.test(src)

  const patch = useCallback(
    (fn: (t: Tab) => Tab) => setTabs((all) => all.map((t, i) => (i === active ? fn(t) : t))),
    [active],
  )

  useEffect(() => {
    setAddress(tab?.url ?? '')
  }, [tab?.url, active])

  /* A framed page that never fires load is either very slow, the Archive
     often is, or refusing to be embedded. Say so in that order. */
  useEffect(() => {
    if (!src) return
    setLoading(true)
    setSlow(false)
    setBlocked(false)
    const slowTimer = window.setTimeout(() => setSlow(true), 7000)
    if (guard.current) window.clearTimeout(guard.current)
    guard.current = window.setTimeout(() => {
      setLoading(false)
      setBlocked(true)
    }, 30000)
    return () => {
      window.clearTimeout(slowTimer)
      if (guard.current) window.clearTimeout(guard.current)
    }
  }, [src, nonce])

  const go = (raw: string, year: number | null = tab?.year ?? null) => {
    const url = normalise(raw)
    if (!url) return
    const target = year ? waybackUrl(url, year) : url
    sound.click(1.1)
    patch((t) => {
      const history = [...t.history.slice(0, t.at + 1), target]
      return {
        ...t,
        url,
        year,
        title: url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 28),
        history,
        at: history.length - 1,
      }
    })
  }

  const step = (delta: number) => {
    patch((t) => ({ ...t, at: Math.min(Math.max(t.at + delta, 0), t.history.length - 1) }))
    sound.click(0.9)
  }

  const setYear = (year: number | null) => {
    if (!tab?.url) {
      patch((t) => ({ ...t, year }))
      return
    }
    go(tab.url, year)
  }

  const canBack = tab && tab.at > 0
  const canFwd = tab && tab.at < tab.history.length - 1

  return (
    <div className="ie">
      {/* tabs */}
      <div className="ie__tabs">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            className="ie__tab"
            data-on={i === active}
            onClick={() => setActive(i)}
          >
            <Icon name="explorer" />
            <span className="ie__tabTitle">{t.title}</span>
            {tabs.length > 1 ? (
              <span
                className="ie__tabClose"
                role="button"
                aria-label={`Close ${t.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setTabs((all) => all.filter((_, k) => k !== i))
                  setActive((a) => Math.max(0, a >= i ? a - 1 : a))
                }}
              >
                <Glyph.close />
              </span>
            ) : null}
          </button>
        ))}
        <button
          className="ie__newTab"
          aria-label="New tab"
          onClick={() => {
            setTabs((all) => [...all, newTab()])
            setActive(tabs.length)
          }}
        >
          +
        </button>
      </div>

      {/* address bar */}
      <form
        className="ie__bar"
        onSubmit={(e) => {
          e.preventDefault()
          go(address)
        }}
      >
        <button
          type="button"
          className="ie__nav"
          disabled={!canBack}
          aria-label="Back"
          onClick={() => step(-1)}
        >
          <Glyph.chevronRight />
        </button>
        <button
          type="button"
          className="ie__nav ie__nav--fwd"
          disabled={!canFwd}
          aria-label="Forward"
          onClick={() => step(1)}
        >
          <Glyph.chevronRight />
        </button>
        <label className="ie__address">
          <Icon name="explorer" className="ie__addressIcon" />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Type an address, or search"
            aria-label="Address"
            spellCheck={false}
          />
          {tab?.year ? <span className="ie__yearPill">{tab.year}</span> : null}
        </label>
        <button className="ie__go" type="submit" aria-label="Go">
          <Glyph.arrowRight />
        </button>
      </form>

      {/* time machine */}
      <div className="ie__time">
        <span className="ie__timeLabel">Time machine</span>
        <button className="ie__year" data-on={tab?.year === null} onClick={() => setYear(null)}>
          Live
        </button>
        {YEARS.map((y) => (
          <button key={y} className="ie__year" data-on={tab?.year === y} onClick={() => setYear(y)}>
            {y}
          </button>
        ))}
      </div>

      {/* favorites */}
      <div className="ie__faves">
        <span className="ie__favesLabel">Favorites</span>
        {STOPS.map((s) => (
          <button key={s.title} className="ie__fave" title={`${s.url} · ${s.year} · ${s.note}`} onClick={() => go(s.url, s.year)}>
            {s.title}
            <em>{s.year}</em>
          </button>
        ))}
      </div>

      {/* viewport */}
      <div className="ie__view">
        {!src ? (
          <div className="ie__home">
            <h2>Where do you want to go?</h2>
            <p>
              Pick a favorite below the address bar to land on it as it was, or type any address.
              The time machine pulls the nearest snapshot from the Internet Archive.
            </p>
            <div className="ie__homeGrid">
              {STOPS.slice(0, 8).map((s) => (
                <button key={s.title} className="ie__card" onClick={() => go(s.url, s.year)}>
                  <span className="ie__cardYear">{s.year}</span>
                  <span className="ie__cardTitle">{s.title}</span>
                  <span className="ie__cardNote">{s.note}</span>
                </button>
              ))}
            </div>
          </div>
        ) : blocked ? (
          <div className="ie__error">
            <h2>Internet Explorer cannot display the webpage</h2>
            <ul>
              <li>The snapshot may just be slow. Retry usually gets it.</li>
              <li>Or there is no snapshot near that year. Try a different one on
                  the time machine.</li>
              <li>Or the site refuses to be shown inside another page. Most sites
                  built after about 2010 do that on purpose.</li>
            </ul>
            <div className="ie__errorActions">
              <button
                className="aero-btn"
                onClick={() => {
                  setBlocked(false)
                  setNonce((n) => n + 1)
                }}
              >
                Retry
              </button>
              <a className="aero-btn aero-btn--primary" href={src} target="_blank" rel="noreferrer">
                Open in a real tab
              </a>
            </div>
            <p className="ie__errorUrl">{src}</p>
          </div>
        ) : (
          <iframe
            ref={frameRef}
            key={`${src}#${nonce}`}
            className="ie__frame"
            src={src}
            title={tab?.title ?? 'Page'}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
            onLoad={() => {
              if (guard.current) window.clearTimeout(guard.current)
              setLoading(false)
              setSlow(false)
            }}
          />
        )}
        {loading ? <div className="ie__progress" /> : null}
        {slow && loading ? (
          <p className="ie__slow">Still opening. Old snapshots can take a while.</p>
        ) : null}
        {src && !loading && !blocked && !framesFine ? (
          <p className="ie__hint">
            Blank? Most sites built after about 2010 refuse to open inside another page.
            <a href={src} target="_blank" rel="noreferrer">
              Open it in a real tab
            </a>
            or pick a year above to see it on the Internet Archive.
          </p>
        ) : null}
      </div>

      <div className="ie__status">
        <span>{loading ? 'Opening page…' : src ? 'Done' : 'Ready'}</span>
        <span className="game__spacer" />
        <span className="ie__zone">{tab?.year ? `Archive · ${tab.year}` : 'Internet'}</span>
      </div>
    </div>
  )
}
