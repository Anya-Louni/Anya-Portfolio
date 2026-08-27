import { useState } from 'react'
import { sendNote, type NoteColour } from '../lib/notes'
import { useOS } from '../os/store'
import { sound } from '../os/sound'

const COLOURS: { id: NoteColour; label: string }[] = [
  { id: 'yellow', label: 'Yellow' },
  { id: 'blue', label: 'Blue' },
  { id: 'green', label: 'Green' },
  { id: 'violet', label: 'Violet' },
]

export default function Guestbook() {
  const userName = useOS((s) => s.userName)
  const [message, setMessage] = useState('')
  const [from, setFrom] = useState(userName)
  const [colour, setColour] = useState<NoteColour>('yellow')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setError('')
    const res = await sendNote({ message, colour, from })
    if (res.ok) {
      setState('sent')
      sound.chime()
    } else {
      setState('idle')
      setError(res.error)
    }
  }

  if (state === 'sent') {
    return (
      <div className="gb gb--done">
        <div className="gb__stamp" data-tint={colour}>
          <svg viewBox="0 0 48 48" aria-hidden>
            <path
              d="M24 41.5 8.2 26.8C3.4 22.3 3.7 14.6 8.9 10.5c4.4-3.5 10.8-2.6 14.1 1.9l1 1.4 1-1.4c3.3-4.5 9.7-5.4 14.1-1.9 5.2 4.1 5.5 11.8.7 16.3Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p className="gb__doneTitle">delivered ♡</p>
        <p className="gb__doneBody">
          It went straight to Anya’s pinboard. Nobody else can see it, including you now.
        </p>
        <button
          className="aero-btn"
          onClick={() => {
            setMessage('')
            setState('idle')
          }}
        >
          Write another
        </button>
      </div>
    )
  }

  return (
    <form className="gb" onSubmit={submit}>
      <p className="gb__lead">
        Leave a note. It goes to a private inbox — it is never shown on this site, to you or to
        anyone else who visits.
      </p>

      <div className="gb__note" data-tint={colour}>
        <textarea
          className="gb__text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={600}
          placeholder="say anything"
          aria-label="Your note"
          required
        />
        <span className="gb__count">{600 - message.length}</span>
      </div>

      <div className="gb__row">
        <span className="gb__label">Paper</span>
        <div className="gb__swatches" role="radiogroup" aria-label="Note colour">
          {COLOURS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="gb__swatch"
              data-tint={c.id}
              data-on={colour === c.id}
              role="radio"
              aria-checked={colour === c.id}
              aria-label={c.label}
              title={c.label}
              onClick={() => {
                setColour(c.id)
                sound.click(1.2)
              }}
            />
          ))}
        </div>
      </div>

      <div className="gb__row">
        <label className="gb__label" htmlFor="gb-from">
          From
        </label>
        <input
          id="gb-from"
          className="aero-field gb__from"
          value={from}
          maxLength={40}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="optional"
        />
      </div>

      {error ? <p className="gb__error">{error}</p> : null}

      <div className="gb__actions">
        <button
          className="aero-btn aero-btn--primary"
          type="submit"
          disabled={!message.trim() || state === 'sending'}
        >
          {state === 'sending' ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  )
}
