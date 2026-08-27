/**
 * Sparse sound design, synthesised in the browser — no audio files ship.
 * One boot chime, one soft click, one close puff. Off until the visitor
 * signs in (which is also the gesture that unlocks WebAudio).
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = false

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.34
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export const sound = {
  get enabled() {
    return enabled
  },
  setEnabled(v: boolean) {
    enabled = v
    if (v) ac()
  },

  /** Soft bell-ish partials over a low pad — the sign-in chime. */
  chime() {
    const c = ac()
    if (!c || !master || !enabled) return
    const t = c.currentTime
    const voices: [number, number, number][] = [
      // freq, start offset, gain
      [523.25, 0.0, 0.5],
      [659.25, 0.09, 0.42],
      [783.99, 0.18, 0.38],
      [1046.5, 0.27, 0.26],
    ]
    for (const [f, off, g] of voices) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 3200
      osc.type = 'sine'
      osc.frequency.value = f
      gain.gain.setValueAtTime(0, t + off)
      gain.gain.linearRampToValueAtTime(g, t + off + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + off + 1.9)
      osc.connect(lp).connect(gain).connect(master)
      osc.start(t + off)
      osc.stop(t + off + 2)

      // a quiet octave shimmer riding on top
      const sh = c.createOscillator()
      const shg = c.createGain()
      sh.type = 'triangle'
      sh.frequency.value = f * 2
      shg.gain.setValueAtTime(0, t + off)
      shg.gain.linearRampToValueAtTime(g * 0.12, t + off + 0.03)
      shg.gain.exponentialRampToValueAtTime(0.0001, t + off + 1.1)
      sh.connect(shg).connect(master)
      sh.start(t + off)
      sh.stop(t + off + 1.2)
    }
    const pad = c.createOscillator()
    const pg = c.createGain()
    pad.type = 'sine'
    pad.frequency.value = 130.81
    pg.gain.setValueAtTime(0, t)
    pg.gain.linearRampToValueAtTime(0.16, t + 0.4)
    pg.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)
    pad.connect(pg).connect(master)
    pad.start(t)
    pad.stop(t + 2.5)
  },

  /** A short filtered blip. Used on open / select. */
  click(pitch = 1) {
    const c = ac()
    if (!c || !master || !enabled) return
    const t = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1500 * pitch
    bp.Q.value = 1.4
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(880 * pitch, t)
    osc.frequency.exponentialRampToValueAtTime(1500 * pitch, t + 0.05)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.2, t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    osc.connect(bp).connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + 0.16)
  },

  /** Descending puff for close / minimise. */
  puff() {
    const c = ac()
    if (!c || !master || !enabled) return
    const t = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(2400, t)
    lp.frequency.exponentialRampToValueAtTime(420, t + 0.22)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, t)
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.22)
    gain.gain.setValueAtTime(0.18, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
    osc.connect(lp).connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + 0.28)
  },
}
