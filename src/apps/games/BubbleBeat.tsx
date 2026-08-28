/**
 * Bubble Beat.
 *
 * A falling-note rhythm game in four lanes. Notes are glass bubbles; they
 * drop toward a line at the bottom and you catch them with D F J K, the
 * arrow keys, or by tapping the lane.
 *
 * The music is not a file. Every chart is a list of (step, lane) pairs, and
 * hitting a bubble is what plays its note — so a clean run sounds like the
 * melody and a sloppy one sounds like a melody with holes in it, which is
 * the most direct feedback a rhythm game can give. A bass arpeggio runs
 * underneath regardless, so there is always something to keep time against.
 *
 * Notes are snapped to a scale for the same reason Draw Music snaps them: in
 * a pentatonic there is no interval that can clash, so a mistimed hit still
 * lands inside the tune.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const LANES = 4
const KEYS: string[][] = [
  ['d', 'arrowleft'],
  ['f', 'arrowdown'],
  ['j', 'arrowup'],
  ['k', 'arrowright'],
]
const LANE_LABEL = ['D', 'F', 'J', 'K']

/** How long a bubble is on screen before it reaches the line, in seconds. */
const FALL = 1.9
/** Half-windows, in seconds. Anything later than the last one is a miss. */
const JUDGE: { name: string; window: number; score: number; tint: string }[] = [
  { name: 'Perfect', window: 0.055, score: 300, tint: '#8ee6ff' },
  { name: 'Great', window: 0.11, score: 200, tint: '#a6f0a0' },
  { name: 'Good', window: 0.19, score: 100, tint: '#ffd98a' },
]
const MISS_AFTER = 0.24

const PENTATONIC = [0, 2, 4, 7, 9]
/** lane 0 is the lowest voice, lane 3 the highest */
const laneFreq = (lane: number, step: number) => {
  const n = lane * 2 + (step % 2)
  const semi = PENTATONIC[n % 5] + 12 * Math.floor(n / 5)
  return 261.63 * Math.pow(2, semi / 12)
}

interface Chart {
  id: string
  name: string
  note: string
  bpm: number
  /** quarter-step index -> lane. Sixteen steps to the bar. */
  steps: [number, number][]
}

/* Written by hand rather than generated: a chart wants phrases and rests, and
   a random one just feels like static however carefully it is weighted. */
const CHARTS: Chart[] = [
  {
    id: 'shallows',
    name: 'Shallows',
    note: 'Slow, mostly on the beat',
    bpm: 92,
    steps: [
      [0, 0], [4, 1], [8, 2], [12, 1],
      [16, 0], [20, 1], [24, 3], [28, 2],
      [32, 0], [36, 2], [40, 1], [44, 3],
      [48, 2], [52, 1], [56, 0], [60, 1],
      [64, 3], [68, 2], [72, 1], [76, 0],
      [80, 0], [84, 1], [88, 2], [92, 3],
      [96, 2], [100, 1], [104, 2], [108, 3],
      [112, 0], [116, 1], [120, 2], [124, 3],
    ],
  },
  {
    id: 'current',
    name: 'Current',
    note: 'Eighths, with runs',
    bpm: 116,
    steps: [
      [0, 0], [2, 1], [4, 2], [6, 3], [8, 2], [10, 1], [12, 0], [14, 1],
      [16, 2], [18, 3], [20, 2], [22, 1], [24, 0], [26, 1], [28, 2], [30, 3],
      [32, 3], [34, 2], [36, 3], [38, 1], [40, 0], [44, 2], [46, 3],
      [48, 1], [50, 0], [52, 1], [54, 2], [56, 3], [58, 2], [60, 1], [62, 0],
      [64, 0], [66, 2], [68, 1], [70, 3], [72, 0], [74, 2], [76, 1], [78, 3],
      [80, 2], [82, 2], [84, 1], [86, 1], [88, 0], [90, 0], [92, 3], [94, 3],
      [96, 0], [98, 1], [100, 2], [102, 3], [104, 3], [106, 2], [108, 1], [110, 0],
      [112, 1], [114, 2], [116, 0], [118, 3], [120, 1], [122, 2], [124, 0], [126, 3],
    ],
  },
  {
    id: 'undertow',
    name: 'Undertow',
    note: 'Fast, doubles, no mercy',
    bpm: 148,
    steps: [
      [0, 0], [0, 3], [2, 1], [3, 2], [4, 0], [6, 3], [7, 2], [8, 1],
      [10, 0], [11, 1], [12, 2], [14, 3], [15, 2], [16, 1], [16, 3],
      [18, 0], [19, 1], [20, 2], [22, 3], [23, 1], [24, 0], [26, 2], [27, 3],
      [28, 1], [30, 0], [31, 2], [32, 3], [32, 0], [34, 1], [35, 2], [36, 3],
      [38, 2], [39, 1], [40, 0], [42, 1], [43, 2], [44, 3], [46, 0], [47, 1],
      [48, 2], [48, 0], [50, 3], [51, 1], [52, 2], [54, 0], [55, 3], [56, 1],
      [58, 2], [59, 0], [60, 3], [62, 1], [63, 2], [64, 0], [64, 2], [66, 1],
      [67, 3], [68, 0], [70, 2], [71, 1], [72, 3], [74, 0], [75, 2], [76, 1],
      [78, 3], [79, 0], [80, 1], [80, 3], [82, 2], [83, 0], [84, 1], [86, 3],
      [87, 2], [88, 0], [90, 1], [91, 3], [92, 2], [94, 0], [95, 1], [96, 2],
    ],
  },
]

