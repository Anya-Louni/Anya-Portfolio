import { useEffect } from 'react'
import { useOS } from '../os/store'
import { Icon } from './Icon'

export function Toasts() {
  const toasts = useOS((s) => s.toasts)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <ToastCard key={t.id} id={t.id} />
      ))}
    </div>
  )
}

function ToastCard({ id }: { id: number }) {
  const toast = useOS((s) => s.toasts.find((t) => t.id === id))
  const drop = useOS((s) => s.dropToast)

  useEffect(() => {
    const t = setTimeout(() => drop(id), 5200)
    return () => clearTimeout(t)
  }, [drop, id])

  if (!toast) return null
  return (
    <div className="toast">
      <Icon name={toast.icon} />
      <div>
        <p className="toast__title">{toast.title}</p>
        {toast.body ? <p className="toast__body">{toast.body}</p> : null}
      </div>
    </div>
  )
}
