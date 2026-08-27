import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useOS, type MenuItem } from './store'
import { Glyph, Icon } from '../ui/Icon'

/**
 * The Windows shell context menu: appears at the pointer, flips when it would
 * leave the screen, opens submenus on hover, closes on Escape, on a click
 * anywhere else, and on scroll.
 */
export function ContextMenu() {
  const menu = useOS((s) => s.menu)
  const close = useOS((s) => s.closeMenu)

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onScroll = () => close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onScroll, { passive: true })
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onScroll)
      window.removeEventListener('blur', close)
    }
  }, [menu, close])

  if (!menu) return null
  return (
    <>
      <div
        className="menu-scrim"
        onPointerDown={close}
        onContextMenu={(e) => {
          e.preventDefault()
          close()
        }}
      />
      <MenuPanel items={menu.items} x={menu.x} y={menu.y} onDone={close} />
    </>
  )
}

function MenuPanel({
  items,
  x,
  y,
  onDone,
  nested = false,
}: {
  items: MenuItem[]
  x: number
  y: number
  onDone: () => void
  nested?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [open, setOpen] = useState<string | null>(null)
  const [subAt, setSubAt] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let nx = x
    let ny = y
    if (x + r.width > window.innerWidth - 4) nx = nested ? x - r.width : window.innerWidth - r.width - 4
    if (y + r.height > window.innerHeight - 4) ny = Math.max(4, window.innerHeight - r.height - 4)
    setPos({ x: Math.max(4, nx), y: Math.max(4, ny) })
  }, [x, y, nested])

  return (
    <>
      <div className="menu" ref={ref} style={{ left: pos.x, top: pos.y }} role="menu">
        {items.map((item) =>
          item.divider ? (
            <hr key={item.id} className="menu__sep" />
          ) : (
            <button
              key={item.id}
              className="menu__item"
              role="menuitem"
              data-bold={item.bold}
              disabled={item.disabled}
              aria-haspopup={item.submenu ? 'menu' : undefined}
              onPointerEnter={(e) => {
                if (item.submenu && !item.disabled) {
                  const r = e.currentTarget.getBoundingClientRect()
                  setSubAt({ x: r.right - 3, y: r.top - 4 })
                  setOpen(item.id)
                } else {
                  setOpen(null)
                }
              }}
              onClick={() => {
                if (item.submenu || item.disabled) return
                item.run?.()
                onDone()
              }}
            >
              <span className="menu__tick">
                {item.checked ? <Glyph.check /> : null}
                {item.icon ? <Icon name={item.icon} /> : null}
              </span>
              <span className="menu__label">{item.label}</span>
              {item.submenu ? <Glyph.chevronRight className="menu__arrow" /> : null}
            </button>
          ),
        )}
      </div>

      {open
        ? items
            .filter((i) => i.id === open && i.submenu)
            .map((i) => (
              <MenuPanel key={i.id} items={i.submenu!} x={subAt.x} y={subAt.y} onDone={onDone} nested />
            ))
        : null}
    </>
  )
}

/** Attach a context menu to any element. */
export function useMenu() {
  const openMenu = useOS((s) => s.openMenu)
  return (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault()
    e.stopPropagation()
    openMenu(e.clientX, e.clientY, items)
  }
}
