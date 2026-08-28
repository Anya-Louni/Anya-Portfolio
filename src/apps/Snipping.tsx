import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../os/sound'
import { launch } from '../os/registry'

/**
 * Snipping Tool.
 *
 * A browser cannot photograph its own page, so this uses the screen capture
 * API: you pick a surface, the browser grants one frame, and the rectangle
 * you dragged is cropped out of it. Nothing is recorded and no frame leaves
 * the machine.
 */

type Mode = 'idle' | 'selecting' | 'shot'

export default function Snipping() {
  const [mode, setMode] = useState<Mode>('idle')
  const [shot, setShot] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const anchor = useRef<{ x: number; y: number } | null>(null)

  const capture = useCallback(async (region: { x: number; y: number; w: number; h: number } | null) => {
    setError('')
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
      })
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play()
      // one frame is enough
      await new Promise((r) => setTimeout(r, 240))

      const fw = video.videoWidth
      const fh = video.videoHeight
      const canvas = document.createElement('canvas')

      /* Map viewport coordinates onto the captured frame. If they shared the
         tab, the frame matches the viewport and this is exact; if they shared
         a whole screen it is proportional, which is close enough to be useful. */
      const sx = fw / window.innerWidth
      const sy = fh / window.innerHeight
      const r = region ?? { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }
      const cw = Math.max(1, Math.round(r.w * sx))
      const ch = Math.max(1, Math.round(r.h * sy))
      canvas.width = cw
      canvas.height = ch
      canvas
        .getContext('2d')!
        .drawImage(video, Math.round(r.x * sx), Math.round(r.y * sy), cw, ch, 0, 0, cw, ch)
      setShot(canvas.toDataURL('image/png'))
      setMode('shot')
      sound.chime()
    } catch (e) {
      setMode('idle')
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Screen capture was cancelled or blocked.'
          : 'This browser will not share a screen here.',
      )
    } finally {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  /* the dimming overlay you drag a rectangle on */
  useEffect(() => {
    if (mode !== 'selecting') return
    const down = (e: PointerEvent) => {
      anchor.current = { x: e.clientX, y: e.clientY }
      setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
    }
    const move = (e: PointerEvent) => {
      const a = anchor.current
      if (!a) return
      setRect({
        x: Math.min(a.x, e.clientX),
        y: Math.min(a.y, e.clientY),
        w: Math.abs(e.clientX - a.x),
        h: Math.abs(e.clientY - a.y),
      })
    }
    const up = () => {
      const a = anchor.current
      anchor.current = null
      setRect((r) => {
        if (a && r && r.w > 8 && r.h > 8) {
          setMode('idle')
          void capture(r)
        } else {
          setMode('idle')
        }
        return null
      })
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        anchor.current = null
        setRect(null)
        setMode('idle')
      }
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', esc)
    }
  }, [mode, capture])

  const save = () => {
    if (!shot) return
    const a = document.createElement('a')
    a.download = `snip-${Date.now()}.png`
    a.href = shot
    a.click()
  }

  const copy = async () => {
    if (!shot) return
    try {
      const blob = await (await fetch(shot)).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setError('')
    } catch {
      setError('This browser will not let a page write images to the clipboard.')
    }
  }

  return (
    <>
      <div className="sn2">
        <div className="sn2__bar">
          <button
            className="game__btn game__btn--go"
            onClick={() => {
              setMode('selecting')
              setShot(null)
            }}
          >
            New snip
          </button>
          <button className="game__btn" onClick={() => void capture(null)}>
            Whole window
          </button>
          <span className="game__spacer" />
          {shot ? (
            <>
              <button className="game__btn" onClick={copy}>
                Copy
              </button>
              <button className="game__btn" onClick={save}>
                Save
              </button>
              <button className="game__btn" onClick={() => launch('paint')}>
                Open Paint
              </button>
            </>
          ) : null}
        </div>

        <div className="sn2__stage">
          {shot ? (
            <img src={shot} alt="The snip you just took" className="sn2__img" />
          ) : (
            <div className="sn2__hint">
              <p className="sn2__hintTitle">Nothing snipped yet</p>
              <p>
                <b>New snip</b> dims the screen so you can drag a rectangle. The browser will ask
                which surface to share — pick <b>this tab</b> for an exact crop.
              </p>
              {error ? <p className="sn2__error">{error}</p> : null}
            </div>
          )}
        </div>

        <div className="sn2__status">
          <span>{shot ? 'Ready — save it, or copy it' : 'Press New snip'}</span>
          <span className="game__spacer" />
          <span>Nothing is recorded</span>
        </div>
      </div>

      {mode === 'selecting' ? (
        <div className="sn2__overlay">
          {rect ? (
            <div className="sn2__marquee" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
              <span>{Math.round(rect.w)} × {Math.round(rect.h)}</span>
            </div>
          ) : (
            <p className="sn2__prompt">Drag a rectangle · Esc to cancel</p>
          )}
        </div>
      ) : null}
    </>
  )
}
