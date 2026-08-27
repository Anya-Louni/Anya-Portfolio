import { useEffect } from 'react'
import { useOS } from './store'
import { Icon } from '../ui/Icon'

/**
 * Alt+Tab. Hold Alt, press Tab to walk the most-recently-used order,
 * release Alt to commit — the way Windows does it.
 */
export function Switcher() {
  const index = useOS((s) => s.switcher)
  const wins = useOS((s) => s.wins)
  const open = useOS((s) => s.openSwitcher)
  const cycle = useOS((s) => s.cycleSwitcher)
  const commit = useOS((s) => s.commitSwitcher)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && e.altKey) {
        e.preventDefault()
        if (useOS.getState().switcher === null) open()
        else cycle(e.shiftKey ? -1 : 1)
      }
      if (e.key === 'Escape' && useOS.getState().switcher !== null) {
        e.preventDefault()
        useOS.setState({ switcher: null })
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && useOS.getState().switcher !== null) commit()
    }
    const onBlur = () => {
      if (useOS.getState().switcher !== null) commit()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [open, cycle, commit])

  if (index === null) return null
  const order = wins.filter((w) => !w.closing).sort((a, b) => b.z - a.z)
  if (!order.length) return null
  const current = order[index % order.length]

  return (
    <div className="switcher" role="dialog" aria-label="Switch window">
      <div className="switcher__row">
        {order.map((w, i) => (
          <div key={w.id} className="switcher__tile" data-on={i === index % order.length}>
            <Icon name={w.icon} />
          </div>
        ))}
      </div>
      <p className="switcher__title">{current?.title}</p>
    </div>
  )
}
