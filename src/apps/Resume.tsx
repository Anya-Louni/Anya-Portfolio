import { CONTACT } from '../content/contact'

/**
 * The CV, in a window.
 *
 * The PDF itself sits in public/ and is what the Download button hands over,
 * so the file a recruiter keeps is the real one rather than a screenshot of
 * this. The page below is the same content in HTML, because a PDF in an
 * iframe is unreadable on a phone and some browsers refuse to render one at
 * all. Edit both when the CV changes.
 */

const FILE = `${import.meta.env.BASE_URL}Anya-Louni-CV.pdf`

const EXPERIENCE = [
  {
    role: 'STEAM Mentor',
    where: 'World Learning Algeria',
    when: 'June 2026 to now',
    points: [
      'Certified STEAM Mentor delivering hands-on Python and machine learning workshops to student audiences.',
      'Applied structured, rules-based instructional design to make technical concepts approachable for beginners.',
      'Built and delivered supporting workshop material, including a Linux fundamentals session for a teacher training track.',
    ],
  },
  {
    role: 'Development Co-Manager',
    where: 'NIT Computer Society, Alger',
    when: 'Oct 2025 to Dec 2025',
    points: [
      'Designed and built internal dashboards to track participant registrations across club events and programs.',
      'Supported HR processes with lightweight custom tooling to replace manual tracking.',
      'Coordinated technical work across a small team, from initial scoping through delivery.',
    ],
  },
  {
    role: 'Design Co-Manager',
    where: 'NIT Computer Society, Alger',
    when: 'Oct 2024 to Sep 2025',
    points: [
      'Designed the club logo and a branded notebook and planner, applying consistent visual identity guidelines.',
      'Followed established design principles across typography, colour and layout to keep materials cohesive.',
      'Coordinated with the development team to align visual and technical deliverables on shared timelines.',
    ],
  },
  {
    role: 'International Peer Leader, OISS',
    where: 'Portland Community College, Oregon USA',
    when: 'Aug 2023 to Aug 2024',
    points: [
      'Created bilingual English and French digital resources reaching students from over 30 countries.',
      'Coordinated multi-stakeholder international programs at the OISS.',
      'Gained firsthand context on Pacific Northwest coastal tech communities.',
    ],
  },
]

const EDUCATION = [
  ['B.Sc. Embedded Systems & Artificial Intelligence', 'Numidia Institute of Technology, Alger', '2024 to 2027 expected'],
  ['A.S. Geographic Information Science & Cartography', 'Portland Community College, Oregon USA', 'Apr 2023 to Aug 2024'],
]

const PROGRAMS = [
  'GCI World 2026, Matsuo Lab, University of Tokyo. Accepted, starting September 2026',
  'Thirduni Mentorship & Career Development Program. Accepted, ongoing',
  'AI Forge, Boeing-sponsored program, World Learning',
  'Certified STEAM Mentor, World Learning',
  'Google Data Analytics, SQL, Data Analysis (2025)',
  'Scientific Computing in Python, freeCodeCamp (2025)',
  'Deep Learning, NVIDIA (2026)',
  'Intro to Cybersecurity, Cisco (2025)',
  'DALF C2 French, highest level, native-equivalent',
  'Career Essentials in Cybersecurity, Microsoft and LinkedIn (2025)',
  'TESOL Certified',
]

const SKILLS: [string, string][] = [
  ['Frontend', 'Next.js · React · TypeScript · Tailwind CSS'],
  ['Backend', 'Node.js · REST APIs · SQL and DBMS'],
  ['AI and data', 'Python · PyTorch · scikit-learn · Streamlit'],
  ['Tools', 'Git and GitHub · Linux · Cybersecurity basics'],
]

export default function Resume() {
  return (
    <div className="cv">
      <header className="cv__head">
        <div>
          <h1 className="cv__name">Louni Anya</h1>
          <p className="cv__title">
            AI and Web Developer · Fullstack Engineer · Applied Machine Learning Research
          </p>
          <p className="cv__meta">
            Alger, Algérie · <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> ·{' '}
            <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> ·{' '}
            <a href={CONTACT.github} target="_blank" rel="noreferrer">GitHub</a>
          </p>
        </div>
        <a className="aero-btn aero-btn--primary cv__get" href={FILE} download>
          Download the PDF
        </a>
      </header>

      <div className="cv__scroll">
        <section>
          <h2>Profile</h2>
          <p>
            Fullstack developer and applied ML and AI researcher with a dual background in
            Embedded Systems and AI (B.Sc.) and Geomatics and Spatial Data (A.S.). Builds
            end-to-end web applications with Next.js and React, and ships rigorously
            benchmarked ML research with public writeups and live demos rather than notebooks
            alone, spanning computer vision, sensor signal processing and workforce
            optimisation. Trilingual in English, French at DALF C2 and Arabic, with experience
            delivering technical projects in multicultural, cross-border environments.
          </p>
        </section>

        <section>
          <h2>Experience</h2>
          {EXPERIENCE.map((job) => (
            <article className="cv__job" key={job.role + job.when}>
              <h3>
                {job.role} <span>{job.where}</span>
              </h3>
              <p className="cv__when">{job.when}</p>
              <ul>
                {job.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section>
          <h2>Projects</h2>
          <p className="cv__hint">
            Full technical writeups, code and live demos are in the Projects folder on this
            desktop, and at <a href={CONTACT.github} target="_blank" rel="noreferrer">github.com/{CONTACT.handle}</a>.
          </p>
        </section>

        <section>
          <h2>Education</h2>
          {EDUCATION.map(([what, where, when]) => (
            <article className="cv__job" key={what}>
              <h3>
                {what} <span>{where}</span>
              </h3>
              <p className="cv__when">{when}</p>
            </article>
          ))}
        </section>

        <section>
          <h2>Programs and certifications</h2>
          <ul>
            {PROGRAMS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Technical skills</h2>
          <dl className="cv__skills">
            {SKILLS.map(([group, list]) => (
              <div key={group}>
                <dt>{group}</dt>
                <dd>{list}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Languages</h2>
          <p>English fluent · French DALF C2, bilingual · Arabic native</p>
        </section>
      </div>
    </div>
  )
}
