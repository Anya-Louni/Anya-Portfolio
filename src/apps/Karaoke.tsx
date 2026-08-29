/**
 * Karaoke.
 *
 * The shared songbook, played through YouTube's own IFrame player. Nothing
 * here holds audio: a song is an artist, a title and a video id, and the
 * recording is served by YouTube under YouTube's licences. That is the whole
 * of the legal design, and it is why anyone can add to this library without
 * it becoming a problem.
 *
 * The player stays visible and full size, which is both what YouTube's terms
 * ask for and the point — a karaoke video carries its own words, so the
 * lyrics come with the picture rather than from a lyrics database this site
 * would have no right to reproduce.
 *
 * The microphone, if you let it in, never leaves the browser. It drives a
 * level meter and nothing else: no recording, no upload, no server.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addSong, isRemote, listSongs, thumbFor, videoIdFrom, type Song } from '../lib/songs'
import { nowPlaying, usePlayVersion } from '../os/nowPlaying'
import { sound } from '../os/sound'

/* The IFrame API arrives as a global and calls a global back. Both are
   YouTube's contract, so they are declared rather than wrapped. */
declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YtPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}
interface YtPlayer {
  loadVideoById(id: string): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
  getPlayerState(): number
  getCurrentTime(): number
  getDuration(): number
  setVolume(v: number): void
}

let apiPromise: Promise<void> | null = null
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve()
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return apiPromise
}

