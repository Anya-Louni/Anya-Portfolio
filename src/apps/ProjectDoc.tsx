import { byslug } from '../content/projects'
import { Glyph, Icon } from '../ui/Icon'

export default function ProjectDoc({ params }: { params?: Record<string, unknown> }) {
  const project = byslug(String(params?.slug ?? ''))
  if (!project) return <div className="doc doc--missing">That folder is empty.</div>

  return (
    <article className="doc">
      <header className="doc__head" data-tint={project.tint}>
        <div className="doc__headInner">
          <p className="doc__kicker">{project.kicker}</p>
          <h1 className="doc__title">{project.name}</h1>
        </div>
      </header>

      <div className="doc__scroll">
        <p className="doc__blurb">{project.blurb}</p>

        <section className="doc__finding">
          <p>{project.finding}</p>
        </section>

        <section className="doc__results" aria-label="Key results">
          <table className="doc__table">
            <tbody>
              {project.results.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {project.note ? <p className="doc__note">{project.note}</p> : null}

        <ul className="doc__tags">
          {project.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <footer className="doc__foot">
        {project.demo ? (
          <a
            className="aero-btn aero-btn--primary"
            href={project.demo}
            target="_blank"
            rel="noreferrer"
          >
            {project.demoLabel ?? 'Live demo'} <Glyph.arrowRight />
          </a>
        ) : null}
        <a className="aero-btn" href={project.github} target="_blank" rel="noreferrer">
          <Icon name="github" className="doc__ghIcon" /> Source
        </a>
      </footer>
    </article>
  )
}
