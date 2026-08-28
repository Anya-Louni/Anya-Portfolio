/**
 * Draw Music.
 *
 * Draw across the board and a playhead sweeps through what you drew: left to
 * right is time, up is pitch, and each of the four brushes is a different
 * voice. It is the draw-it-and-hear-it idea — Draw.Audio, Composer's
 * Sketchpad. It was called Symphony Sketchpad, which said nothing about what
 * it does; the name is now the instructions.
 *
 * Pitches are snapped to a scale, so a scribble is always in key. That is the
 * whole trick: pentatonic has no interval that can clash, which means anything
 * drawn at random still sounds deliberate.
 *
 * Nothing is recorded to a server and no audio files ship — every note is
 * synthesised the moment the playhead reaches it.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const STEPS = 32
const PITCHES = 16

/** Semitone offsets from the root. */
const SCALES: { name: string; steps: number[] }[] = [
  { name: 'Pentatonic', steps: [0, 2, 4, 7, 9] },
  { name: 'Minor pent.', steps: [0, 3, 5, 7, 10] },
  { name: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'Chromatic', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A']
const ROOT_SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9 }

interface Voice {
  name: string
  colour: string
  glow: string
  wave: OscillatorType
  cutoff: number
  attack: number
  release: number
  gain: number
}

const VOICES: Voice[] = [
  { name: 'Bells', colour: '#3f96dc', glow: '#c6e7fb', wave: 'sine', cutoff: 6000, attack: 0.004, release: 1.5, gain: 0.5 },
  { name: 'Strings', colour: '#5fa63f', glow: '#d3eeb6', wave: 'sawtooth', cutoff: 1500, attack: 0.14, release: 0.9, gain: 0.22 },
  { name: 'Flute', colour: '#e39a22', glow: '#ffe4ab', wave: 'triangle', cutoff: 3200, attack: 0.05, release: 0.5, gain: 0.34 },
  { name: 'Pluck', colour: '#b64bb0', glow: '#f2c7ef', wave: 'square', cutoff: 2400, attack: 0.002, release: 0.35, gain: 0.2 },
]

/** row 0 is the top of the board, so it must be the highest note */
function freqOf(row: number, scaleIx: number, root: string) {
  const scale = SCALES[scaleIx].steps
  const n = PITCHES - 1 - row
  const semi = ROOT_SEMI[root] + scale[n % scale.length] + 12 * Math.floor(n / scale.length)
  return 220 * Math.pow(2, semi / 12)
}

/* Aero buttons are one hue at four values, so the chips need to be able to
   walk their own colour up and down rather than carry four hex codes each. */
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const hex = (c: number[]) =>
  `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`

/** toward black when k < 0, toward white when k > 0 */
const shade = (h: string, k: number) => {
  const t = k < 0 ? 0 : 255
  return hex(rgb(h).map((v) => v + (t - v) * Math.abs(k)))
}
const mix = (a: string, b: string, k: number) => {
  const [x, y] = [rgb(a), rgb(b)]
  return hex(x.map((v, i) => v + (y[i] - v) * k))
}

type Board = Int8Array // -1 empty, otherwise the voice index

const empty = () => new Int8Array(STEPS * PITCHES).fill(-1)

export default function Sketchpad() {
  const [board, setBoard] = useState<Board>(empty)
  const [voice, setVoice] = useState(0)
  const [scale, setScale] = useState(0)
  const [root, setRoot] = useState('C')
  const [bpm, setBpm] = useState(112)
  const [playing, setPlaying] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [status, setStatus] = useState('')
  const [recording, setRecording] = useState(false)

  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const tapRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const boardRef = useRef(board)
  const stepRef = useRef(-1)
  const lastPaint = useRef<number | null>(null)
  /** cells lit by the playhead, and how long ago, for the bloom */
  const litRef = useRef<Map<number, number>>(new Map())

  boardRef.current = board

  /* ---------------- audio ---------------- */
  const audio = useCallback(() => {
    if (!ctxRef.current) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!C) return null
      const c = new C()
      const master = c.createGain()
      master.gain.value = 0.5

      /* A short synthetic room. Two seconds of decaying noise is a crude
         impulse response, but it is the difference between four bare
         oscillators and something that sounds like it is in a hall. */
      const len = Math.floor(c.sampleRate * 1.8)
      const ir = c.createBuffer(2, len, c.sampleRate)
      for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch)
        for (let i = 0; i < len; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
        }
      }
      const verb = c.createConvolver()
      verb.buffer = ir
      const wet = c.createGain()
      wet.gain.value = 0.3
      master.connect(verb)
      verb.connect(wet)

      const out = c.createGain()
      master.connect(out)
      wet.connect(out)
      out.connect(c.destination)

      const tap = c.createMediaStreamDestination()
      out.connect(tap)

      ctxRef.current = c
      masterRef.current = master
      tapRef.current = tap
    }
    const c = ctxRef.current!
    if (c.state === 'suspended') void c.resume()
    return c
  }, [])

  const pluck = useCallback(
    (freq: number, v: Voice, when: number) => {
      const c = ctxRef.current
      const master = masterRef.current
      if (!c || !master) return
      const osc = c.createOscillator()
      const gain = c.createGain()
      const lp = c.createBiquadFilter()
      osc.type = v.wave
      osc.frequency.value = freq
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(v.cutoff, when)
      lp.frequency.exponentialRampToValueAtTime(Math.max(220, v.cutoff * 0.25), when + v.release)
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.exponentialRampToValueAtTime(v.gain, when + v.attack)
      gain.gain.exponentialRampToValueAtTime(0.0001, when + v.attack + v.release)
      osc.connect(lp)
      lp.connect(gain)
      gain.connect(master)
      osc.start(when)
      osc.stop(when + v.attack + v.release + 0.05)
    },
    [],
  )

  /* ---------------- the sweep ---------------- */
  useEffect(() => {
    if (!playing) { stepRef.current = -1; return }
    const c = audio()
    if (!c) { setStatus('This browser has no Web Audio'); setPlaying(false); return }

    const id = window.setInterval(() => {
      const next = (stepRef.current + 1) % STEPS
      stepRef.current = next
      const b = boardRef.current
      const now = c.currentTime + 0.02
      for (let r = 0; r < PITCHES; r++) {
        const v = b[next * PITCHES + r]
        if (v < 0) continue
        pluck(freqOf(r, scale, root), VOICES[v], now)
        litRef.current.set(next * PITCHES + r, performance.now())
      }
    }, (60 / bpm / 4) * 1000)
    return () => window.clearInterval(id)
  }, [playing, bpm, scale, root, audio, pluck])

  /* ---------------- drawing the board ---------------- */
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /* clientWidth of the canvas, not of the host, and never written back as
       an inline style: the canvas is sized by CSS at 100% of the stage, so
       setting a pixel width here would grow the stage, which would grow the
       canvas again on the next frame. Measure what CSS decided and only set
       the backing store. */
    const w = Math.max(280, canvas.clientWidth)
    const h = Math.max(200, canvas.clientHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cw = w / STEPS
    const chh = h / PITCHES

    /* The board is a Windows 7 client area, not a night sky: a pale sunken
       panel with bar shading and hairline rules. The notes on it are Aero
       glass buttons — a hard tonal break just under halfway, a darker edge in
       the button's own hue, and a white line inside the top. */
    const paper = ctx.createLinearGradient(0, 0, 0, h)
    paper.addColorStop(0, '#fbfdff')
    paper.addColorStop(1, '#e8eff8')
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, w, h)

    const bars = SCALES[scale].steps.length
    for (let r = 0; r < PITCHES; r++) {
      // shade the octave the way a listview shades alternate groups
      if (Math.floor((PITCHES - 1 - r) / bars) % 2 === 1) {
        ctx.fillStyle = 'rgba(120, 165, 215, 0.075)'
        ctx.fillRect(0, r * chh, w, chh)
      }
    }
    for (let s2 = 0; s2 < STEPS; s2 += 8) {
      ctx.fillStyle = 'rgba(120, 165, 215, 0.07)'
      ctx.fillRect(s2 * cw, 0, cw * 4, h)
    }

    for (let s2 = 0; s2 <= STEPS; s2++) {
      ctx.fillStyle = s2 % 4 === 0 ? '#b9cbe0' : '#dae4f0'
      ctx.fillRect(Math.round(s2 * cw), 0, 1, h)
    }
    for (let r = 0; r <= PITCHES; r++) {
      ctx.fillStyle = (PITCHES - r) % bars === 0 ? '#b9cbe0' : '#dae4f0'
      ctx.fillRect(0, Math.round(r * chh), w, 1)
    }

    const b = boardRef.current
    const now = performance.now()
    for (let s2 = 0; s2 < STEPS; s2++) {
      for (let r = 0; r < PITCHES; r++) {
        const v = b[s2 * PITCHES + r]
        if (v < 0) continue
        const x = Math.round(s2 * cw) + 1
        const y = Math.round(r * chh) + 1
        const bw = Math.round(cw) - 2
        const bh = Math.round(chh) - 2
        const age = now - (litRef.current.get(s2 * PITCHES + r) ?? -1e9)
        const hot = Math.max(0, 1 - age / 420)
        const V = VOICES[v]

        const chip = ctx.createLinearGradient(0, y, 0, y + bh)
        chip.addColorStop(0, V.glow)
        chip.addColorStop(0.46, mix(V.glow, V.colour, 0.55))
        chip.addColorStop(0.47, V.colour)          // the hard Aero break
        chip.addColorStop(1, shade(V.colour, -0.22))
        ctx.fillStyle = chip
        ctx.beginPath()
        ctx.roundRect(x, y, bw, bh, 2.5)
        ctx.fill()

        ctx.strokeStyle = shade(V.colour, -0.42)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(x + 0.5, y + 0.5, bw - 1, bh - 1, 2.5)
        ctx.stroke()

        ctx.strokeStyle = 'rgba(255,255,255,0.72)'
        ctx.beginPath()
        ctx.roundRect(x + 1.5, y + 1.5, bw - 3, bh - 3, 1.8)
        ctx.stroke()

        // the playhead lighting a note is the same glass, lit from inside
        if (hot > 0) {
          ctx.save()
          ctx.globalAlpha = hot * 0.8
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.roundRect(x, y, bw, bh, 2.5)
          ctx.fill()
          ctx.restore()
        }
      }
    }

    if (playing && stepRef.current >= 0) {
      const x = Math.round(stepRef.current * cw)
      const bw = Math.round(cw)
      const band = ctx.createLinearGradient(0, 0, 0, h)
      band.addColorStop(0, 'rgba(120, 190, 245, 0.34)')
      band.addColorStop(0.46, 'rgba(84, 165, 232, 0.30)')
      band.addColorStop(0.47, 'rgba(56, 140, 215, 0.24)')
      band.addColorStop(1, 'rgba(120, 190, 245, 0.30)')
      ctx.fillStyle = band
      ctx.fillRect(x, 0, bw, h)
      ctx.fillStyle = '#3c8fd0'
      ctx.fillRect(x, 0, 1, h)
      ctx.fillRect(x + bw - 1, 0, 1, h)
    }

    // the sunken edge that puts the whole panel below the surface
    ctx.fillStyle = 'rgba(70, 105, 150, 0.35)'
    ctx.fillRect(0, 0, w, 1)
    ctx.fillRect(0, 0, 1, h)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fillRect(0, h - 1, w, 1)
    ctx.fillRect(w - 1, 0, 1, h)
  }, [playing, scale])

  useEffect(() => {
    let raf = 0
    const loop = () => { render(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [render])

  useEffect(() => () => { void ctxRef.current?.close() }, [])

  /* ---------------- pointer ---------------- */
  const cellAt = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    const s = Math.floor(((e.clientX - r.left) / r.width) * STEPS)
    const p = Math.floor(((e.clientY - r.top) / r.height) * PITCHES)
    if (s < 0 || p < 0 || s >= STEPS || p >= PITCHES) return null
    return s * PITCHES + p
  }

  const put = (i: number, erase: boolean) => {
    setBoard((old) => {
      if (old[i] === (erase ? -1 : voice)) return old
      const next = old.slice() as Board
      next[i] = erase ? -1 : voice
      return next
    })
    if (!erase) {
      const c = audio()
      if (c) {
        pluck(freqOf(i % PITCHES, scale, root), VOICES[voice], c.currentTime + 0.01)
        litRef.current.set(i, performance.now())
      }
    }
  }

  const down = (e: React.PointerEvent) => {
    const i = cellAt(e)
    if (i === null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    // right button, or the eraser toggle, rubs out instead
    const erase = erasing || e.button === 2 || boardRef.current[i] === voice
    lastPaint.current = erase ? -2 : -1
    put(i, erase)
  }

  const move = (e: React.PointerEvent) => {
    if (lastPaint.current === null) return
    const i = cellAt(e)
    if (i === null) return
    put(i, lastPaint.current === -2)
  }

  const up = () => { lastPaint.current = null }

  /* ---------------- extras ---------------- */
  const surprise = () => {
    const next = empty()
    // a phrase, not noise: pick a contour and walk it, leaving rests
    let row = 6 + Math.floor(Math.random() * 5)
    for (let s = 0; s < STEPS; s++) {
      if (Math.random() < 0.28) continue
      row = Math.max(0, Math.min(PITCHES - 1, row + Math.round((Math.random() - 0.5) * 4)))
      next[s * PITCHES + row] = Math.random() < 0.75 ? voice : Math.floor(Math.random() * VOICES.length)
      // a held note underneath every bar, so it has a floor
      if (s % 8 === 0) next[s * PITCHES + (PITCHES - 2)] = 1
    }
    setBoard(next)
    setStatus('Made you a phrase — redraw any of it')
  }

  const savePng = () => {
    canvasRef.current?.toBlob((b) => {
      if (!b) return
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sketch.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setStatus('Saved sketch.png')
    }, 'image/png')
  }

  /** Record one pass of the board straight off the audio graph. */
  const recordAudio = async () => {
    const c = audio()
    const tap = tapRef.current
    if (!c || !tap || recording) return
    if (typeof MediaRecorder === 'undefined') { setStatus('This browser cannot record audio'); return }
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t))
    if (!type) { setStatus('This browser cannot record audio'); return }

    setRecording(true)
    setStatus('Recording one pass…')
    const chunks: Blob[] = []
    const rec = new MediaRecorder(tap.stream, { mimeType: type })
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const done = new Promise<void>((res) => { rec.onstop = () => res() })
    rec.start()

    stepRef.current = -1
    setPlaying(true)
    const bar = (60 / bpm / 4) * 1000
    // one full pass, plus a moment for the last notes to ring out
    await new Promise((r) => setTimeout(r, bar * STEPS + 1600))
    setPlaying(false)
    rec.stop()
    await done
    setRecording(false)

    const url = URL.createObjectURL(new Blob(chunks, { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = type.startsWith('audio/mp4') ? 'sketch.m4a' : 'sketch.webm'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    setStatus('Saved your take')
  }

  return (
    <div className="skp">
      <div className="skp__bar">
        <button
          className="skp__go"
          data-on={playing}
          onClick={() => { audio(); setPlaying((p) => !p) }}
        >
          {playing ? 'Stop' : 'Play'}
        </button>

        <div className="skp__voices">
          {VOICES.map((v, i) => (
            <button
              key={v.name}
              className="skp__voice"
              data-on={voice === i && !erasing}
              style={{ '--v': v.colour, '--vg': v.glow } as React.CSSProperties}
              onClick={() => { setVoice(i); setErasing(false) }}
            >
              {v.name}
            </button>
          ))}
          <button className="skp__voice skp__voice--erase" data-on={erasing} onClick={() => setErasing((e) => !e)}>
            Erase
          </button>
        </div>

        <label className="skp__field">
          Key
          <select value={root} onChange={(e) => setRoot(e.target.value)}>
            {ROOTS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>

        <label className="skp__field">
          Scale
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
            {SCALES.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
          </select>
        </label>

        <label className="skp__field skp__field--slider">
          {bpm} bpm
          <input type="range" min={50} max={190} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </label>
      </div>

      <div className="skp__stage" ref={hostRef}>
        <canvas
          ref={canvasRef}
          className="skp__canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="skp__foot">
        <div className="skp__acts">
          <button className="skp__btn" onClick={surprise}>Surprise me</button>
          <button className="skp__btn" onClick={() => { setBoard(empty()); litRef.current.clear() }}>Clear</button>
          <button className="skp__btn" onClick={savePng}>Save .png</button>
          <button className="skp__btn" onClick={() => void recordAudio()} disabled={recording}>
            {recording ? 'Recording…' : 'Record a take'}
          </button>
        </div>
        <p className="skp__status">
          {status || 'Draw across the board — left to right is time, up is pitch.'}
        </p>
      </div>
    </div>
  )
}
