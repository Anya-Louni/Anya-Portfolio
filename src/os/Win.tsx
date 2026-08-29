import { useCallback, useEffect, useRef, useState } from 'react'
import { useOS, viewport, type Rect, type SnapZone, type WinInstance } from './store'
import { Glyph, Icon } from '../ui/Icon'
import { getApp } from './registry'
import { useMenu } from './ContextMenu'
import type { MenuItem } from './store'

type Drag =
  | { kind: 'move'; dx: number; dy: number }
  | { kind: 'resize'; dir: string; start: Rect; px: number; py: number }
  | null

export function Win({ win }: { win: WinInstance }) {
  const { focus, close, reap, settle, minimize, toggleMax, setRect, snapTo, restoreIfMax } = useOS()
  const active = useOS((s) => s.activeId === win.id)
  const peeking = useOS((s) => s.peeking)
  const ref = useRef<HTMLElement>(null)
  const drag = useRef<Drag>(null)
  const [busy, setBusy] = useState<'' | 'dragging' | 'resizing'>('')
  const [ghost, setGhost] = useState<Rect | null>(null)
  const zone = useRef<SnapZone>(null)
  const menu = useMenu()

  /* the caption's system menu, right-click the bar or left-click the icon */
  const systemMenu = (e: React.MouseEvent) => {
    const items: MenuItem[] = [
      { id: 'restore', label: 'Restore', disabled: !win.maximized, run: () => toggleMax(win.id, viewport()) },
      { id: 'move', label: 'Move', disabled: true },
      { id: 'size', label: 'Size', disabled: true },
      { id: 'min', label: 'Minimize', run: () => minimize(win.id) },
      { id: 'max', label: 'Maximize', disabled: win.maximized || !win.resizable, run: () => toggleMax(win.id, viewport()) },
      { id: 'd1', divider: true },
      { id: 'close', label: 'Close', bold: true, run: () => close(win.id) },
    ]
    menu(e, items)
  }

  /* entering / closing lifecycle ------------------------------------- */
  useEffect(() => {
    if (!win.entering) return
    const t = setTimeout(() => settle(win.id), 360)
    return () => clearTimeout(t)
  }, [win.entering, win.id, settle])

  useEffect(() => {
    if (!win.closing) return
    const t = setTimeout(() => reap(win.id), 180)
    return () => clearTimeout(t)
  }, [win.closing, win.id, reap])

  /* pointer driving --------------------------------------------------- */
  const onTitleDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('.wctl')) return
      if (e.button !== 0) return
      focus(win.id)
      const el = ref.current
      if (!el) return
      if (win.maximized) {
        restoreIfMax(win.id, e.clientX)
        const r = (win.props?.__restore as Rect | undefined) ?? { x: 0, y: 0, w: 760, h: 520 }
        drag.current = { kind: 'move', dx: r.w / 2, dy: e.clientY - 8 }
      } else {
        drag.current = { kind: 'move', dx: e.clientX - win.x, dy: e.clientY - win.y }
      }
      el.setPointerCapture(e.pointerId)
      setBusy('dragging')
    },
    [focus, restoreIfMax, win.id, win.maximized, win.props, win.x, win.y],
  )

  const onHandleDown = useCallback(
    (e: React.PointerEvent, dir: string) => {
      if (e.button !== 0) return
      e.stopPropagation()
      focus(win.id)
      const el = ref.current
      if (!el) return
      drag.current = {
        kind: 'resize',
        dir,
        start: { x: win.x, y: win.y, w: win.w, h: win.h },
        px: e.clientX,
        py: e.clientY,
      }
      el.setPointerCapture(e.pointerId)
      setBusy('resizing')
    },
    [focus, win.h, win.id, win.w, win.x, win.y],
  )

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current
      if (!d) return
      const vp = viewport()

      if (d.kind === 'move') {
        const x = e.clientX - d.dx
        const y = e.clientY - d.dy
        setRect(win.id, {
          x: Math.min(Math.max(x, -win.w + 120), vp.w - 120),
          y: Math.min(Math.max(y, 0), vp.h - 34),
        })

        // Aero Snap zone detection
        let z: SnapZone = null
        if (e.clientY <= 4) z = 'top'
        else if (e.clientX <= 4) z = 'left'
        else if (e.clientX >= vp.w - 5) z = 'right'
        if (z !== zone.current) {
          zone.current = z
          if (!z) setGhost(null)
          else if (z === 'top') setGhost({ ...vp })
          else
            setGhost({
              x: z === 'left' ? 0 : Math.round(vp.w / 2),
              y: 0,
              w: Math.round(vp.w / 2),
              h: vp.h,
            })
        }
        return
      }

      const { dir, start, px, py } = d
      const dx = e.clientX - px
      const dy = e.clientY - py
      let { x, y, w, h } = start
      if (dir.includes('e')) w = Math.max(win.minW, start.w + dx)
      if (dir.includes('s')) h = Math.max(win.minH, start.h + dy)
      if (dir.includes('w')) {
        w = Math.max(win.minW, start.w - dx)
        x = start.x + (start.w - w)
      }
      if (dir.includes('n')) {
        h = Math.max(win.minH, start.h - dy)
        y = start.y + (start.h - h)
      }
      setRect(win.id, { x, y, w, h })
    },
    [setRect, win.id, win.minH, win.minW, win.w],
  )

  const onUp = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current
      drag.current = null
      setBusy('')
      ref.current?.releasePointerCapture?.(e.pointerId)
      if (d?.kind === 'move' && zone.current) {
        snapTo(win.id, zone.current, viewport())
      }
      zone.current = null
      setGhost(null)
    },
    [snapTo, win.id],
  )

  /* keyboard ----------------------------------------------------------- */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && active) {
      close(win.id)
    }
  }

  const app = getApp(win.appId)
  const Body = app?.Component

  return (
    <>
      {ghost ? (
        <div
          className="snap-ghost"
          style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h }}
        />
      ) : null}
      <section
        ref={ref}
        className="win"
        aria-label={win.title}
        style={{
          left: win.x,
          top: win.y,
          width: win.w,
          height: win.h,
          zIndex: win.z,
          opacity: peeking && !active ? 0.12 : undefined,
          transition: peeking ? 'opacity 220ms var(--e-out)' : undefined,
        }}
        data-active={active}
        data-minimized={win.minimized}
        data-dragging={busy === 'dragging'}
        data-resizing={busy === 'resizing'}
        data-maxanim={!busy}
        data-anim={win.closing ? 'out' : win.entering ? 'in' : undefined}
        onPointerDown={() => focus(win.id)}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKeyDown}
      >
        <header
          className="win__title no-select"
          onPointerDown={onTitleDown}
          onDoubleClick={() => win.resizable && toggleMax(win.id, viewport())}
          onContextMenu={systemMenu}
        >
          <button
            className="win__sysbtn"
            aria-label="System menu"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={systemMenu}
          >
            <Icon name={win.icon} className="win__icon" />
          </button>
          <span className="win__label">{win.title}</span>
          <span className="win__spacer" />
          <div className="win__ctrls">
            <button className="wctl" aria-label="Minimise" onClick={() => minimize(win.id)}>
              <Glyph.minimize />
            </button>
            {win.resizable ? (
              <button
                className="wctl"
                aria-label={win.maximized ? 'Restore down' : 'Maximise'}
                onClick={() => toggleMax(win.id, viewport())}
              >
                {win.maximized ? <Glyph.restore /> : <Glyph.maximize />}
              </button>
            ) : null}
            <button className="wctl wctl--close" aria-label="Close" onClick={() => close(win.id)}>
              <Glyph.close />
            </button>
          </div>
        </header>

        <div className={`win__body win7${win.flush ? ' win__body--flush' : ''}`}>
          {Body ? <Body winId={win.id} params={win.props} /> : null}
        </div>

        {win.resizable && !win.maximized
          ? ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((dir) => (
              <div
                key={dir}
                className="resize-handle"
                data-dir={dir}
                onPointerDown={(e) => onHandleDown(e, dir)}
              />
            ))
          : null}
      </section>
    </>
  )
}