export default function Karaoke() {
  const [songs, setSongs] = useState<Song[]>([])
  const [at, setAt] = useState<number>(-1)
  const [playing, setPlaying] = useState(false)
  const [big, setBig] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ artist: '', title: '', link: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mic, setMic] = useState<'off' | 'asking' | 'on' | 'denied'>('off')
  const [level, setLevel] = useState(0)
  const [query, setQuery] = useState('')

  const holderRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const micStop = useRef<(() => void) | null>(null)
  /* The player ignores loadVideoById until it says it is ready, silently. */
  const readyRef = useRef(false)
  const wantRef = useRef<string | null>(null)

  const song = at >= 0 ? songs[at] : undefined

  /* The iPod hands songs over through the store. Taking the request here
     rather than from window params means it works whether this window was
     already open or has just been created by the hand-over. */
  const version = usePlayVersion()
  useEffect(() => {
    const want = nowPlaying.take()
    if (!want) return
    const i = songs.findIndex((s) => s.video_id === want.videoId)
    if (i >= 0) setAt(i)
    else {
      // the list here is older than the one the iPod was reading
      void listSongs().then((rows) => {
        setSongs(rows)
        const j = rows.findIndex((s) => s.video_id === want.videoId)
        if (j >= 0) setAt(j)
      })
    }
  }, [version, songs])

  const load = useCallback(async () => {
    const rows = await listSongs()
    setSongs(rows)
  }, [])

  useEffect(() => { void load() }, [load])

  /* ---------------- the player ---------------- */
  useEffect(() => {
    let dead = false
    void loadApi().then(() => {
      if (dead || !holderRef.current || playerRef.current) return
      playerRef.current = new window.YT!.Player(holderRef.current, {
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            readyRef.current = true
            // whatever was asked for while it was still starting up
            if (wantRef.current) playerRef.current?.loadVideoById(wantRef.current)
          },
          onStateChange: (e: { data: number }) => {
            const S = window.YT!.PlayerState
            setPlaying(e.data === S.PLAYING)
            if (e.data === S.ENDED) setAt((n) => (n + 1 < songs.length ? n + 1 : -1))
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
    // built once: re-creating the player on every song change would restart the API
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!song) return
    wantRef.current = song.video_id
    if (readyRef.current) playerRef.current?.loadVideoById(song.video_id)
  }, [song])

  /* The iPod's screen listens to this, so the flourish and the track name it
     shows follow whatever is playing here. */
  useEffect(() => {
    nowPlaying.set(song ? { artist: song.artist, title: song.title, playing } : null)
  }, [song, playing])
  useEffect(() => () => nowPlaying.set(null), [])

  /* ---------------- the microphone ---------------- */
  const listen = async () => {
    if (mic === 'on') {
      micStop.current?.()
      micStop.current = null
      setMic('off')
      setLevel(0)
      return
    }
    setMic('asking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new C()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      src.connect(analyser)
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
        // root mean square, scaled so ordinary singing lands near the top
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6))
      }
      tick()
      micStop.current = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach((t) => t.stop())
        void ctx.close()
      }
      setMic('on')
    } catch {
      setMic('denied')
    }
  }
  useEffect(() => () => micStop.current?.(), [])

  /* ---------------- adding ---------------- */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const res = await addSong(form)
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setSongs((all) => [res.song, ...all])
    setForm({ artist: '', title: '', link: '' })
    setAdding(false)
    sound.click(1.1)
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return songs
    return songs.filter((s) => `${s.artist} ${s.title}`.toLowerCase().includes(q))
  }, [songs, query])

  const preview = videoIdFrom(form.link)

  return (
    <div className="kar" data-big={big}>
      <div className="kar__stage">
        <div className="kar__screen">
          {/* YouTube replaces this div with its iframe, so the wrapper is what
              carries the layout — anything on the inner div is thrown away. */}
          <div className="kar__player">
            <div ref={holderRef} />
          </div>
          {!song ? (
            <div className="kar__empty">
              <b>Pick a song</b>
              <span>
                Anything on YouTube plays here. Search for a karaoke version and the words come
                with the picture.
              </span>
            </div>
          ) : null}
        </div>

        <div className="kar__under">
          <div className="kar__meta">
            <b>{song ? song.title : '—'}</b>
            <span>{song ? song.artist : 'Nothing playing'}</span>
          </div>

          <button className="kar__btn" onClick={() => setBig((b) => !b)}>
            {big ? 'Show the songbook' : 'Fill the window'}
          </button>

          <button className="kar__btn" data-on={mic === 'on'} onClick={() => void listen()}>
            {mic === 'on' ? 'Stop listening' : mic === 'asking' ? 'Asking…' : 'Sing along'}
          </button>

          <div className="kar__meter" data-on={mic === 'on'} title="Your microphone, measured in this browser only">
            <i style={{ transform: `scaleX(${mic === 'on' ? level : 0})` }} />
          </div>
        </div>

        {mic === 'denied' ? (
          <p className="kar__note">
            The microphone was refused, which is fine — everything else works without it. It was
            only ever going to drive that meter; nothing is recorded and nothing is sent anywhere.
          </p>
        ) : null}
      </div>

      <aside className="kar__book">
        <header className="kar__bookHead">
          <b>Songbook</b>
          <span>{songs.length} added{isRemote ? '' : ' · this browser only'}</span>
        </header>

        <div className="kar__tools">
          <input
            className="kar__search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a song"
            aria-label="Find a song"
          />
          <button className="kar__add" onClick={() => setAdding((a) => !a)}>
            {adding ? 'Cancel' : 'Add'}
          </button>
        </div>

        {adding ? (
          <form className="kar__form" onSubmit={(e) => void submit(e)}>
            <label>
              Artist
              <input
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                maxLength={60}
                required
              />
            </label>
            <label>
              Song
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={90}
                required
              />
            </label>
            <label>
              YouTube link
              <input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://youtube.com/watch?v=…"
                required
              />
            </label>
            {preview ? <img className="kar__thumb" src={thumbFor(preview)} alt="" /> : null}
            {error ? <p className="kar__error">{error}</p> : null}
            <button className="kar__go" disabled={busy}>
              {busy ? 'Adding…' : 'Add to the songbook'}
            </button>
            <p className="kar__small">
              Only the artist, the song name and the link are kept. The music stays on YouTube.
            </p>
          </form>
        ) : null}

        <ul className="kar__list">
          {shown.map((s) => {
            const i = songs.indexOf(s)
            return (
              <li key={s.id}>
                <button
                  className="kar__song"
                  data-on={i === at}
                  onClick={() => { setAt(i); sound.click(0.9) }}
                >
                  <img src={thumbFor(s.video_id)} alt="" loading="lazy" />
                  <span>
                    <b>{s.title}</b>
                    <em>{s.artist}</em>
                  </span>
                </button>
              </li>
            )
          })}
          {!shown.length ? (
            <li className="kar__none">
              {songs.length ? 'Nothing matches that.' : 'The songbook is empty. Add the first one.'}
            </li>
          ) : null}
        </ul>
      </aside>
    </div>
  )
}
