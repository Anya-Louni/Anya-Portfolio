import { useState } from 'react'
import { CONTACT } from '../content/contact'
import { PROJECTS } from '../content/projects'
import { Avatar } from '../ui/Avatar'
import { Glyph, Icon } from '../ui/Icon'
import { launch } from '../os/registry'

export default function Contacts() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="ct">
      <aside className="ct__list">
        <p className="ct__listHead">Contacts</p>
        <button className="ct__row" data-on>
          <Avatar size={28} />
          <span>
            <strong>{CONTACT.name}</strong>
            <em>{CONTACT.handle}</em>
          </span>
        </button>
      </aside>

      <section className="ct__card">
        <header className="ct__head">
          <Avatar size={92} className="ct__avatar" />
          <div>
            <h1 className="ct__name">{CONTACT.name}</h1>
            <p className="ct__line">{CONTACT.line}</p>
          </div>
        </header>

        <dl className="ct__fields">
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              <button className="ct__copy" onClick={copy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </dd>
          </div>
          <div>
            <dt>GitHub</dt>
            <dd>
              <a href={CONTACT.github} target="_blank" rel="noreferrer">
                github.com/{CONTACT.handle}
              </a>
            </dd>
          </div>
          <div>
            <dt>Work</dt>
            <dd>
              {PROJECTS.length} projects ·{' '}
              <button className="ct__link" onClick={() => launch('finder')}>
                open the folder
              </button>
            </dd>
          </div>
        </dl>

        <div className="ct__actions">
          <a className="aero-btn aero-btn--primary" href={`mailto:${CONTACT.email}`}>
            <Glyph.arrowRight /> Send an email
          </a>
          <button className="aero-btn" onClick={() => launch('guestbook')}>
            <Icon name="guestbook" className="ct__btnIcon" /> Leave a note instead
          </button>
        </div>
      </section>
    </div>
  )
}
