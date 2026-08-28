import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../../os/sound'
import { prize } from '../../os/prize'

type Level = 'beginner' | 'intermediate' | 'expert'
const LEVELS: Record<Level, { w: number; h: number; mines: number }> = {
  beginner: { w: 9, h: 9, mines: 10 },
  intermediate: { w: 16, h: 16, mines: 40 },
  expert: { w: 30, h: 16, mines: 99 },
}

interface Cell {
  mine: boolean
  near: number
  open: boolean
  flag: boolean
}

type Status = 'ready' | 'playing' | 'lost' | 'won'

function blank(w: number, h: number): Cell[] {
  return Array.from({ length: w * h }, () => ({ mine: false, near: 0, open: false, flag: false }))
}

/** mines are placed after the first click, so the first click is never a mine */
function place(cells: Cell[], w: number, h: number, mines: number, safe: number) {
  const forbidden = new Set<number>([safe])
  const sx = safe % w
  const sy = Math.floor(safe / w)
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const x = sx + dx
      const y = sy + dy
      if (x >= 0 && x < w && y >= 0 && y < h) forbidden.add(y * w + x)
    }

  const spots: number[] = []
  for (let i = 0; i < cells.length; i++) if (!forbidden.has(i)) spots.push(i)
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[spots[i], spots[j]] = [spots[j], spots[i]]
  }
  const next = cells.map((c) => ({ ...c }))
  for (let i = 0; i < mines && i < spots.length; i++) next[spots[i]].mine = true

  for (let i = 0; i < next.length; i++) {
    if (next[i].mine) continue
    const x = i % w
    const y = Math.floor(i / w)
    let n = 0
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
        if (next[ny * w + nx].mine) n++
      }
    next[i].near = n
  }
  return next
}

