import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Synth.
 *
 * A small subtractive voice per key: oscillator → filter → ADSR → delay.
 * Playable with the mouse or the computer keyboard (the usual Z-row and Q-row
 * layout), and it draws what it is doing on a scope.
 */

type Wave = OscillatorType

interface Preset {
  name: string
  wave: Wave
  cutoff: number
  q: number
  attack: number
  release: number
  delay: number
  detune: number
}

const PRESETS: Preset[] = [
  { name: 'Glass', wave: 'sine', cutoff: 4200, q: 2, attack: 0.01, release: 0.9, delay: 0.28, detune: 6 },
  { name: 'Aero', wave: 'triangle', cutoff: 2600, q: 6, attack: 0.02, release: 1.4, delay: 0.4, detune: 12 },
  { name: 'Reed', wave: 'sawtooth', cutoff: 1800, q: 9, attack: 0.005, release: 0.35, delay: 0.12, detune: 4 },
  { name: 'Chip', wave: 'square', cutoff: 6000, q: 1, attack: 0.001, release: 0.14, delay: 0, detune: 0 },
  { name: 'Pad', wave: 'sawtooth', cutoff: 900, q: 4, attack: 0.35, release: 2.2, delay: 0.5, detune: 18 },
]

/** two octaves from C */
const KEYS = [
  { n: 'C', s: false }, { n: 'C#', s: true }, { n: 'D', s: false }, { n: 'D#', s: true },
  { n: 'E', s: false }, { n: 'F', s: false }, { n: 'F#', s: true }, { n: 'G', s: false },
  { n: 'G#', s: true }, { n: 'A', s: false }, { n: 'A#', s: true }, { n: 'B', s: false },
]
const ROWS = 'zsxdcvgbhnjm'.split('')
const ROWS2 = 'q2w3er5t6y7u'.split('')

