import { useEffect, useRef, useState } from 'react'
import { Wallpaper } from '../art/Wallpaper'
import { Glyph, Mark } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { useOS } from '../os/store'
import { sound } from '../os/sound'

export function LoginScreen() {
  const signIn = useOS((s) => s.signIn)
  const soundOn = useOS((s) => s.soundOn)
  const setSound = useOS((s) => s.setSound)
  const pushToast = useOS((s) => s.pushToast)
  const remembered = useOS((s) => s.userName)
  const [name, setName] = useState(remembered)
  const [leaving, setLeaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 420)
    return () => clearTimeout(t)
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const who = name.trim() || 'Guest'
    sound.setEnabled(soundOn)
    sound.chime()
    setLeaving(true)
    setTimeout(() => {
      signIn(who)
      pushToast({
        icon: 'star',
        title: `Welcome, ${who}`,
        body: 'Double-click anything. Nothing here can break.',
      })
    }, 560)
  }

  return (
    <div className="login" data-leaving={leaving}>
      <div className="login__bg">
        <Wallpaper still />
      </div>
      <div className="login__veil" />

      <div className="login__center">
        <div className="login__tile">
          <Avatar size={118} />
        </div>
        <p className="login__prompt">Who’s visiting?</p>
        <form className="login__form" onSubmit={submit}>
          <input
            ref={input}
            className="login__input"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type a name"
            aria-label="Your name for this session"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="login__go" type="submit" aria-label="Sign in">
            <Glyph.arrowRight />
          </button>
        </form>
        <p className="login__hint">
          Guest session. No password, nothing stored anywhere but this browser.
        </p>
      </div>

      <div className="login__bar">
        <span className="login__brand">
          <Mark />
          Anya OS
        </span>
        <div className="login__ease">
          <button
            onClick={() => setSound(!soundOn)}
            aria-label={soundOn ? 'Turn interface sounds off' : 'Turn interface sounds on'}
            aria-pressed={soundOn}
          >
            {soundOn ? <Glyph.sound /> : <Glyph.soundOff />}
          </button>
          <button aria-label="Ease of access" onClick={() => input.current?.focus()}>
            <Glyph.accessibility />
          </button>
        </div>
      </div>
    </div>
  )
}