export default function Minesweeper() {
  const [level, setLevel] = useState<Level>('beginner')
  const { w, h, mines } = LEVELS[level]
  const [cells, setCells] = useState<Cell[]>(() => blank(w, h))
  const [status, setStatus] = useState<Status>('ready')
  const [ticks, setTicks] = useState(0)
  const [scared, setScared] = useState(false)
  const timer = useRef<number | null>(null)
  /* no seed to key the payout on, so a counter that ticks on every new board */
  const [round, setRound] = useState(0)

  const reset = useCallback(
    (lv: Level = level) => {
      const d = LEVELS[lv]
      setLevel(lv)
      setCells(blank(d.w, d.h))
      setStatus('ready')
      setTicks(0)
      setRound((n) => n + 1)
      sound.click(1.1)
    },
    [level],
  )

  useEffect(() => {
    if (status !== 'playing') {
      if (timer.current) window.clearInterval(timer.current)
      timer.current = null
      return
    }
    timer.current = window.setInterval(() => setTicks((t) => Math.min(999, t + 1)), 1000)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [status])

  const flags = cells.filter((c) => c.flag).length
  const remaining = mines - flags

  const floodOpen = (arr: Cell[], start: number) => {
    const stack = [start]
    while (stack.length) {
      const i = stack.pop()!
      const c = arr[i]
      if (c.open || c.flag) continue
      c.open = true
      if (c.near !== 0) continue
      const x = i % w
      const y = Math.floor(i / w)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const ni = ny * w + nx
          if (!arr[ni].open && !arr[ni].flag) stack.push(ni)
        }
    }
  }

  const finish = (arr: Cell[], lost: boolean) => {
    if (lost) {
      arr.forEach((c) => {
        if (c.mine) c.open = true
      })
      setStatus('lost')
      sound.puff()
      return
    }
    const cleared = arr.every((c) => c.mine || c.open)
    if (cleared) {
      arr.forEach((c) => {
        if (c.mine) c.flag = true
      })
      setStatus('won')
      sound.chime()
      prize(`mine-${level}-${round}`, { beginner: 90, intermediate: 320, expert: 900 }[level],
        `Minesweeper, ${level}`)
    }
  }

  const open = (i: number) => {
    if (status === 'lost' || status === 'won') return
    setCells((prev) => {
      let arr = prev.map((c) => ({ ...c }))
      if (status === 'ready') {
        arr = place(arr, w, h, mines, i)
        setStatus('playing')
      }
      const c = arr[i]
      if (c.flag || c.open) return arr
      if (c.mine) {
        c.open = true
        finish(arr, true)
        return arr
      }
      floodOpen(arr, i)
      finish(arr, false)
      sound.click(1.25)
      return arr
    })
  }

  const flag = (i: number) => {
    if (status === 'lost' || status === 'won') return
    setCells((prev) => {
      const arr = prev.map((c) => ({ ...c }))
      if (arr[i].open) return prev
      arr[i].flag = !arr[i].flag
      sound.click(arr[i].flag ? 1.5 : 0.85)
      return arr
    })
  }

  /** middle-click / both-button chord: open neighbours when flags match */
  const chord = (i: number) => {
    if (status !== 'playing') return
    setCells((prev) => {
      const arr = prev.map((c) => ({ ...c }))
      const c = arr[i]
      if (!c.open || c.near === 0) return prev
      const x = i % w
      const y = Math.floor(i / w)
      const near: number[] = []
      let flagged = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const ni = ny * w + nx
          if (ni === i) continue
          if (arr[ni].flag) flagged++
          else if (!arr[ni].open) near.push(ni)
        }
      if (flagged !== c.near) return prev
      let boom = false
      for (const ni of near) {
        if (arr[ni].mine) boom = true
        else floodOpen(arr, ni)
      }
      finish(arr, boom)
      return arr
    })
  }

  const faceLabel = status === 'lost' ? '×_×' : status === 'won' ? '⌐■_■' : scared ? ':O' : ':)'

  return (
    <div className="ms">
      <div className="ms__chrome">
        <div className="ms__head">
          <span className="ms__lcd" aria-label={`${remaining} mines left`}>
            {String(Math.max(-99, Math.min(999, remaining))).padStart(3, '0')}
          </span>
          <button className="ms__face" onClick={() => reset()} aria-label="New game">
            <span className="ms__faceText">{faceLabel}</span>
          </button>
          <span className="ms__lcd" aria-label={`${ticks} seconds`}>
            {String(ticks).padStart(3, '0')}
          </span>
        </div>

        <div
          className="ms__grid"
          style={{ gridTemplateColumns: `repeat(${w}, 20px)` }}
          onPointerLeave={() => setScared(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {cells.map((c, i) => (
            <button
              key={i}
              className="ms__cell"
              data-open={c.open}
              data-mine={c.open && c.mine}
              data-near={c.open && !c.mine ? c.near : undefined}
              onPointerDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  chord(i)
                } else if (e.button === 0) setScared(true)
              }}
              onPointerUp={() => setScared(false)}
              onClick={() => (c.open ? chord(i) : open(i))}
              onContextMenu={(e) => {
                e.preventDefault()
                flag(i)
              }}
              aria-label={c.open ? (c.mine ? 'mine' : `${c.near}`) : c.flag ? 'flagged' : 'covered'}
            >
              {c.open && c.mine ? (
                <svg viewBox="0 0 16 16" aria-hidden>
                  <circle cx="8" cy="8" r="4.4" fill="#111" />
                  <path
                    d="M8 1.6v12.8M1.6 8h12.8M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8"
                    stroke="#111"
                    strokeWidth="1.4"
                  />
                  <circle cx="6.4" cy="6.4" r="1.1" fill="#fff" />
                </svg>
              ) : c.flag ? (
                <svg viewBox="0 0 16 16" aria-hidden>
                  <path d="M5.5 2.4v11.2" stroke="#111" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M3 13.6h6" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M5.5 2.6 12.4 5.4 5.5 8.2Z" fill="#d63b2f" />
                </svg>
              ) : c.open && c.near ? (
                c.near
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="ms__levels">
        {(Object.keys(LEVELS) as Level[]).map((lv) => (
          <button key={lv} className="game__btn" data-on={level === lv} onClick={() => reset(lv)}>
            {lv[0].toUpperCase() + lv.slice(1)}
          </button>
        ))}
        <span className="game__spacer" />
        <span className="game__stat">
          {status === 'won' ? 'Cleared' : status === 'lost' ? 'Boom' : 'Right-click to flag'}
        </span>
      </div>
    </div>
  )
}
