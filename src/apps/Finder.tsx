import { coarse } from '../lib/touch'
import { useState } from 'react'
import { GITHUB_PROFILE, GITHUB_USER, PROJECTS, REPOS } from '../content/projects'
import { Glyph, Icon } from '../ui/Icon'
import { launch } from '../os/registry'

export default function Finder() {
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const q = query.toLowerCase()
  const projects = PROJECTS.filter(
    (p) => !q || (p.name + p.kicker + p.tags.join(' ')).toLowerCase().includes(q),
  )
  const repos = REPOS.filter((r) => !q || (r.name + r.desc + r.language).toLowerCase().includes(q))
  const current = PROJECTS.find((p) => p.slug === selected)

  const openProject = (slug: string) => launch('project', { slug })
  const openUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

  return (
    <div className="fin">
      <div className="fin__bar">
        <div className="fin__nav">
          <button className="fin__navBtn" aria-label="Back" disabled>
            <Glyph.chevronRight />
          </button>
          <button className="fin__navBtn" aria-label="Forward" disabled>
            <Glyph.chevronRight />
          </button>
        </div>
        <div className="fin__crumbs">
          <Icon name="folderProjects" className="fin__crumbIcon" />
          <span>{GITHUB_USER}</span>
          <Glyph.chevronRight className="fin__sep" />
          <strong>Projects</strong>
        </div>
        <label className="fin__search">
          <Glyph.search />
          <input
            className="fin__searchInput"
            placeholder="Search projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />
        </label>
      </div>

      <div className="fin__split">
        <nav className="fin__side" aria-label="Places">
          <p className="fin__sideHead">Libraries</p>
          <button className="fin__place" data-on>
            <Icon name="folderProjects" /> Projects
          </button>
          <button className="fin__place" onClick={() => launch('games')}>
            <Icon name="games" /> Games
          </button>
          <button className="fin__place" onClick={() => launch('aquarium')}>
            <Icon name="aquarium" /> Aquarium
          </button>

          <p className="fin__sideHead">Network</p>
          <button className="fin__place" onClick={() => openUrl(GITHUB_PROFILE)}>
            <Icon name="github" /> github.com/{GITHUB_USER}
          </button>

          <p className="fin__sideHead">Machine</p>
          <button className="fin__place" onClick={() => launch('computer')}>
            <Icon name="computer" /> Computer
          </button>
        </nav>

        <div
          className="fin__grid"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null)
          }}
        >
          {projects.length ? (
            <>
              <p className="fin__group">
                Featured <span>({projects.length})</span>
              </p>
              <div className="fin__items">
                {projects.map((p) => (
                  <button
                    key={p.slug}
                    className="fitem"
                    data-selected={selected === p.slug}
                    onClick={() => (coarse ? openProject(p.slug) : setSelected(p.slug))}
                    onDoubleClick={coarse ? undefined : () => openProject(p.slug)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openProject(p.slug)
                    }}
                  >
                    <span className="fitem__art" data-tint={p.tint}>
                      <Icon name={p.featured ? 'folderProjects' : 'folder'} />
                    </span>
                    <span className="fitem__name">{p.name}</span>
                    <span className="fitem__kicker">{p.kicker}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {repos.length ? (
            <>
              <p className="fin__group">
                Also on GitHub <span>({repos.length})</span>
              </p>
              <div className="fin__items">
                {repos.map((r) => (
                  <button
                    key={r.name}
                    className="fitem"
                    data-selected={selected === r.name}
                    onClick={() => (coarse ? openUrl(r.url) : setSelected(r.name))}
                    onDoubleClick={coarse ? undefined : () => openUrl(r.url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openUrl(r.url)
                    }}
                    title={r.desc}
                  >
                    <span className="fitem__art fitem__art--link">
                      <Icon name="github" />
                      <svg className="fitem__badge" viewBox="0 0 16 16" aria-hidden>
                        <rect x="0.5" y="0.5" width="15" height="15" rx="1.5" fill="#f6f8fc" stroke="#6b7d94" />
                        <path
                          d="M5 11 11 5M6.6 4.8H11.2V9.4"
                          fill="none"
                          stroke="#1d3a5c"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="fitem__name">{r.name}</span>
                    <span className="fitem__kicker">{r.language}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {!projects.length && !repos.length ? (
            <p className="fin__empty">
              Nothing here matches “{query}”. Clear the search to see everything.
            </p>
          ) : null}
        </div>
      </div>

      <footer className="fin__details">
        {current ? (
          <>
            <Icon name={current.featured ? 'folderProjects' : 'folder'} className="fin__detailIcon" />
            <div className="fin__detailText">
              <strong>{current.name}</strong>
              <span>{current.kicker}</span>
            </div>
            {current.demo ? (
              <button className="aero-btn" onClick={() => openUrl(current.demo!)}>
                Live demo
              </button>
            ) : null}
            <button className="aero-btn aero-btn--primary" onClick={() => openProject(current.slug)}>
              Open <Glyph.arrowRight />
            </button>
          </>
        ) : (
          <p className="fin__detailHint">
            {projects.length + repos.length} item
            {projects.length + repos.length === 1 ? '' : 's'} ·{' '}
            {coarse ? 'tap to open' : 'double-click to open'}
          </p>
        )}
      </footer>
    </div>
  )
}
