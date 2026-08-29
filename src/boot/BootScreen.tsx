import { useEffect, useState } from 'react'
import { Mark } from '../ui/Icon'

const TOTAL = 4200

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      onDone()
      return
    }
    const a = setTimeout(() => setLeaving(true), TOTAL)
    const b = setTimeout(onDone, TOTAL + 880)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [onDone])

  return (
    <div className="boot" data-leaving={leaving}>
      <div className="boot__stage">
        <span className="boot__orb" />
        <span className="boot__orb" />
        <span className="boot__orb" />
        <span className="boot__orb" />
        <Mark className="boot__mark" />
      </div>
      <p className="boot__caption">
        Starting <b>OSnya</b>
      </p>
      <button className="boot__skip" onClick={onDone}>
        Skip
      </button>
    </div>
  )
}
