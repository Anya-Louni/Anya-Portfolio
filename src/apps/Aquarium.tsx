/**
 * Aquarium.
 *
 * The tank itself is WebGL and lives in ../aquarium/tank3d, imported on
 * demand: three.js is a big dependency and only visitors who actually open
 * the aquarium should pay for it. Everything else — the stock fish, the
 * visitors' drawings, the HUD — is the same as it was.
 *
 * If WebGL is unavailable the app says so and offers the painter anyway,
 * rather than showing a black rectangle.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { STOCK, imageTexture, makeStockTexture } from '../aquarium/textures'
import type { FishInput, Tank } from '../aquarium/tank3d'
import { listFish } from '../lib/fish'
import { launch } from '../os/registry'

export default function Aquarium() {
  const hostRef = useRef<HTMLDivElement>(null)
  const tankRef = useRef<Tank | null>(null)
  const stockRef = useRef<FishInput[]>([])
  const drawnRef = useRef<FishInput[]>([])
  const [count, setCount] = useState({ drawn: 0, total: 0 })
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null)
  const [failed, setFailed] = useState(false)

  /** Hand the tank whatever we have: stock fish first, visitors' on top. */
  const publish = useCallback(() => {
    const all = [...stockRef.current, ...drawnRef.current]
    tankRef.current?.setFish(all)
    setCount({ drawn: drawnRef.current.length, total: all.length })
  }, [])

  const loadDrawn = useCallback(async () => {
    const rows = await listFish(40)
    const added: FishInput[] = []
    for (const row of rows) {
      try {
        added.push({ tex: await imageTexture(row.image), name: row.name })
      } catch {
        /* a corrupt drawing just doesn't join the tank */
      }
    }
    drawnRef.current = added
    publish()
  }, [publish])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let dead = false

    stockRef.current = STOCK.map((p) => ({ tex: makeStockTexture(p) }))

    void import('../aquarium/tank3d')
      .then(({ createTank }) => {
        if (dead) return
        tankRef.current = createTank(host)
        publish()
        void loadDrawn()
      })
      .catch((err) => {
        console.error('aquarium failed to start', err)
        if (!dead) setFailed(true)
      })

    return () => {
      dead = true
      tankRef.current?.dispose()
      tankRef.current = null
    }
  }, [loadDrawn, publish])

  return (
    <div className="aq">
      <div
        className="aq__stage"
        ref={hostRef}
        onPointerDown={(e) => tankRef.current?.feedAt(e.clientX, e.clientY)}
        onPointerMove={(e) => setHover(tankRef.current?.hoverAt(e.clientX, e.clientY) ?? null)}
        onPointerLeave={() => setHover(null)}
      />
      <div className="aq__frame" aria-hidden />

      {failed ? (
        <p className="aq__failed">
          This browser would not start WebGL, so the tank cannot run here.
          You can still draw a fish — it will be waiting for everyone else.
        </p>
      ) : null}

      {hover ? (
        <span className="aq__tag" style={{ left: hover.x, top: hover.y }}>
          {hover.name}
        </span>
      ) : null}

      <div className="aq__hud">
        <button className="aq__add" onClick={() => launch('fishpainter')}>
          Draw a fish
        </button>
        <span className="aq__count">
          {count.drawn} drawn · {count.total} swimming
        </span>
        <button className="aq__refresh" onClick={() => void loadDrawn()} title="Check for new fish">
          Refresh
        </button>
      </div>

      <p className="aq__hint">tap the glass to feed them</p>
    </div>
  )
}