interface Live { id: number; lane: number; at: number; hit: boolean }
interface Pop { lane: number; born: number; tint: string; text: string }

export default function BubbleBeat() {
  const [chartIx, setChartIx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [tally, setTally] = useState({ Perfect: 0, Great: 0, Good: 0, Miss: 0 })
  const [done, setDone] = useState(false)
  const [held, setHeld] = useState<boolean[]>(() => Array(LANES).fill(false))

  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const busRef = useRef<GainNode | null>(null)
  const startedRef = useRef(0)
  const liveRef = useRef<Live[]>([])
  const popsRef = useRef<Pop[]>([])
  const heldRef = useRef<boolean[]>(Array(LANES).fill(false))
  const barRef = useRef(-1)
  const playingRef = useRef(false)

  const chart = CHARTS[chartIx]
  const stepSecs = 60 / chart.bpm / 4
  const total = chart.steps.length

  /* ---------------- audio ---------------- */
  const audio = useCallback(() => {
    if (!ctxRef.current) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!C) return null
      const c = new C()
      const bus = c.createGain()
      bus.gain.value = 0.5

      /* the same trick as Draw Music: a second of decaying noise as an impulse
         response, which is the whole difference between bare oscillators and
         something that sounds like it is in a room */
      const len = Math.floor(c.sampleRate * 1.2)
      const ir = c.createBuffer(2, len, c.sampleRate)
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch)
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
      }
      const verb = c.createConvolver()
      verb.buffer = ir
      const wet = c.createGain()
      wet.gain.value = 0.26
      const out = c.createGain()
      bus.connect(verb); verb.connect(wet)
      bus.connect(out); wet.connect(out)
      out.connect(c.destination)
      ctxRef.current = c
      busRef.current = bus
    }
    const c = ctxRef.current!
    if (c.state === 'suspended') void c.resume()
    return c
  }, [])

  const tone = useCallback(
    (freq: number, when: number, opts: { wave?: OscillatorType; gain?: number; len?: number; cut?: number } = {}) => {
      const c = ctxRef.current
      const bus = busRef.current
      if (!c || !bus) return
      const { wave = 'triangle', gain = 0.3, len = 0.5, cut = 3200 } = opts
      const osc = c.createOscillator()
      const g = c.createGain()
      const lp = c.createBiquadFilter()
      osc.type = wave
      osc.frequency.value = freq
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(cut, when)
      lp.frequency.exponentialRampToValueAtTime(Math.max(200, cut * 0.3), when + len)
      g.gain.setValueAtTime(0.0001, when)
      g.gain.exponentialRampToValueAtTime(gain, when + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, when + len)
      osc.connect(lp); lp.connect(g); g.connect(bus)
      osc.start(when)
      osc.stop(when + len + 0.05)
    },
    [],
  )

  /* ---------------- run ---------------- */
  const start = () => {
    const c = audio()
    if (!c) return
    liveRef.current = chart.steps.map(([step, lane], i) => ({
      id: i,
      lane,
      at: step * stepSecs,
      hit: false,
    }))
    popsRef.current = []
    barRef.current = -1
    setScore(0); setCombo(0); setBest(0)
    setTally({ Perfect: 0, Great: 0, Good: 0, Miss: 0 })
    setDone(false)
    startedRef.current = c.currentTime + 1.2 // a beat of lead-in
    playingRef.current = true
    setPlaying(true)
  }

  const stop = useCallback(() => {
    playingRef.current = false
    setPlaying(false)
  }, [])

  const judge = useCallback((lane: number) => {
    const c = ctxRef.current
    if (!c || !playingRef.current) return
    const now = c.currentTime - startedRef.current
    let pick: Live | null = null
    let bestGap = 1e9
    for (const n of liveRef.current) {
      if (n.hit || n.lane !== lane) continue
      const gap = Math.abs(n.at - now)
      if (gap < bestGap) { bestGap = gap; pick = n }
    }
    if (!pick || bestGap > MISS_AFTER) {
      // a stab at nothing costs the combo but not the score
      setCombo(0)
      return
    }
    const grade = JUDGE.find((j) => bestGap <= j.window)
    pick.hit = true
    if (!grade) {
      setCombo(0)
      setTally((t) => ({ ...t, Miss: t.Miss + 1 }))
      popsRef.current.push({ lane, born: performance.now(), tint: '#ff9aa8', text: 'Miss' })
      return
    }
    tone(laneFreq(lane, Math.round(pick.at / stepSecs)), c.currentTime, {
      wave: 'triangle', gain: 0.34, len: 0.6, cut: 4200,
    })
    setScore((s) => s + grade.score)
    setCombo((n) => {
      const next = n + 1
      setBest((b) => Math.max(b, next))
      return next
    })
    setTally((t) => ({ ...t, [grade.name]: t[grade.name as 'Perfect'] + 1 }))
    popsRef.current.push({ lane, born: performance.now(), tint: grade.tint, text: grade.name })
  }, [stepSecs, tone])

  /* ---------------- keys ---------------- */
  useEffect(() => {
    const set = (i: number, on: boolean) => {
      heldRef.current[i] = on
      setHeld([...heldRef.current])
    }
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return
      const k = e.key.toLowerCase()
      const lane = KEYS.findIndex((ks) => ks.includes(k))
      if (lane < 0) return
      e.preventDefault()
      set(lane, true)
      judge(lane)
    }
    const up = (e: KeyboardEvent) => {
      const lane = KEYS.findIndex((ks) => ks.includes(e.key.toLowerCase()))
      if (lane >= 0) set(lane, false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [judge])

  /* ---------------- draw ---------------- */
  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      /* clientWidth, never written back as an inline style: the canvas is
         sized by CSS, so setting a pixel width here would grow its container,
         which would grow the canvas again on the next frame. */
      const w = Math.max(280, canvas.clientWidth)
      const h = Math.max(220, canvas.clientHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const lw = w / LANES
      const line = h - 74

      const water = ctx.createLinearGradient(0, 0, 0, h)
      water.addColorStop(0, '#0a2f66')
      water.addColorStop(0.55, '#12559e')
      water.addColorStop(1, '#0b2e5f')
      ctx.fillStyle = water
      ctx.fillRect(0, 0, w, h)

      for (let i = 0; i <= LANES; i++) {
        ctx.fillStyle = 'rgba(190,230,255,0.16)'
        ctx.fillRect(Math.round(i * lw), 0, 1, h)
      }
      for (let i = 0; i < LANES; i++) {
        if (!heldRef.current[i]) continue
        const g = ctx.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, 'rgba(150,220,255,0)')
        g.addColorStop(1, 'rgba(150,220,255,0.22)')
        ctx.fillStyle = g
        ctx.fillRect(i * lw, 0, lw, h)
      }

      const c = ctxRef.current
      const now = c && playingRef.current ? c.currentTime - startedRef.current : -99

      // the line you are aiming at
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      ctx.fillRect(0, line - 26, w, 52)
      ctx.fillStyle = '#cdeeff'
      ctx.fillRect(0, line - 1, w, 2)

      // bubbles
      for (const n of liveRef.current) {
        if (n.hit) continue
        const dt = n.at - now
        if (dt > FALL || dt < -MISS_AFTER) continue
        const y = line - (dt / FALL) * line
        const x = n.lane * lw + lw / 2
        const r = Math.min(lw, 96) * 0.30

        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r)
        g.addColorStop(0, 'rgba(255,255,255,0.95)')
        g.addColorStop(0.45, 'rgba(160,225,255,0.45)')
        g.addColorStop(0.86, 'rgba(120,200,250,0.30)')
        g.addColorStop(1, 'rgba(220,245,255,0.95)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.lineWidth = 1.4
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x - r * 0.32, y - r * 0.36, r * 0.17, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.fill()
      }

      // judgements floating up from the line
      const t = performance.now()
      popsRef.current = popsRef.current.filter((p) => t - p.born < 620)
      for (const p of popsRef.current) {
        const k = (t - p.born) / 620
        ctx.save()
        ctx.globalAlpha = 1 - k
        ctx.fillStyle = p.tint
        ctx.font = '700 15px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(p.text, p.lane * lw + lw / 2, line - 34 - k * 30)
        ctx.restore()
      }

      // lane keycaps
      for (let i = 0; i < LANES; i++) {
        const x = i * lw
        const on = heldRef.current[i]
        const g = ctx.createLinearGradient(0, line + 12, 0, h)
        g.addColorStop(0, on ? '#e6f7ff' : '#dbe6f2')
        g.addColorStop(0.46, on ? '#bce6fb' : '#c3d2e2')
        g.addColorStop(0.47, on ? '#8fd2f4' : '#a9bccf')
        g.addColorStop(1, on ? '#69bce8' : '#8ea5bd')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.roundRect(x + 8, line + 16, lw - 16, 40, 4)
        ctx.fill()
        ctx.strokeStyle = 'rgba(20,60,100,0.55)'
        ctx.stroke()
        ctx.fillStyle = '#0d2f52'
        ctx.font = '700 16px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(LANE_LABEL[i], x + lw / 2, line + 37)
        ctx.textBaseline = 'alphabetic'
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* ---------------- the clock: misses, backing, and the end ---------------- */
  useEffect(() => {
    if (!playing) return
    const c = ctxRef.current
    if (!c) return
    const id = window.setInterval(() => {
      const now = c.currentTime - startedRef.current

      // anything that fell past the window without being caught
      for (const n of liveRef.current) {
        if (n.hit || n.at >= now - MISS_AFTER) continue
        n.hit = true
        setCombo(0)
        setTally((t) => ({ ...t, Miss: t.Miss + 1 }))
        popsRef.current.push({ lane: n.lane, born: performance.now(), tint: '#ff9aa8', text: 'Miss' })
      }

      // a bass note on every bar, so there is always a pulse to play against
      const bar = Math.floor(now / (stepSecs * 8))
      if (now > -0.2 && bar !== barRef.current) {
        barRef.current = bar
        tone(98 * Math.pow(2, (bar % 3) / 12 + (bar % 2 ? 0.417 : 0)), c.currentTime, {
          wave: 'sine', gain: 0.16, len: stepSecs * 7, cut: 700,
        })
      }

      const last = liveRef.current[liveRef.current.length - 1]
      if (last && now > last.at + 1.4) {
        playingRef.current = false
        setPlaying(false)
        setDone(true)
      }
    }, 16)
    return () => window.clearInterval(id)
  }, [playing, stepSecs, tone])

  useEffect(() => () => { void ctxRef.current?.close() }, [])

  const hits = tally.Perfect + tally.Great + tally.Good
  const accuracy = hits + tally.Miss ? Math.round((hits / (hits + tally.Miss)) * 100) : 0

  const tap = (lane: number) => {
    heldRef.current[lane] = true
    setHeld([...heldRef.current])
    judge(lane)
    window.setTimeout(() => {
      heldRef.current[lane] = false
      setHeld([...heldRef.current])
    }, 90)
  }

  return (
    <div className="bb">
      <div className="bb__bar">
        <button className="bb__go" data-on={playing} onClick={() => (playing ? stop() : start())}>
          {playing ? 'Stop' : 'Play'}
        </button>
        <div className="bb__charts">
          {CHARTS.map((ch, i) => (
            <button
              key={ch.id}
              className="bb__chart"
              data-on={chartIx === i}
              disabled={playing}
              onClick={() => { setChartIx(i); setDone(false) }}
            >
              <b>{ch.name}</b>
              <em>{ch.note}</em>
            </button>
          ))}
        </div>
        <dl className="bb__stats">
          <div><dt>Score</dt><dd>{score.toLocaleString()}</dd></div>
          <div><dt>Combo</dt><dd>{combo}</dd></div>
          <div><dt>Notes</dt><dd>{hits + tally.Miss}/{total}</dd></div>
        </dl>
      </div>

      <div className="bb__stage" ref={hostRef}>
        <canvas ref={canvasRef} className="bb__canvas" />
        <div className="bb__taps" aria-hidden>
          {Array.from({ length: LANES }, (_, i) => (
            <button
              key={i}
              className="bb__tap"
              data-on={held[i]}
              onPointerDown={(e) => { e.preventDefault(); tap(i) }}
              aria-label={`Lane ${LANE_LABEL[i]}`}
            />
          ))}
        </div>

        {done ? (
          <div className="bb__done">
            <h3>{chart.name}</h3>
            <p className="bb__score">{score.toLocaleString()}</p>
            <dl>
              <div><dt>Perfect</dt><dd>{tally.Perfect}</dd></div>
              <div><dt>Great</dt><dd>{tally.Great}</dd></div>
              <div><dt>Good</dt><dd>{tally.Good}</dd></div>
              <div><dt>Missed</dt><dd>{tally.Miss}</dd></div>
              <div><dt>Best combo</dt><dd>{best}</dd></div>
              <div><dt>Accuracy</dt><dd>{accuracy}%</dd></div>
            </dl>
            <button className="bb__go" onClick={start}>Again</button>
          </div>
        ) : null}

        {!playing && !done ? (
          <p className="bb__hint">
            Catch the bubbles on the line with <b>D F J K</b>, the arrow keys, or by tapping a lane.
            Every note you catch is a note you hear.
          </p>
        ) : null}
      </div>
    </div>
  )
}
