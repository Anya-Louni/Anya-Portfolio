/**
 * Aquarium.
 *
 * The tank is WebGL and lives in ../aquarium/tank3d, imported on demand:
 * three.js is a big dependency and only visitors who actually open the
 * aquarium should pay for it.
 *
 * It is also a shop. Every creature you own earns a trickle of coins and
 * coins buy more creatures, which is the whole loop — the tank fills up
 * because it has been running, not because someone pressed a button. That
 * part is yours alone and lives in this browser. The fish with names on them
 * are the shared half: other visitors drew those, and they cost nothing.
 *
 * If WebGL is unavailable the app says so and offers the painter anyway,
 * rather than showing a black rectangle.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { STOCK, imageTexture, makeStockTexture } from '../aquarium/textures'
import { SPECIES, makeCreatureTexture, priceOf } from '../aquarium/creatures'
import {
  FED_FOR, FED_MULTIPLIER, affordable, awayText, buy, catchUp, load, payOut, ratePerSecond, save,
  type Tank as Save,
} from '../aquarium/economy'
import { coinText as coins, useCoins } from '../os/purse'
import type { FishInput, Tank } from '../aquarium/tank3d'
import { listFish } from '../lib/fish'
import { launch } from '../os/registry'
import { sound } from '../os/sound'

export default function Aquarium() {
  const hostRef = useRef<HTMLDivElement>(null)
  const tankRef = useRef<Tank | null>(null)
  const drawnRef = useRef<FishInput[]>([])
  const [saveState, setSaveState] = useState<Save>(load)
  const [drawn, setDrawn] = useState(0)
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [welcome, setWelcome] = useState<string | null>(null)
  const [shopOpen, setShopOpen] = useState(true)

  const caughtUp = useRef(false)
  const purse = useCoins()
  const saveRef = useRef(saveState)
  saveRef.current = saveState

  /* Textures are built once, and so are the data URLs the shop shows. The
     coin count moves five times a second, so anything done inline in the
     render happens five times a second — and toDataURL on nine canvases at
     that rate was by a wide margin the most expensive thing in the app. */
  const art = useMemo(() => {
    const m: Record<string, HTMLCanvasElement> = {}
    for (const s of SPECIES) m[s.id] = makeCreatureTexture(s)
    return m
  }, [])
  const artUrl = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of SPECIES) m[s.id] = art[s.id].toDataURL()
    return m
  }, [art])
  const stock = useMemo(() => STOCK.slice(0, 4).map((p) => ({ tex: makeStockTexture(p) })), [])

  const rate = ratePerSecond(saveState.owned)
  const fed = saveState.fedUntil > Date.now() / 1000
  const live = rate * (fed ? FED_MULTIPLIER : 1)

  /** Hand the tank everything currently in it. */
  const publish = useCallback(() => {
    const bought: FishInput[] = []
    for (const s of SPECIES) {
      const n = saveRef.current.owned[s.id] ?? 0
      // a hard ceiling per species: past this the tank is soup, not an aquarium
      for (let i = 0; i < Math.min(n, 24); i++) {
        bought.push({ tex: art[s.id], size: s.size, pace: s.pace, band: s.band })
      }
    }
    tankRef.current?.setFish([...stock, ...bought, ...drawnRef.current])
  }, [art, stock])

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
    setDrawn(added.length)
    publish()
  }, [publish])

  /* ---------------- boot ---------------- */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let dead = false

    /* Guarded by a ref, and the catch-up stamps `seen` as it applies. React
       mounts effects twice in development, and without both of those the time
       spent away was paid out twice over. */
    if (!caughtUp.current) {
      caughtUp.current = true
      const back = catchUp(saveRef.current)
      if (back.coins > 0) {
        payOut(back.coins)
        setSaveState((t) => ({
          ...t,
          earned: t.earned + back.coins,
          seen: Math.floor(Date.now() / 1000),
        }))
        setWelcome(`They kept working: ${coins(back.coins)} while you were away ${awayText(back.seconds)}.`)
      }
    }

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

  /* ---------------- the trickle ---------------- */
  useEffect(() => {
    const id = window.setInterval(() => {
      setSaveState((t) => {
        const boost = t.fedUntil > Date.now() / 1000 ? FED_MULTIPLIER : 1
        const gain = (ratePerSecond(t.owned) * boost) / 5
        if (!gain) return t
        payOut(gain)
        return { ...t, earned: t.earned + gain }
      })
    }, 200)
    return () => window.clearInterval(id)
  }, [])

  /* Written on a timer rather than on every tick: the coin count changes five
     times a second and localStorage is synchronous. */
  useEffect(() => {
    const id = window.setInterval(() => save(saveRef.current), 4000)
    const bye = () => save(saveRef.current)
    window.addEventListener('pagehide', bye)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('pagehide', bye)
      save(saveRef.current)
    }
  }, [])

  const purchase = (id: string) => {
    setSaveState((t) => {
      const next = buy(t, id)
      if (!next) return t
      sound.click(0.9)
      return next
    })
  }

  // the tank only needs rebuilding when the count of something changes
  const ownedKey = SPECIES.map((s) => saveState.owned[s.id] ?? 0).join(',')
  useEffect(() => { publish() }, [ownedKey, publish])

  const feed = (x: number, y: number) => {
    tankRef.current?.feedAt(x, y)
    setSaveState((t) => ({ ...t, fedUntil: Date.now() / 1000 + FED_FOR }))
  }

  const total = SPECIES.reduce((n, s) => n + (saveState.owned[s.id] ?? 0), 0)

  return (
    <div className="aq">
      <div
        className="aq__stage"
        ref={hostRef}
        onPointerDown={(e) => feed(e.clientX, e.clientY)}
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

      <div className="aq__purse">
        <span className="aq__coins">
          <i aria-hidden />
          {coins(purse)}
        </span>
        <span className="aq__rate" data-fed={fed}>
          {coins(live)}/s{fed ? ' · well fed' : ''}
        </span>
      </div>

      {welcome ? (
        <button className="aq__welcome" onClick={() => setWelcome(null)}>
          {welcome}
          <b>Dismiss</b>
        </button>
      ) : null}

      <aside className="aq__shop" data-open={shopOpen}>
        <button className="aq__shopTab" onClick={() => setShopOpen((o) => !o)}>
          {shopOpen ? '›' : '‹'}
          <span>Shop</span>
        </button>

        <div className="aq__shopBody">
          <header className="aq__shopHead">
            <b>Stock the tank</b>
            <span>{total} bought · {drawn} drawn</span>
          </header>

          <ul className="aq__list">
            {SPECIES.map((s) => {
              const n = saveState.owned[s.id] ?? 0
              const price = priceOf(s, n)
              const can = affordable(saveState, s.id)
              // don't show the whole ladder at once; reveal the next rung
              const shown = n > 0 || saveState.earned >= s.base * 0.35
              if (!shown) return null
              return (
                <li key={s.id} className="aq__item">
                  <button className="aq__buy" disabled={!can} onClick={() => purchase(s.id)}>
                    <img className="aq__art" src={artUrl[s.id]} alt="" />
                    <span className="aq__meta">
                      <b>{s.name}{n ? <em> ×{n}</em> : null}</b>
                      <span className="aq__blurb">{s.blurb}</span>
                      <span className="aq__nums">
                        {coins(price)} · +{coins(s.rate)}/s
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <footer className="aq__shopFoot">
            <button className="aq__add" onClick={() => launch('fishpainter')}>Draw a fish</button>
            <button className="aq__refresh" onClick={() => void loadDrawn()} title="Check for new fish">
              Refresh
            </button>
          </footer>
        </div>
      </aside>

      <p className="aq__hint">tap the glass to feed them — they pay double for {FED_FOR}s</p>
    </div>
  )
}
