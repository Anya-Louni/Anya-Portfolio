import { useCallback, useEffect, useRef, useState } from 'react'
import { useOS } from './store'

/**
 * Desktop pet.
 *
 * Lives above the desktop, not inside a window. Walks the bottom edge, climbs
 * the sides, sits down when it gets bored, notices the cursor, and can be
 * picked up and dropped, it screws its eyes shut on the way down, lands
 * flat, sees stars for a couple of seconds, and then shakes it off.
 *
 * Four original characters, no fandom sprites. Each is drawn, not a sheet, so
 * they stay sharp and weigh nothing.
 */

export type PetKind = 'blob' | 'cat' | 'bird' | 'jelly'
type State = 'walk' | 'idle' | 'sit' | 'climb' | 'fall' | 'held' | 'dazed'

export const PETS: { id: PetKind; name: string }[] = [
  { id: 'blob', name: 'Bloop' },
  { id: 'cat', name: 'Mochi' },
  { id: 'bird', name: 'Pip' },
  { id: 'jelly', name: 'Wobble' },
]

const KEY = 'os.pet'
const SIZE = 52

export function Pet() {
  const phase = useOS((s) => s.phase)
  const [kind, setKind] = useState<PetKind>(() => {
    try {
      return (localStorage.getItem(KEY) as PetKind) || 'blob'
    } catch {
      return 'blob'
    }
  })
  const [hidden, setHidden] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const st = useRef({
    x: 120,
    y: 0,
    vx: 0.55,
    vy: 0,
    state: 'walk' as State,
    face: 1,
    timer: 2200,
    blink: 0,
    bob: 0,
    wall: 0 as 0 | -1 | 1,
    /* true only for a fall the visitor caused, so climbing down a wall does
       not leave it dizzy on the floor */
    dropped: false,
  })
  const [, force] = useState(0)
  const grab = useRef<{ dx: number; dy: number } | null>(null)

  const floor = useCallback(() => window.innerHeight - 46 - SIZE, [])

  useEffect(() => {
    st.current.y = floor()
  }, [floor])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, kind)
    } catch {
      /* nothing to do */
    }
  }, [kind])

  useEffect(() => {
    if (phase !== 'desktop' || hidden) return
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(48, now - last)
      last = now
      const s = st.current
      const W = window.innerWidth
      const F = floor()
      s.blink += dt
      s.bob += dt * 0.006

      if (s.state === 'held') {
        // position comes from the pointer
      } else if (s.state === 'fall') {
        s.vy += dt * 0.0022
        s.y += s.vy * dt
        if (s.y >= F) {
          s.y = F
          s.vy = 0
          if (s.dropped) {
            s.dropped = false
            s.state = 'dazed'
            s.timer = 2000
          } else {
            s.state = 'idle'
            s.timer = 700
          }
        }
      } else if (s.state === 'climb') {
        s.y -= 0.05 * dt
        if (s.y < 40 || Math.random() < 0.004) {
          s.state = 'fall'
          s.wall = 0
          s.vy = 0
        }
      } else if (s.state === 'dazed') {
        s.y = F
        s.timer -= dt
        if (s.timer <= 0) {
          s.state = 'idle'
          s.timer = 500
        }
      } else {
        s.timer -= dt
        if (s.timer <= 0) {
          const roll = Math.random()
          if (s.state === 'walk') {
            s.state = roll < 0.4 ? 'sit' : 'idle'
            s.timer = 1400 + Math.random() * 2600
          } else {
            s.state = 'walk'
            s.face = Math.random() < 0.5 ? -1 : 1
            s.vx = (0.35 + Math.random() * 0.35) * s.face
            s.timer = 2200 + Math.random() * 4200
          }
        }
        if (s.state === 'walk') {
          s.x += s.vx * dt * 0.06
          if (s.x < 4) {
            s.x = 4
            s.face = 1
            s.vx = Math.abs(s.vx)
            if (Math.random() < 0.5) {
              s.state = 'climb'
              s.wall = -1
            }
          }
          if (s.x > W - SIZE - 4) {
            s.x = W - SIZE - 4
            s.face = -1
            s.vx = -Math.abs(s.vx)
            if (Math.random() < 0.5) {
              s.state = 'climb'
              s.wall = 1
            }
          }
        }
        s.y = F
      }

      const el = ref.current
      if (el) {
        const bob = s.state === 'walk' ? Math.sin(s.bob * 2.4) * 2 : Math.sin(s.bob) * 1
        el.style.transform = `translate3d(${s.x}px, ${s.y + bob}px, 0) scaleX(${s.face})`
      }
      force((n) => (n + 1) % 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onResize = () => {
      st.current.y = Math.min(st.current.y, floor())
      st.current.x = Math.min(st.current.x, window.innerWidth - SIZE - 4)
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [phase, hidden, floor])

  /* drag */
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const s = st.current
    grab.current = { dx: e.clientX - s.x, dy: e.clientY - s.y }
    s.state = 'held'
    ref.current?.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const g = grab.current
    if (!g) return
    const s = st.current
    s.x = Math.max(0, Math.min(window.innerWidth - SIZE, e.clientX - g.dx))
    s.y = Math.max(0, e.clientY - g.dy)
  }
  const up = () => {
    if (!grab.current) return
    grab.current = null
    st.current.state = 'fall'
    st.current.vy = 0
    st.current.dropped = true
  }

  const menu = (e: React.MouseEvent) => {
    e.preventDefault()
    useOS.getState().openMenu(
      e.clientX,
      e.clientY,
      [
        { id: 'head', label: 'Desktop pet', bold: true, disabled: true },
        { id: 'd0', divider: true },
        ...PETS.map((p) => ({
          id: p.id,
          label: p.name,
          checked: kind === p.id,
          run: () => setKind(p.id),
        })),
        { id: 'd1', divider: true },
        { id: 'hide', label: 'Send it away', run: () => setHidden(true) },
      ],
    )
  }

  if (phase !== 'desktop' || hidden) return null
  const s = st.current
  const blinking = s.blink % 4200 < 140

  return (
    <div
      className="pet"
      ref={ref}
      data-state={s.state}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={menu}
      title={`${PETS.find((p) => p.id === kind)?.name}. Drag it, or right-click to swap`}
    >
      <PetArt kind={kind} state={s.state} blink={blinking} />
    </div>
  )
}

function PetArt({ kind, state, blink }: { kind: PetKind; state: State; blink: boolean }) {
  /* Falling and dazed both flatten it, and dazed flattens it more: dropped, it
     lies on the floor rather than standing there looking dizzy. */
  const squash = state === 'dazed' ? 0.66 : state === 'sit' ? 0.86 : 1
  const braced = state === 'fall' || state === 'held'

  const eye = (cx: number) => {
    // screwed shut on the way down: the > < face
    if (braced) {
      const dir = cx < 26 ? 1 : -1
      return (
        <path
          d={`M${cx - 3.4 * dir} 22.6 L${cx + 3 * dir} 26 L${cx - 3.4 * dir} 29.4`}
          stroke="#1a1a2e"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )
    }
    // seeing stars: a spiral, which is the only way to draw dizzy without a mouth
    if (state === 'dazed') {
      return (
        <path
          d={`M${cx} 26
              m -3.4 0
              a 3.4 3.4 0 1 1 3.4 3.4
              a 2.2 2.2 0 1 1 -2.2 -2.2
              a 1.1 1.1 0 1 1 1.1 1.1`}
          stroke="#1a1a2e"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      )
    }
    return blink ? (
      <path d={`M${cx - 3} 26h6`} stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <>
        <ellipse cx={cx} cy={26} rx="2.6" ry="3.2" fill="#1a1a2e" />
        <circle cx={cx + 0.9} cy={24.8} r="0.9" fill="#fff" />
      </>
    )
  }

  return (
    <svg viewBox="0 0 52 52" width={52} height={52} aria-hidden>
      <defs>
        <radialGradient id={`pet-${kind}`} cx="0.36" cy="0.28" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.4" stopColor={BODY[kind][0]} />
          <stop offset="1" stopColor={BODY[kind][1]} />
        </radialGradient>
      </defs>
      <ellipse cx="26" cy="48" rx="14" ry="3" fill="rgba(4,20,50,0.28)" />
      <g transform={`translate(26 ${52 - 52 * squash}) scale(1 ${squash}) translate(-26 0)`}>
        {kind === 'cat' ? (
          <>
            <path d="M13 22 11 9l10 6Z" fill={BODY.cat[1]} />
            <path d="M39 22 41 9l-10 6Z" fill={BODY.cat[1]} />
            <path d="M43 40c4-3 5-8 3-11" stroke={BODY.cat[1]} strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : null}
        {kind === 'bird' ? (
          <>
            <path d="M26 8c2 0 3 2 3 4h-6c0-2 1-4 3-4Z" fill="#ffb02e" />
            <path d="M40 30c5-2 8 2 6 6-2 3-6 2-8-1Z" fill={BODY.bird[1]} />
          </>
        ) : null}
        <ellipse cx="26" cy="30" rx="17" ry="16" fill={`url(#pet-${kind})`} />
        {kind === 'jelly' ? (
          <g stroke={BODY.jelly[1]} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9">
            <path d="M17 43q2 5 0 8" />
            <path d="M26 45q-2 5 0 8" />
            <path d="M35 43q2 5 0 8" />
          </g>
        ) : null}
        <ellipse cx="21" cy="22" rx="9" ry="6" fill="#ffffff" opacity="0.35" />
        {eye(20)}
        {eye(32)}
        {kind === 'bird' ? <path d="M24 32h4l-2 3Z" fill="#ffb02e" /> : null}
        <ellipse cx="14" cy="32" rx="3.4" ry="2.2" fill="#ff9db0" opacity="0.45" />
        <ellipse cx="38" cy="32" rx="3.4" ry="2.2" fill="#ff9db0" opacity="0.45" />
      </g>
      {state === 'dazed' ? (
        <g className="pet__stars">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d="M0-4 1.1-1.1 4 0 1.1 1.1 0 4 -1.1 1.1 -4 0 -1.1-1.1Z"
              fill="#ffd23f"
              stroke="#e0a90c"
              strokeWidth="0.6"
              transform={`rotate(${i * 120} 26 14) translate(26 4)`}
            />
          ))}
        </g>
      ) : null}
    </svg>
  )
}

const BODY: Record<PetKind, [string, string]> = {
  blob: ['#7fe0ff', '#2b80e6'],
  cat: ['#ffd9a8', '#e2853a'],
  bird: ['#c8f8cf', '#35a85c'],
  jelly: ['#f0c4ff', '#9a4fd8'],
}
