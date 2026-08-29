import { useCallback, useEffect, useRef, useState } from 'react'
import { listSongs, type Song } from '../lib/songs'
import { Flourish } from '../art/Flourish'
import { nowPlaying, useNowPlaying } from '../os/nowPlaying'
import { launch } from '../os/registry'
import { sound } from '../os/sound'

/**
 * iPod.
 *
 * First-generation shell: screen on top, click wheel below. The wheel really
 * is a wheel — drag around it and the selection scrolls, one step per 30° of
 * rotation, the way the original felt.
 *
 * It browses the shared songbook, which is an artist and a song name and
 * nothing else. Choosing one hands it to Karaoke, where YouTube's own player
 * shows it: this window holds no audio and never did, which is what lets the
 * songbook be public.
 *
 * While something plays, the screen fills with a flourish that draws itself —
 * curling stems, rosettes, scattered dots — in a single pale blue on the
 * screen's dark ground.
 */

type Screen = 'menu' | 'songs' | 'now'

const MENU = ['Songbook', 'Now Playing', 'Shuffle', 'Add a song', 'About'] as const

export default function Ipod() {
  const wheelRef = useRef<HTMLDivElement>(null)
  const angle = useRef<number | null>(null)
  const accum = useRef(0)

  const [songs, setSongs] = useState<Song[]>([])
  const [screen, setScreen] = useState<Screen>('menu')
  const [menuAt, setMenuAt] = useState(0)
  const [songAt, setSongAt] = useState(0)
  const [status, setStatus] = useState('')
  const track = useNowPlaying()

  const load = useCallback(async () => {
    setSongs(await listSongs())
  }, [])
  useEffect(() => { void load() }, [load])

  /* Reload when the window is looked at again, so a song added in Karaoke
     turns up here without needing a refresh button. */
  useEffect(() => {
    const on = () => { if (!document.hidden) void load() }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [load])

  const open = useCallback((index: number) => {
    const s = songs[index]
    if (!s) return
    setSongAt(index)
    setScreen('now')
    // Karaoke owns the player; this is the remote
    nowPlaying.request({ videoId: s.video_id, artist: s.artist, title: s.title })
    launch('karaoke')
  }, [songs])

  /* ---------------- the wheel ---------------- */
  const move = (steps: number) => {
    if (!steps) return
    sound.click(1.5)
    if (screen === 'menu') setMenuAt((n) => Math.min(MENU.length - 1, Math.max(0, n + steps)))
    else if (screen === 'songs') setSongAt((n) => Math.min(songs.length - 1, Math.max(0, n + steps)))
  }

  const wheelDown = (e: React.PointerEvent) => {
    /* Only the ring scrolls. If the press landed on one of the five
       buttons, leave the pointer alone — capturing it here retargets
       the events to the wheel and the button's click never fires. */
    if ((e.target as HTMLElement).closest('.ipod__wkey, .ipod__centre')) return
    const r = wheelRef.current!.getBoundingClientRect()
    angle.current = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
    accum.current = 0
    wheelRef.current?.setPointerCapture(e.pointerId)
  }

  const wheelMove = (e: React.PointerEvent) => {
    if (angle.current === null) return
    const r = wheelRef.current!.getBoundingClientRect()
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
    let d = a - angle.current
    if (d > Math.PI) d -= Math.PI * 2
    if (d < -Math.PI) d += Math.PI * 2
    angle.current = a
    accum.current += d
    const step = Math.PI / 6 // 30 degrees per click
    while (Math.abs(accum.current) >= step) {
      move(accum.current > 0 ? 1 : -1)
      accum.current -= Math.sign(accum.current) * step
    }
  }

  const wheelUp = () => { angle.current = null }

  const select = () => {
    sound.click(0.9)
    if (screen === 'menu') {
      const pick = MENU[menuAt]
      if (pick === 'Songbook') setScreen('songs')
      else if (pick === 'Now Playing') setScreen(track ? 'now' : 'songs')
      else if (pick === 'Shuffle') {
        if (songs.length) open(Math.floor(Math.random() * songs.length))
        else setStatus('The songbook is empty')
      } else if (pick === 'Add a song') launch('karaoke')
      else setStatus('')
    } else if (screen === 'songs') {
      open(songAt)
    }
  }

  const back = () => {
    sound.click(0.8)
    setScreen((s) => (s === 'now' ? 'songs' : 'menu'))
  }

  const skip = (d: number) => {
    if (!songs.length) return
    open((songAt + d + songs.length) % songs.length)
  }

  return (
    <div className="ipod">
      <div className="ipod__body">
        <div className="ipod__screen">
          {/* the flourish sits behind everything on the screen while a song runs */}
          <Flourish playing={!!track?.playing} className="ipod__flourish" />

          <div className="ipod__bar">
            <span>{screen === 'menu' ? 'iPod' : screen === 'songs' ? 'Songbook' : 'Now Playing'}</span>
            <span className="ipod__battery" aria-hidden />
          </div>

          {screen === 'menu' ? (
            <ul className="ipod__list">
              {MENU.map((m, i) => (
                <li key={m} className="ipod__item" data-on={i === menuAt}>
                  <span>{m}</span>
                  <b>›</b>
                </li>
              ))}
            </ul>
          ) : null}

          {screen === 'songs' ? (
            songs.length ? (
              <ul className="ipod__list ipod__list--songs">
                {songs.map((s, i) => (
                  <li key={s.id} className="ipod__item" data-on={i === songAt}>
                    <span className="ipod__song">
                      <b>{s.title}</b>
                      <em>{s.artist}</em>
                    </span>
                    <b>›</b>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ipod__empty">
                <p>The songbook is empty.</p>
                <p className="ipod__emptySub">
                  Anyone can add to it — an artist, a song name and a YouTube link.
                </p>
                <button className="ipod__addBtn" onClick={() => launch('karaoke')}>
                  Add the first
                </button>
              </div>
            )
          ) : null}

          {screen === 'now' ? (
            <div className="ipod__now">
              <p className="ipod__title">{track?.title ?? songs[songAt]?.title ?? '—'}</p>
              <p className="ipod__artist">{track?.artist ?? songs[songAt]?.artist ?? ''}</p>
              <p className="ipod__where">
                {track?.playing ? 'Playing in Karaoke' : 'Paused'}
              </p>
            </div>
          ) : null}

          {status ? <p className="ipod__status">{status}</p> : null}
        </div>

        {/* click wheel */}
        <div
          className="ipod__wheel"
          ref={wheelRef}
          onPointerDown={wheelDown}
          onPointerMove={wheelMove}
          onPointerUp={wheelUp}
          onPointerCancel={wheelUp}
        >
          <button className="ipod__wkey ipod__wkey--menu" onClick={back}>
            <span>MENU</span>
          </button>
          <button className="ipod__wkey ipod__wkey--prev" aria-label="Previous" onClick={() => skip(-1)}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M13 3 6.5 8 13 13Z" fill="currentColor" />
              <rect x="3.5" y="3" width="2" height="10" rx="0.6" fill="currentColor" />
            </svg>
          </button>
          <button className="ipod__wkey ipod__wkey--next" aria-label="Next" onClick={() => skip(1)}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M3 3 9.5 8 3 13Z" fill="currentColor" />
              <rect x="10.5" y="3" width="2" height="10" rx="0.6" fill="currentColor" />
            </svg>
          </button>
          <button
            className="ipod__wkey ipod__wkey--play"
            aria-label="Open in Karaoke"
            onClick={() => launch('karaoke')}
          >
            <svg viewBox="0 0 22 16" aria-hidden>
              <path d="M2 3 8 8 2 13Z" fill="currentColor" />
              <rect x="12" y="3.5" width="2.2" height="9" rx="0.6" fill="currentColor" />
              <rect x="16" y="3.5" width="2.2" height="9" rx="0.6" fill="currentColor" />
            </svg>
          </button>
          <button className="ipod__centre" aria-label="Select" onClick={select} />
        </div>
      </div>
    </div>
  )
}
