import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYLIST } from '../content/playlist'
import {
  addFile, addLink, listTracks, removeTrack, videoIdFrom, youtubeApi,
  type StoredTrack, type TrackKind, type YtPlayer,
} from '../lib/tracks'
import { Flourish } from '../art/Flourish'
import { sound } from '../os/sound'

/**
 * iPod.
 *
 * First-generation shell: screen on top, click wheel below. The wheel really
 * is a wheel — drag around it and the selection scrolls, one step per 30° of
 * rotation, the way the original felt.
 *
 * Two kinds of track live in it. A file stays in this browser and is never
 * uploaded; a YouTube link stores an eleven-character id and no audio at all,
 * and plays through YouTube's own player.
 *
 * Either way the screen shows the flourish rather than a picture. For a file
 * it breathes with the music, because a file is ours to measure. For a link it
 * draws on its own timing — the audio is inside a cross-origin frame and
 * cannot be read from out here.
 *
 * Either way the artist and the song name are typed by hand. A filename is a
 * poor guess at both and a link is worse.
 */

interface Track {
  id: string
  title: string
  artist: string
  kind: TrackKind
  /** an object URL, for a file */
  src?: string
  videoId?: string
  mine?: boolean
}

type Screen = 'menu' | 'songs' | 'now' | 'add'

const MENU = ['Music', 'Now Playing', 'Shuffle Songs', 'Add Music', 'About'] as const

