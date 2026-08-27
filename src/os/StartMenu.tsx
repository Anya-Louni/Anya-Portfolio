import { useState } from 'react'
import { useOS } from './store'
import { APPS, launch } from './registry'
import { Glyph, Icon } from '../ui/Icon'
import { GITHUB_PROFILE, GITHUB_USER, PROJECTS, REPOS } from '../content/projects'

export function StartMenu() {
  const userName = useOS((s) => s.userName)
  const signOut = useOS((s) => s.signOut)
  const [q, setQ] = useState('')

  const apps = APPS.filter((a) => a.id !== 'project')
  const hits = q
    ? [
        ...apps
          .filter((a) => (a.title + a.blurb).toLowerCase().includes(q.toLowerCase()))
          .map((a) => ({ kind: 'app' as const, id: a.id, name: a.title, desc: a.blurb, icon: a.icon })),
        ...PROJECTS.filter((p) => (p.name + p.kicker).toLowerCase().includes(q.toLowerCase())).map(
          (p) => ({ kind: 'project' as const, id: p.slug, name: p.name, desc: p.kicker, icon: 'folder' as const }),
        ),
        ...REPOS.filter((r) => (r.name + r.desc).toLowerCase().includes(q.toLowerCase())).map((r) => ({
          kind: 'repo' as const,
          id: r.url,
          name: r.name,
          desc: r.language,
          icon: 'github' as const,
        })),
      ]
    : apps.map((a) => ({ kind: 'app' as const, id: a.id, name: a.title, desc: a.blurb, icon: a.icon }))

  return (
    <div className="start" onPointerDown={(e) => e.stopPropagation()}>
      <div className="start__left">
        <div className="start__list">
          {hits.map((h) => (
            <button
              key={`${h.kind}-${h.id}`}
              className="start__item"
              onClick={() => {
                if (h.kind === 'app') launch(h.id)
                else if (h.kind === 'repo') window.open(h.id, '_blank', 'noopener,noreferrer')
                else launch('project', { slug: h.id })
              }}
            >
              <Icon name={h.icon} />
              <span>
                <span className="start__name">{h.name}</span>
                <br />
                <span className="start__desc">{h.desc}</span>
              </span>
            </button>
          ))}
          {hits.length === 0 ? (
            <p className="start__empty">No matches for “{q}”.</p>
          ) : null}
        </div>
      </div>

      <div className="start__right">
        <div className="start__user">
          <span className="start__avatar">
            <Icon name="user" />
          </span>
          <span className="start__username">{userName || 'Guest'}</span>
        </div>
        <button className="start__place" onClick={() => launch('finder')}>
          <Icon name="folderProjects" /> Projects
        </button>
        <button className="start__place" onClick={() => launch('computer')}>
          <Icon name="computer" /> Computer
        </button>
        <button className="start__place" onClick={() => launch('control')}>
          <Icon name="control" /> Control Panel
        </button>
        <button className="start__place" onClick={() => launch('aquarium')}>
          <Icon name="aquarium" /> Aquarium
        </button>
        <button
          className="start__place"
          onClick={() => window.open(GITHUB_PROFILE, '_blank', 'noopener,noreferrer')}
          title={GITHUB_PROFILE}
        >
          <Icon name="github" /> {GITHUB_USER}
        </button>
      </div>

      <div className="start__foot">
        <label className="start__search">
          <Glyph.search />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search programs and projects"
            aria-label="Search programs and projects"
          />
        </label>
        <button className="start__power" onClick={signOut}>
          <Glyph.power /> Sign out
        </button>
      </div>
    </div>
  )
}
