import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYLIST } from '../content/playlist'
import { addTrack, listTracks, removeTrack, type StoredTrack } from '../lib/tracks'
import { sound } from '../os/sound'

/**
 * iPod.
 *
 * First-generation shell: screen on top, click wheel below. The wheel really
 * is a wheel — drag around it and the selection scrolls, one step per 30° of
 * rotation, the way the original felt.
 */

interface Track {
  id: string
  title: string
  artist: string
  src: string
  mine?: boolean
}

type Screen = 'menu' | 'songs' | 'now'

const MENU = ['Music', 'Now Playing', 'Shuffle Songs', 'Add Music', 'About'] as const

export default function Ipod() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const angle = useRef<number | null>(null)
  const accum = useRef(0)
  const urls = useRef<string[]>([])

  const [mine, setMine] = useState<StoredTrack[]>([])
  const [screen, setScreen] = useState<Screen>('menu')
  const [menuAt, setMenuAt] = useState(0)
  const [songAt, setSongAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [status, setStatus] = useState('')

  /* built-in playlist plus whatever this visitor added */
  const tracks: Track[] = [
    ...PLAYLIST.map((t, i) => ({ id: `p${i}`, title: t.title, artist: t.artist, src: t.src })),
    ...mine.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      src: URL.createObjectURL(t.blob),
      mine: true,
    })),
  ]

  useEffect(() => {
    void listTracks().then(setMine)
    return () => urls.current.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  useEffect(() => {
    tracks.filter((t) => t.mine).forEach((t) => urls.current.push(t.src))
  })

  const play = useCallback(
    (index: number) => {
      const t = tracks[index]
      if (!t) return
      setCurrent(index)
      setScreen('now')
      const el = audioRef.current
      if (!el) return
      el.src = t.src
      el.play().then(
        () => setPlaying(true),
        () => setStatus('That file would not play'),
      )
    },
    [tracks],
  )

  const toggle = () => {
    const el = audioRef.current
    if (!el || current === null) return
    if (el.paused) {
      void el.play()
      setPlaying(true)
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  const skip = (d: number) => {
    if (current === null || !tracks.length) return
    play((current + d + tracks.length) % tracks.length)
  }

  /* ---------------- the wheel ---------------- */
  const move = (steps: number) => {
    if (!steps) return
    sound.click(1.5)
    if (screen === 'menu') setMenuAt((n) => Math.min(MENU.length - 1, Math.max(0, n + steps)))
    else if (screen === 'songs') setSongAt((n) => Math.min(tracks.length - 1, Math.max(0, n + steps)))
    else if (screen === 'now') {
      const el = audioRef.current
      if (el && el.duration) el.currentTime = Math.min(el.duration, Math.max(0, el.currentTime + steps * 5))
    }
  }

  const wheelDown = (e: React.PointerEvent) => {
    const r = wheelRef.current!.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    angle.current = Math.atan2(e.clientY - cy, e.clientX - cx)
    accum.current = 0
    wheelRef.current?.setPointerCapture(e.pointerId)
  }

  const wheelMove = (e: React.PointerEvent) => {
    if (angle.current === null) return
    const r = wheelRef.current!.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const a = Math.atan2(e.clientY - cy, e.clientX - cx)
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

  const wheelUp = () => {
    angle.current = null
  }

  const select = () => {
    sound.click(0.9)
    if (screen === 'menu') {
      const pick = MENU[menuAt]
      if (pick === 'Music') setScreen('songs')
      else if (pick === 'Now Playing') setScreen(current === null ? 'songs' : 'now')
      else if (pick === 'Shuffle Songs') {
        if (tracks.length) play(Math.floor(Math.random() * tracks.length))
      } else if (pick === 'Add Music') fileRef.current?.click()
      else setStatus('')
    } else if (screen === 'songs') {
      play(songAt)
    } else {
      toggle()
    }
  }

  const back = () => {
    sound.click(0.8)
    setScreen((s) => (s === 'now' ? 'songs' : s === 'songs' ? 'menu' : 'menu'))
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setStatus('Adding…')
    for (const f of Array.from(files).slice(0, 12)) {
      if (!f.type.startsWith('audio/')) continue
      await addTrack(f)
    }
    setMine(await listTracks())
    setStatus('')
    setScreen('songs')
  }

  const drop = async (id: string) => {
    await removeTrack(id)
    setMine(await listTracks())
  }

  const fmt = (n: number) =>
    `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`

  const track = current !== null ? tracks[current] : null

  return (
    <div className="ipod">
      <div className="ipod__body">
        {/* screen */}
        <div className="ipod__screen">
          <div className="ipod__bar">
            <span>{screen === 'menu' ? 'iPod' : screen === 'songs' ? 'Songs' : 'Now Playing'}</span>
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
            tracks.length ? (
              <ul className="ipod__list ipod__list--songs">
                {tracks.map((t, i) => (
                  <li key={t.id} className="ipod__item" data-on={i === songAt}>
                    <span className="ipod__song">
                      <b>{t.title}</b>
                      <em>{t.artist}</em>
                    </span>
                    {t.mine ? (
                      <button
                        className="ipod__drop"
                        aria-label={`Remove ${t.title}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void drop(t.id)
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ipod__empty">
                <p>No songs yet.</p>
                <p className="ipod__emptySub">
                  Add your own — they stay in this browser and are never uploaded.
                </p>
                <button className="ipod__addBtn" onClick={() => fileRef.current?.click()}>
                  Add music
                </button>
              </div>
            )
          ) : null}

          {screen === 'now' ? (
            <div className="ipod__now">
              <div className="ipod__art" data-spin={playing}>
                <span />
              </div>
              <p className="ipod__title">{track?.title ?? '—'}</p>
              <p className="ipod__artist">{track?.artist ?? ''}</p>
              <div className="ipod__scrub">
                <i style={{ width: dur ? `${(time / dur) * 100}%` : '0%' }} />
              </div>
              <div className="ipod__times">
                <span>{fmt(time)}</span>
                <span>{dur ? `-${fmt(Math.max(0, dur - time))}` : '--:--'}</span>
              </div>
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
            MENU
          </button>
          <button className="ipod__wkey ipod__wkey--prev" aria-label="Previous" onClick={() => skip(-1)}>
            ⏮
          </button>
          <button className="ipod__wkey ipod__wkey--next" aria-label="Next" onClick={() => skip(1)}>
            ⏭
          </button>
          <button className="ipod__wkey ipod__wkey--play" aria-label="Play or pause" onClick={toggle}>
            ⏯
          </button>
          <button className="ipod__centre" aria-label="Select" onClick={select} />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => void upload(e.target.files)}
      />

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDur(e.currentTarget.duration || 0)}
        onEnded={() => skip(1)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
    </div>
  )
}