export default function Ipod() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const holderRef = useRef<HTMLDivElement>(null)
  const ytRef = useRef<YtPlayer | null>(null)
  const ytReady = useRef(false)
  const ytWant = useRef<string | null>(null)
  const angle = useRef<number | null>(null)
  const accum = useRef(0)
  const urls = useRef<string[]>([])
  const acRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const [mine, setMine] = useState<StoredTrack[]>([])
  const [screen, setScreen] = useState<Screen>('menu')
  const [menuAt, setMenuAt] = useState(0)
  const [songAt, setSongAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [status, setStatus] = useState('')
  const [level, setLevel] = useState(0)
  const [form, setForm] = useState({ artist: '', title: '', link: '' })
  const [file, setFile] = useState<File | null>(null)

  /* the built-in playlist plus whatever this visitor added */
  const tracks: Track[] = [
    ...PLAYLIST.map((t, i) => ({
      id: `p${i}`, title: t.title, artist: t.artist, kind: 'file' as const, src: t.src,
    })),
    ...mine.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      kind: t.kind,
      src: t.blob ? URL.createObjectURL(t.blob) : undefined,
      videoId: t.videoId,
      mine: true,
    })),
  ]

  useEffect(() => {
    void listTracks().then(setMine)
    return () => urls.current.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  useEffect(() => {
    tracks.filter((t) => t.mine && t.src).forEach((t) => urls.current.push(t.src!))
  })

  const track = current !== null ? tracks[current] : null

  const skipRef = useRef<(d: number) => void>(() => {})

  /* ---------------- the link half ---------------- */
  useEffect(() => {
    let dead = false
    void youtubeApi().then((YT) => {
      if (dead || !holderRef.current || ytRef.current) return
      ytRef.current = new YT.Player(holderRef.current, {
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            ytReady.current = true
            // whatever was asked for while it was still starting up
            if (ytWant.current) ytRef.current?.loadVideoById(ytWant.current)
          },
          onStateChange: (e: { data: number }) => {
            setPlaying(e.data === YT.PlayerState.PLAYING)
            if (e.data === YT.PlayerState.ENDED) skipRef.current(1)
          },
        },
      })
    })
    return () => {
      dead = true
      ytReady.current = false
      ytRef.current?.destroy()
      ytRef.current = null
    }
  }, [])

  /* ---------------- the file half ---------------- */
  /* Routed through an analyser so the flourish can breathe with the music.
     createMediaElementSource may only be called once for an element, and it
     takes the audio out of the default path — so it has to be connected on to
     the destination or the iPod goes silent. */
  const listen = useCallback(() => {
    const el = audioRef.current
    if (!el || acRef.current) return
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!C) return
    const ctx = new C()
    const src = ctx.createMediaElementSource(el)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    src.connect(analyser)
    analyser.connect(ctx.destination)
    acRef.current = ctx
    analyserRef.current = analyser
  }, [])

  const fileKind = track?.kind !== 'youtube'

  useEffect(() => {
    if (!playing || !fileKind) { setLevel(0); return }
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Uint8Array(analyser.frequencyBinCount)
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3))
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [playing, fileKind])

  useEffect(() => () => { void acRef.current?.close() }, [])

  /* A link reports its position on request rather than as it moves, so the
     scrub bar has to ask. The audio element pushes its own timeupdate, which
     is why this only runs for links. */
  useEffect(() => {
    if (fileKind || !playing) return
    const id = window.setInterval(() => {
      const p = ytRef.current
      if (!p) return
      setTime(p.getCurrentTime?.() ?? 0)
      setDur(p.getDuration?.() ?? 0)
    }, 250)
    return () => window.clearInterval(id)
  }, [fileKind, playing])

  /* ---------------- playing ---------------- */
  const play = useCallback((index: number) => {
    const t = tracks[index]
    if (!t) return
    setCurrent(index)
    setSongAt(index)
    setScreen('now')
    const el = audioRef.current

    if (t.kind === 'youtube' && t.videoId) {
      el?.pause()
      ytWant.current = t.videoId
      if (ytReady.current) ytRef.current?.loadVideoById(t.videoId)
      return
    }
    ytRef.current?.pauseVideo()
    if (!el || !t.src) return
    listen()
    void acRef.current?.resume()
    el.src = t.src
    el.play().then(() => setPlaying(true), () => setStatus('That file would not play'))
  }, [tracks, listen])

  const toggle = () => {
    if (!track) return
    if (track.kind === 'youtube') {
      if (playing) ytRef.current?.pauseVideo()
      else ytRef.current?.playVideo()
      return
    }
    const el = audioRef.current
    if (!el) return
    if (el.paused) { void el.play(); setPlaying(true) }
    else { el.pause(); setPlaying(false) }
  }

  const skip = useCallback((d: number) => {
    if (!tracks.length) return
    const from = current ?? songAt
    play((((from + d) % tracks.length) + tracks.length) % tracks.length)
  }, [tracks.length, current, songAt, play])
  skipRef.current = skip

  /* ---------------- the wheel ---------------- */
  const move = (steps: number) => {
    if (!steps) return
    sound.click(1.5)
    if (screen === 'menu') setMenuAt((n) => Math.min(MENU.length - 1, Math.max(0, n + steps)))
    else if (screen === 'songs') setSongAt((n) => Math.min(tracks.length - 1, Math.max(0, n + steps)))
    else if (screen === 'now' && track?.kind === 'file') {
      const el = audioRef.current
      if (el && el.duration) el.currentTime = Math.min(el.duration, Math.max(0, el.currentTime + steps * 5))
    }
  }

  /* Keep the highlighted row on screen. The wheel moves a selection, not a
     scrollbar, so past the fifth song the list simply stopped following —
     which is what it looked like when it would not scroll. */
  useEffect(() => {
    const at = screen === 'songs' ? songAt : screen === 'menu' ? menuAt : -1
    if (at < 0) return
    const el = listRef.current?.children[at] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [songAt, menuAt, screen])

  /* The four labels sit on the top, bottom, left and right of the ring, which
     is most of it — so refusing to start a drag on them left only the four
     diagonal scraps of wheel actually draggable, and the menu looked stuck.
     Now the whole ring drags, and a press that never moved is treated as a
     press of whatever was under it. */
  const dragged = useRef(false)
  const pressed = useRef<string | null>(null)
  const from = useRef({ x: 0, y: 0 })

  const wheelDown = (e: React.PointerEvent) => {
    const key = (e.target as HTMLElement).closest<HTMLElement>('[data-key]')
    pressed.current = key?.dataset.key ?? null
    dragged.current = false
    from.current = { x: e.clientX, y: e.clientY }
    const r = wheelRef.current!.getBoundingClientRect()
    angle.current = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
    accum.current = 0
    wheelRef.current?.setPointerCapture(e.pointerId)
  }

  const wheelMove = (e: React.PointerEvent) => {
    if (angle.current === null) return
    // a few pixels of slop, so a slightly shaky click is still a click
    if (!dragged.current && Math.hypot(e.clientX - from.current.x, e.clientY - from.current.y) < 7) return
    dragged.current = true
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

  const wheelUp = () => {
    if (!dragged.current && pressed.current) press(pressed.current)
    angle.current = null
    pressed.current = null
  }

  const press = (key: string) => {
    if (key === 'menu') back()
    else if (key === 'prev') skip(-1)
    else if (key === 'next') skip(1)
    else if (key === 'play') toggle()
    else if (key === 'centre') select()
    else if (key === 'up') move(-1)
    else if (key === 'down') move(1)
  }

  const select = () => {
    sound.click(0.9)
    if (screen === 'menu') {
      const pick = MENU[menuAt]
      if (pick === 'Music') setScreen('songs')
      else if (pick === 'Now Playing') setScreen(current === null ? 'songs' : 'now')
      else if (pick === 'Shuffle Songs') {
        if (tracks.length) play(Math.floor(Math.random() * tracks.length))
        else setStatus('Nothing to shuffle yet')
      } else if (pick === 'Add Music') { setStatus(''); setScreen('add') }
      else setStatus('')
    } else if (screen === 'songs') play(songAt)
    else if (screen === 'now') toggle()
  }

  const back = () => {
    sound.click(0.8)
    setStatus('')
    setScreen((s) => (s === 'now' ? 'songs' : s === 'songs' || s === 'add' ? 'menu' : 'menu'))
  }

  /* ---------------- adding ---------------- */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const artist = form.artist.trim()
    const title = form.title.trim()
    if (!artist || !title) { setStatus('Both names, please'); return }

    if (file) {
      await addFile(file, artist, title)
    } else {
      const id = videoIdFrom(form.link)
      if (!id) { setStatus('That is not a YouTube link'); return }
      await addLink(id, artist, title)
    }
    setMine(await listTracks())
    setForm({ artist: '', title: '', link: '' })
    setFile(null)
    setStatus('')
    setScreen('songs')
    sound.click(1.1)
  }

  const drop = async (id: string) => {
    await removeTrack(id)
    setMine(await listTracks())
  }

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`
  const onLink = screen === 'now' && track?.kind === 'youtube'
  void onLink

  return (
    <div
      className="ipod"
      /* The ring is charming and fiddly. A scroll wheel over the iPod moves the
         same selection, which is what most people reach for first. */
      onWheel={(e) => {
        if (screen !== 'menu' && screen !== 'songs') return
        e.preventDefault()
        move(e.deltaY > 0 ? 1 : -1)
      }}
    >
      <div className="ipod__body">
        <div className="ipod__screen">
          {/* Mounted once and shown whenever a link is the current track. It
              is never hidden while it is playing. */}
          <div className="ipod__yt">
            <div ref={holderRef} />
          </div>

          {(
            <>
              <div className="ipod__bar">
                <span>
                  {screen === 'menu' ? 'iPod'
                    : screen === 'songs' ? 'Songs'
                    : screen === 'add' ? 'Add Music'
                    : 'Now Playing'}
                </span>
                <span className="ipod__battery" aria-hidden />
              </div>

              {screen === 'menu' ? (
                <ul className="ipod__list" ref={listRef}>
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
                  <ul className="ipod__list ipod__list--songs" ref={listRef}>
                    {tracks.map((t, i) => (
                      <li key={t.id} className="ipod__item" data-on={i === songAt}>
                        <span className="ipod__song">
                          <b>{t.title}</b>
                          <em>{t.artist}{t.kind === 'youtube' ? ' · link' : ''}</em>
                        </span>
                        {t.mine ? (
                          <button
                            className="ipod__drop"
                            aria-label={`Remove ${t.title}`}
                            onClick={(e) => { e.stopPropagation(); void drop(t.id) }}
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
                      Add a file from this machine, or paste a YouTube link.
                    </p>
                    <button className="ipod__addBtn" onClick={() => setScreen('add')}>
                      Add music
                    </button>
                  </div>
                )
              ) : null}

              {screen === 'add' ? (
                <form className="ipod__add" onSubmit={(e) => void submit(e)}>
                  <label>
                    <span>Artist</span>
                    <input
                      value={form.artist}
                      onChange={(e) => setForm({ ...form, artist: e.target.value })}
                      maxLength={40}
                    />
                  </label>
                  <label>
                    <span>Song</span>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      maxLength={60}
                    />
                  </label>
                  {file ? (
                    <div className="ipod__chosen">
                      <b>{file.name}</b>
                      <button type="button" onClick={() => setFile(null)}>use a link instead</button>
                    </div>
                  ) : (
                    <>
                      <label>
                        <span>YouTube link</span>
                        <input
                          value={form.link}
                          onChange={(e) => setForm({ ...form, link: e.target.value })}
                          placeholder="youtube.com/watch?v=…"
                        />
                      </label>
                      <label className="ipod__pick">
                        <span>or a file from this machine</span>
                        <input
                          type="file"
                          accept="audio/*"
                          hidden
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </>
                  )}
                  <button className="ipod__addBtn" type="submit">Add it</button>
                </form>
              ) : null}

              {screen === 'now' ? (
                <div className="ipod__now">
                  <Flourish playing={playing} level={level} className="ipod__flourish" />
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
            </>
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
          <button className="ipod__wkey ipod__wkey--menu" data-key="menu" onClick={() => press('menu')}>
            <span>MENU</span>
          </button>
          <button className="ipod__wkey ipod__wkey--prev" data-key="prev" aria-label="Previous" onClick={() => press('prev')}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M13 3 6.5 8 13 13Z" fill="currentColor" />
              <rect x="3.5" y="3" width="2" height="10" rx="0.6" fill="currentColor" />
            </svg>
          </button>
          <button className="ipod__wkey ipod__wkey--next" data-key="next" aria-label="Next" onClick={() => press('next')}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M3 3 9.5 8 3 13Z" fill="currentColor" />
              <rect x="10.5" y="3" width="2" height="10" rx="0.6" fill="currentColor" />
            </svg>
          </button>
          <button className="ipod__wkey ipod__wkey--play" data-key="play" aria-label="Play or pause" onClick={() => press('play')}>
            <svg viewBox="0 0 22 16" aria-hidden>
              <path d="M2 3 8 8 2 13Z" fill="currentColor" />
              <rect x="12" y="3.5" width="2.2" height="9" rx="0.6" fill="currentColor" />
              <rect x="16" y="3.5" width="2.2" height="9" rx="0.6" fill="currentColor" />
            </svg>
          </button>
          <button className="ipod__centre" data-key="centre" aria-label="Select" onClick={() => press('centre')} />
          {/* Two invisible bands across the top and bottom of the centre
              button. Nothing is drawn for them; the button still looks like
              one piece. The middle band is the button itself, so select still
              works where it always did. */}
          <button
            className="ipod__nudge ipod__nudge--up"
            data-key="up"
            aria-label="Up"
            onClick={() => press('up')}
          />
          <button
            className="ipod__nudge ipod__nudge--down"
            data-key="down"
            aria-label="Down"
            onClick={() => press('down')}
          />
        </div>
      </div>

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
