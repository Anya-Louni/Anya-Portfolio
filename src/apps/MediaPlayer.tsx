import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYLIST } from '../content/playlist'
import { addFile, listTracks, type StoredTrack } from '../lib/tracks'

/**
 * Windows Media Player.
 *
 * The visualiser is the point. Real FFT off the playing audio drives four
 * modes: Bars, Scope, Ambience and Ocean Mist — the last two being the ones
 * that made people leave WMP open with the music off.
 *
 * It shares the iPod's library, so anything added in one shows in the other.
 */

type Viz = 'bars' | 'scope' | 'ambience' | 'mist'

const VIZ: { id: Viz; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'scope', label: 'Scope' },
  { id: 'ambience', label: 'Ambience' },
  { id: 'mist', label: 'Ocean Mist' },
]

interface Track {
  id: string
  title: string
  artist: string
  src: string
}

export default function MediaPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const wiredRef = useRef(false)
  const vizRef = useRef<Viz>('bars')

  const [mine, setMine] = useState<StoredTrack[]>([])
  const [current, setCurrent] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [viz, setViz] = useState<Viz>('bars')
  vizRef.current = viz

  /* Files only. The visualiser reads the waveform, and a track that is a
     YouTube link has no waveform here to read — the audio is inside a
     cross-origin frame, which is exactly why the iPod shows the video for
     those instead of a flourish. */
  const tracks: Track[] = [
    ...PLAYLIST.map((t, i) => ({ id: `p${i}`, title: t.title, artist: t.artist, src: t.src })),
    ...mine
      .filter((t) => t.kind === 'file' && t.blob)
      .map((t) => ({ id: t.id, title: t.title, artist: t.artist, src: URL.createObjectURL(t.blob!) })),
  ]

  useEffect(() => {
    void listTracks().then(setMine)
  }, [])

  /* the analyser is wired once, on the first play, because a context
     created before a user gesture is born suspended */
  const wire = useCallback(() => {
    const el = audioRef.current
    if (!el || wiredRef.current) return
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new C()
    const src = ctx.createMediaElementSource(el)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.78
    src.connect(analyser).connect(ctx.destination)
    ctxRef.current = ctx
    analyserRef.current = analyser
    wiredRef.current = true
  }, [])

  const play = (i: number) => {
    const t = tracks[i]
    if (!t) return
    setCurrent(i)
    const el = audioRef.current
    if (!el) return
    el.src = t.src
    wire()
    void ctxRef.current?.resume()
    void el.play()
  }

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (current === null) {
      if (tracks.length) play(0)
      return
    }
    wire()
    void ctxRef.current?.resume()
    if (el.paused) void el.play()
    else el.pause()
  }

  const skip = (d: number) => {
    if (current === null || !tracks.length) return
    play((current + d + tracks.length) % tracks.length)
  }

  useEffect(() => {
    const el = audioRef.current
    if (el) el.volume = volume
  }, [volume])

  /* ---------------- the visualiser ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let W = 0
    let H = 0
    let t = 0

    const size = () => {
      /* offsetWidth, not getBoundingClientRect: a window measured during its
         open animation is still scaled, and the rect reports the scaled size —
         the canvas ends up permanently 92% of its container. Transforms do not
         retrigger a ResizeObserver, so it never corrects itself. */
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = Math.max(120, host.offsetWidth)
      H = Math.max(90, host.offsetHeight)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(size)
    ro.observe(host)
    size()

    const freq = new Uint8Array(1024)
    const wave = new Uint8Array(2048)

    const frame = () => {
      t += 1
      const an = analyserRef.current
      if (an) {
        an.getByteFrequencyData(freq)
        an.getByteTimeDomainData(wave)
      } else {
        // nothing playing yet — a slow idle wave so it never looks broken
        for (let i = 0; i < freq.length; i++) {
          freq[i] = Math.max(0, Math.sin(i / 24 + t / 40) * 40 + 46 - i / 22)
        }
        for (let i = 0; i < wave.length; i++) {
          wave[i] = 128 + Math.sin(i / 40 + t / 22) * 16
        }
      }

      const mode = vizRef.current
      ctx.fillStyle = '#050a16'
      ctx.fillRect(0, 0, W, H)

      if (mode === 'bars') {
        const n = 56
        const bw = W / n
        for (let i = 0; i < n; i++) {
          const v = freq[Math.floor((i / n) * 220)] / 255
          const h = Math.max(2, v * H * 0.92)
          const g = ctx.createLinearGradient(0, H, 0, H - h)
          g.addColorStop(0, '#1f66d0')
          g.addColorStop(0.55, '#35c8f0')
          g.addColorStop(1, '#b8f6ff')
          ctx.fillStyle = g
          ctx.fillRect(i * bw + 1, H - h, bw - 2, h)
          ctx.fillStyle = 'rgba(255,255,255,0.75)'
          ctx.fillRect(i * bw + 1, H - h - 2, bw - 2, 2)
        }
      } else if (mode === 'scope') {
        ctx.strokeStyle = '#5fdcff'
        ctx.lineWidth = 2.4
        ctx.shadowBlur = 14
        ctx.shadowColor = '#2ba6e8'
        ctx.beginPath()
        for (let i = 0; i < wave.length; i += 2) {
          const x = (i / wave.length) * W
          const y = (wave[i] / 255) * H
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      } else if (mode === 'ambience') {
        let energy = 0
        for (let i = 0; i < 200; i++) energy += freq[i]
        energy /= 200 * 255
        for (let i = 0; i < 5; i++) {
          const a = t / 90 + i * 1.26
          const r = (0.22 + energy * 0.5) * Math.min(W, H) * (0.6 + i * 0.16)
          const x = W / 2 + Math.cos(a) * W * 0.13
          const y = H / 2 + Math.sin(a * 1.3) * H * 0.13
          const g = ctx.createRadialGradient(x, y, 0, x, y, r)
          g.addColorStop(0, `hsla(${(i * 52 + t / 2) % 360} 90% 62% / 0.5)`)
          g.addColorStop(1, 'hsla(220 90% 50% / 0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // Ocean Mist: a bright horizon with a reactive swell
        const sky = ctx.createLinearGradient(0, 0, 0, H)
        sky.addColorStop(0, '#0a4bc4')
        sky.addColorStop(0.55, '#2b80e6')
        sky.addColorStop(1, '#67e4ef')
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, W, H)
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath()
          ctx.moveTo(0, H)
          for (let x = 0; x <= W; x += 6) {
            const i = Math.floor((x / W) * 300)
            const amp = (freq[i] / 255) * 26 + 6
            const y =
              H * (0.58 + layer * 0.13) +
              Math.sin(x / 60 + t / 26 + layer) * amp -
              layer * 4
            ctx.lineTo(x, y)
          }
          ctx.lineTo(W, H)
          ctx.closePath()
          ctx.fillStyle = `rgba(255,255,255,${0.14 + layer * 0.1})`
          ctx.fill()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    for (const f of Array.from(files).slice(0, 12)) {
      if (f.type.startsWith('audio/')) await addFile(f, 'You', f.name.replace(/\.[^.]+$/, ''))
    }
    setMine(await listTracks())
  }

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`
  const track = current !== null ? tracks[current] : null

  return (
    <div className="wmp">
      <div className="wmp__viz" ref={hostRef}>
        <canvas ref={canvasRef} className="wmp__canvas" />
        <div className="wmp__vizPick">
          {VIZ.map((v) => (
            <button key={v.id} className="wmp__vizBtn" data-on={viz === v.id} onClick={() => setViz(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <p className="wmp__now">
          {track ? (
            <>
              <b>{track.title}</b> <em>{track.artist}</em>
            </>
          ) : (
            <em>Nothing playing</em>
          )}
        </p>
      </div>

      <div className="wmp__transport">
        <button className="wmp__btn" onClick={() => skip(-1)} aria-label="Previous">⏮</button>
        <button className="wmp__btn wmp__btn--play" onClick={toggle} aria-label="Play or pause">
          {playing ? '⏸' : '▶'}
        </button>
        <button className="wmp__btn" onClick={() => skip(1)} aria-label="Next">⏭</button>

        <div className="wmp__seek">
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.1}
            value={time}
            onChange={(e) => {
              const el = audioRef.current
              if (el) el.currentTime = Number(e.target.value)
            }}
            aria-label="Seek"
          />
          <span className="wmp__time">
            {fmt(time)} / {dur ? fmt(dur) : '--:--'}
          </span>
        </div>

        <div className="wmp__vol">
          <span aria-hidden>🔈</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>
      </div>

      <div className="wmp__library">
        <div className="wmp__libHead">
          <span>Library</span>
          <span className="game__spacer" />
          <button className="game__btn" onClick={() => fileRef.current?.click()}>
            Add files
          </button>
        </div>
        {tracks.length ? (
          <ul className="wmp__list">
            {tracks.map((t, i) => (
              <li key={t.id}>
                <button className="wmp__row" data-on={current === i} onDoubleClick={() => play(i)} onClick={() => play(i)}>
                  <span className="wmp__rowNum">{i + 1}</span>
                  <span className="wmp__rowTitle">{t.title}</span>
                  <span className="wmp__rowArtist">{t.artist}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="wmp__empty">
            No music yet. Add files — they stay in this browser and are shared with the iPod.
          </p>
        )}
      </div>

      <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={(e) => void upload(e.target.files)} />
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDur(e.currentTarget.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => skip(1)}
      />
    </div>
  )
}
