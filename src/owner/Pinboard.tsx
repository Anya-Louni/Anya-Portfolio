import { useCallback, useEffect, useState } from 'react'
import { currentUser, isRemote, readNotes, signIn, signOut, type Note } from '../lib/notes'

/**
 * The owner's private inbox at /notes (or #/notes).
 *
 * The gate is Supabase Auth, not a password compared in the browser, a
 * client-side check would be decoration, since the whole bundle is public and
 * anyone could read the comparison or call the API directly. Reading is denied
 * by row-level security unless the request carries a signed-in session.
 */
export function Pinboard() {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])

  const load = useCallback(async () => {
    try {
      setNotes(await readNotes())
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the inbox.')
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!isRemote) {
        setAuthed(true)
        await load()
      } else if (await currentUser()) {
        setAuthed(true)
        await load()
      }
      setReady(true)
    })()
  }, [load])

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await signIn(email, password)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setAuthed(true)
    setPassword('')
    await load()
  }

  if (!ready) return <div className="pin pin--wait">Checking…</div>

  if (!authed) {
    return (
      <div className="pin pin--gate">
        <form className="pin__gate" onSubmit={doSignIn}>
          <h1 className="pin__title">Private inbox</h1>
          <p className="pin__sub">Owner sign-in.</p>
          <input
            className="aero-field"
            type="email"
            autoComplete="username"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="aero-field"
            type="password"
            autoComplete="current-password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className="pin__error">{error}</p> : null}
          <button className="aero-btn aero-btn--primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="pin">
      <header className="pin__bar">
        <h1 className="pin__title">Notes</h1>
        <span className="pin__count">
          {notes.length} note{notes.length === 1 ? '' : 's'}
        </span>
        {!isRemote ? (
          <span className="pin__badge">local fallback: no Supabase configured</span>
        ) : null}
        <span className="pin__spacer" />
        <button className="aero-btn" onClick={load}>
          Refresh
        </button>
        {isRemote ? (
          <button
            className="aero-btn"
            onClick={async () => {
              await signOut()
              setAuthed(false)
            }}
          >
            Sign out
          </button>
        ) : null}
      </header>

      {error ? <p className="pin__error">{error}</p> : null}

      {notes.length === 0 ? (
        <p className="pin__empty">Nothing yet.</p>
      ) : (
        <div className="pin__board">
          {notes.map((n, i) => (
            <article className="pin__note" data-tint={n.colour} key={n.id} style={{ ['--rot' as string]: `${((i * 37) % 7) - 3}deg` }}>
              <span className="pin__pin" aria-hidden />
              <p className="pin__msg">{n.message}</p>
              <footer className="pin__meta">
                <span>{n.from_name || 'anonymous'}</span>
                <time dateTime={n.created_at}>
                  {new Date(n.created_at).toLocaleDateString([], {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
