import { useCallback, useEffect, useRef, useState } from 'react'
import { listSongs, type Song } from '../lib/songs'
import { youtubeApi, type YtPlayer } from '../lib/youtube'
import { Flourish } from '../art/Flourish'
import { launch } from '../os/registry'
import { sound } from '../os/sound'

/**
 * iPod.
 *
 * Screen on top, click wheel below. The wheel really is a wheel — drag around
 * it and the selection scrolls, one step per 30° of rotation, the way the
 * original felt.
 *
 * It has its own player and its own copy of the songbook, and it shares no
 * state with Karaoke: playing something here does nothing there, and closing
 * one leaves the other alone. They only have the songbook itself in common,
 * which is a table, not a connection.
 *
 * Now Playing puts the video at the top of the screen and gives the rest to a
 * flourish that draws itself while the song runs — curling stems, rosettes,
 * scattered dots, all in one pale blue.
 */

type Screen = 'menu' | 'songs' | 'now'

const MENU = ['Songbook', 'Now Playing', 'Shuffle', 'Add a song', 'About'] as const

export default function Ipod() {
  const wheelRef = useRef<HTMLDivElement>(null)
  const holderRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const readyRef = useRef(false)
  const wantRef = useRef<string | null>(null)
  const angle = useRef<number | null>(null)
  const accum = useRef(0)

  const [songs, setSongs] = useState<Song[]>([])
  const [screen, setScreen] = useState<Screen>('menu')
  const [menuAt, setMenuAt] = useState(0)
  const [songAt, setSongAt] = useState(0)
  const [current, setCurrent] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState('')

  const songsRef = useRef(songs)
  songsRef.current = songs

  const load = useCallback(async () => setSongs(await listSongs()), [])
  useEffect(() => { void load() }, [load])

  /* ---------------- its own player ---------------- */
  useEffect(() => {
    let dead = false
    void youtubeApi().then((YT) => {
      if (dead || !holderRef.current || playerRef.current) return
      playerRef.current = new YT.Player(holderRef.current, {
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            readyRef.current = true
            if (wantRef.current) playerRef.current?.loadVideoById(wantRef.current)
          },
          onStateChange: (e: { data: number }) => {
            setPlaying(e.data === YT.PlayerState.PLAYING)
            if (e.data === YT.PlayerState.ENDED) {
              setCurrent((n) => (n !== null && n + 1 < songsRef.current.length ? n + 1 : null))
            }
          },
        },
      })
    })
    return () => {
      dead = true
      readyRef.current = false
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (current === null) return
    const s = songs[current]
    if (!s) return
    wantRef.current = s.video_id
    if (readyRef.current) playerRef.current?.loadVideoById(s.video_id)
  }, [current, songs])

  const play = useCallback((index: number) => {
    if (!songsRef.current[index]) return
    setCurrent(index)
    setSongAt(index)
    setScreen('now')
  }, [])

  const toggle = () => {
    if (current === null) return
    if (playing) playerRef.current?.pauseVideo()
    else playerRef.current?.playVideo()
  }

  const skip = (d: number) => {
    if (!songs.length) return
    play(((current ?? songAt) + d + songs.length) % songs.length)
  }

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
      else if (pick === 'Now Playing') setScreen(current === null ? 'songs' : 'now')
      else if (pick === 'Shuffle') {
        if (songs.length) play(Math.floor(Math.random() * songs.length))
        else setStatus('The songbook is empty')
      } else if (pick === 'Add a song') launch('karaoke')
      else setStatus('')
    } else if (screen === 'songs') play(songAt)
    else toggle()
  }

  const back = () => {
    sound.click(0.8)
    setScreen((s) => (s === 'now' ? 'songs' : 'menu'))
  }

  const song = current !== null ? songs[current] : undefined

  return (
    <div className="ipod">
      <div className="ipod__body">
        <div className="ipod__screen">
          {/* The player stays mounted and stays visible, whichever screen you
              are on: browsing the menu should not stop the song, and the embed
              is not something to hide behind a list. */}
          <div className="ipod__video">
            <div ref={holderRef} />
          </div>

          {screen === 'now' ? (
            <div className="ipod__panel">
              <Flourish playing={playing} className="ipod__flourish" />
              <p className="ipod__title">{song?.title ?? '—'}</p>
              <p className="ipod__artist">{song?.artist ?? ''}</p>
              <p className="ipod__where">{playing ? 'Playing' : 'Paused'}</p>
            </div>
          ) : (
          <div className="ipod__lists">
            <div className="ipod__bar">
              <span>{screen === 'menu' ? 'iPod' : 'Songbook'}</span>
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
            ) : songs.length ? (
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
            )}

            {status ? <p className="ipod__status">{status}</p> : null}
          </div>
          )}
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
          <button className="ipod__wkey ipod__wkey--play" aria-label="Play or pause" onClick={toggle}>
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