export default function Synth() {
  const ctxRef = useRef<AudioContext | null>(null)
  const outRef = useRef<GainNode | null>(null)
  const delayRef = useRef<DelayNode | null>(null)
  const fbRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const voices = useRef<Map<number, { osc: OscillatorNode[]; gain: GainNode }>>(new Map())
  const scopeRef = useRef<HTMLCanvasElement>(null)

  const [preset, setPreset] = useState(0)
  const [wave, setWave] = useState<Wave>(PRESETS[0].wave)
  const [cutoff, setCutoff] = useState(PRESETS[0].cutoff)
  const [q, setQ] = useState(PRESETS[0].q)
  const [attack, setAttack] = useState(PRESETS[0].attack)
  const [release, setRelease] = useState(PRESETS[0].release)
  const [delayMix, setDelayMix] = useState(PRESETS[0].delay)
  const [detune, setDetune] = useState(PRESETS[0].detune)
  const [octave, setOctave] = useState(4)
  const [held, setHeld] = useState<number[]>([])

  const ac = useCallback(() => {
    if (!ctxRef.current) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new C()
      const out = ctx.createGain()
      out.gain.value = 0.22
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      const delay = ctx.createDelay(1)
      delay.delayTime.value = 0.26
      const fb = ctx.createGain()
      fb.gain.value = 0.3
      const wet = ctx.createGain()
      wet.gain.value = delayMix
      delay.connect(fb).connect(delay)
      delay.connect(wet).connect(out)
      out.connect(analyser).connect(ctx.destination)
      ctxRef.current = ctx
      outRef.current = out
      delayRef.current = delay
      fbRef.current = wet
      analyserRef.current = analyser
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume()
    return ctxRef.current
  }, [delayMix])

  useEffect(() => {
    if (fbRef.current) fbRef.current.gain.value = delayMix
  }, [delayMix])

  const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

  const noteOn = useCallback(
    (midi: number) => {
      if (voices.current.has(midi)) return
      const ctx = ac()
      const out = outRef.current!
      const t = ctx.currentTime
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = cutoff
      filter.Q.value = q

      const oscs: OscillatorNode[] = []
      for (const d of detune ? [-detune, detune] : [0]) {
        const osc = ctx.createOscillator()
        osc.type = wave
        osc.frequency.value = freq(midi)
        osc.detune.value = d
        osc.connect(filter)
        osc.start(t)
        oscs.push(osc)
      }
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.9, t + Math.max(0.001, attack))
      filter.connect(gain)
      gain.connect(out)
      if (delayRef.current) gain.connect(delayRef.current)
      voices.current.set(midi, { osc: oscs, gain })
      setHeld((h) => (h.includes(midi) ? h : [...h, midi]))
    },
    [ac, attack, cutoff, detune, q, wave],
  )

  const noteOff = useCallback((midi: number) => {
    const v = voices.current.get(midi)
    const ctx = ctxRef.current
    if (!v || !ctx) return
    const t = ctx.currentTime
    v.gain.gain.cancelScheduledValues(t)
    v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), t)
    v.gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, release))
    v.osc.forEach((o) => o.stop(t + Math.max(0.03, release) + 0.05))
    voices.current.delete(midi)
    setHeld((h) => h.filter((n) => n !== midi))
  }, [release])

  /* computer keyboard */
  useEffect(() => {
    const map = new Map<string, number>()
    ROWS.forEach((k, i) => map.set(k, 12 * octave + i))
    ROWS2.forEach((k, i) => map.set(k, 12 * (octave + 1) + i))

    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const m = map.get(e.key.toLowerCase())
      if (m !== undefined) {
        e.preventDefault()
        noteOn(m)
      }
      if (e.key === 'ArrowUp') setOctave((o) => Math.min(7, o + 1))
      if (e.key === 'ArrowDown') setOctave((o) => Math.max(1, o - 1))
    }
    const up = (e: KeyboardEvent) => {
      const m = map.get(e.key.toLowerCase())
      if (m !== undefined) noteOff(m)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [noteOn, noteOff, octave])

  /* scope */
  useEffect(() => {
    let raf = 0
    const draw = () => {
      const cv = scopeRef.current
      const an = analyserRef.current
      if (cv && an) {
        const ctx = cv.getContext('2d')!
        const w = (cv.width = cv.clientWidth * 2)
        const h = (cv.height = cv.clientHeight * 2)
        const buf = new Uint8Array(an.fftSize)
        an.getByteTimeDomainData(buf)
        ctx.clearRect(0, 0, w, h)
        ctx.strokeStyle = '#5fdcff'
        ctx.lineWidth = 3
        ctx.shadowBlur = 12
        ctx.shadowColor = '#2ba6e8'
        ctx.beginPath()
        for (let i = 0; i < buf.length; i++) {
          const x = (i / buf.length) * w
          const y = (buf[i] / 255) * h
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        }
        ctx.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  const loadPreset = (i: number) => {
    const p = PRESETS[i]
    setPreset(i)
    setWave(p.wave)
    setCutoff(p.cutoff)
    setQ(p.q)
    setAttack(p.attack)
    setRelease(p.release)
    setDelayMix(p.delay)
    setDetune(p.detune)
  }

  const octaveKeys = (base: number, row: string[]) =>
    KEYS.map((k, i) => ({ ...k, midi: 12 * base + i, cap: row[i] }))

  const allKeys = [...octaveKeys(octave, ROWS), ...octaveKeys(octave + 1, ROWS2)]

  const Slider = ({
    label, value, min, max, step, onChange, fmt,
  }: {
    label: string; value: number; min: number; max: number; step: number
    onChange: (n: number) => void; fmt?: (n: number) => string
  }) => (
    <label className="sy__slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <em>{fmt ? fmt(value) : value}</em>
    </label>
  )

  return (
    <div className="sy">
      <div className="sy__top">
        <div className="sy__presets">
          {PRESETS.map((p, i) => (
            <button key={p.name} className="game__btn" data-on={preset === i} onClick={() => loadPreset(i)}>
              {p.name}
            </button>
          ))}
        </div>
        <canvas ref={scopeRef} className="sy__scope" />
      </div>

      <div className="sy__controls">
        <div className="sy__group">
          <span className="sy__groupLabel">Oscillator</span>
          <div className="sy__waves">
            {(['sine', 'triangle', 'sawtooth', 'square'] as Wave[]).map((w) => (
              <button key={w} className="game__btn" data-on={wave === w} onClick={() => setWave(w)}>
                {w === 'sawtooth' ? 'saw' : w === 'triangle' ? 'tri' : w === 'square' ? 'sqr' : 'sin'}
              </button>
            ))}
          </div>
          <Slider label="Detune" value={detune} min={0} max={30} step={1} onChange={setDetune} fmt={(n) => `${n}¢`} />
        </div>

        <div className="sy__group">
          <span className="sy__groupLabel">Filter</span>
          <Slider label="Cutoff" value={cutoff} min={200} max={8000} step={50} onChange={setCutoff} fmt={(n) => `${(n / 1000).toFixed(1)}k`} />
          <Slider label="Reso" value={q} min={0.5} max={18} step={0.5} onChange={setQ} />
        </div>

        <div className="sy__group">
          <span className="sy__groupLabel">Envelope</span>
          <Slider label="Attack" value={attack} min={0.001} max={1} step={0.005} onChange={setAttack} fmt={(n) => `${Math.round(n * 1000)}ms`} />
          <Slider label="Release" value={release} min={0.05} max={3} step={0.05} onChange={setRelease} fmt={(n) => `${n.toFixed(2)}s`} />
        </div>

        <div className="sy__group">
          <span className="sy__groupLabel">Space</span>
          <Slider label="Delay" value={delayMix} min={0} max={0.8} step={0.02} onChange={setDelayMix} fmt={(n) => `${Math.round(n * 100)}%`} />
          <div className="sy__oct">
            <button className="game__btn" onClick={() => setOctave((o) => Math.max(1, o - 1))}>−</button>
            <span>Oct {octave}</span>
            <button className="game__btn" onClick={() => setOctave((o) => Math.min(7, o + 1))}>+</button>
          </div>
        </div>
      </div>

      <div className="sy__keys">
        {allKeys.map((k) => (
          <button
            key={k.midi}
            className="sy__key"
            data-sharp={k.s}
            data-on={held.includes(k.midi)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              noteOn(k.midi)
            }}
            onPointerUp={() => noteOff(k.midi)}
            onPointerCancel={() => noteOff(k.midi)}
            onPointerEnter={(e) => e.buttons === 1 && noteOn(k.midi)}
            onPointerLeave={() => noteOff(k.midi)}
            aria-label={`${k.n}${Math.floor(k.midi / 12)}`}
          >
            <em>{k.cap}</em>
          </button>
        ))}
      </div>

      <p className="sy__hint">
        Play with the mouse, or the keyboard — <b>z s x d c…</b> for this octave, <b>q 2 w 3 e…</b> for the
        one above. Up and down arrows shift octave.
      </p>
    </div>
  )
}
