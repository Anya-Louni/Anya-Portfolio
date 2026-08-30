import { useEffect, useMemo, useRef, useState } from 'react'
import { PROJECTS, REPOS, GITHUB_PROFILE } from '../content/projects'
import { CONTACT } from '../content/contact'
import { APPS, launch } from '../os/registry'
import { SPECIES } from '../aquarium/creatures'
import { coinText, getCoins } from '../os/purse'
import { catchUp, load as loadTank, ratePerSecond } from '../aquarium/economy'
import { useOS } from '../os/store'

/**
 * Terminal.
 *
 * A real little shell over a virtual filesystem built from the OS's own
 * contents, so `ls` and `cat` show the actual projects and `open` launches
 * actual windows. No assistant, no network, everything it prints is already
 * in the bundle.
 */

interface Node {
  type: 'dir' | 'file'
  children?: Record<string, Node>
  body?: () => string
}

const dir = (children: Record<string, Node>): Node => ({ type: 'dir', children })
const file = (body: () => string): Node => ({ type: 'file', body })

function makeFS(): Node {
  return dir({
  home: dir({
    anya: dir({
      'readme.txt': file(
        () =>
          [
            'OSnya 6.1',
            '',
            'A portfolio desktop. Every project here is a real repository.',
            'Every app and game was written for this machine.',
            'The aquarium earns while it is closed. Games pay the same purse.',
            '',
            'ls projects',
            'cat projects/galaxy-compass',
            'apps',
            'tank',
          ].join('\n'),
      ),
      projects: dir(
        Object.fromEntries(
          PROJECTS.map((p) => [
            p.slug,
            file(
              () =>
                `${p.name}\n${'='.repeat(p.name.length)}\n${p.kicker}\n\n${p.blurb}\n\n${p.finding}\n\n${p.results
                  .map((r) => `  ${r.label.padEnd(28)} ${r.value}`)
                  .join('\n')}\n\nsource: ${p.github}${p.demo ? `\ndemo:   ${p.demo}` : ''}`,
            ),
          ]),
        ),
      ),
      'tank.txt': file(() => {
        const t = loadTank()
        const stocked = SPECIES.reduce((n, sp) => n + (t.owned[sp.id] ?? 0), 0)
        return [
          'AQUARIUM',
          '========',
          `balance   ${coinText(getCoins())}`,
          `income    ${coinText(ratePerSecond(t.owned))}/s`,
          `stocked   ${stocked}`,
          '',
          'This tank is yours alone. It lives in this browser.',
          'The named fish are the half everyone shares.',
        ].join('\n')
      }),
      repos: dir(
        Object.fromEntries(
          REPOS.map((r) => [r.name, file(() => `${r.name}\n${r.desc}\n\n${r.language}\n${r.url}`)]),
        ),
      ),
      'contact.txt': file(
        () => `${CONTACT.name}\n${CONTACT.line}\n\nemail:  ${CONTACT.email}\ngithub: ${CONTACT.github}`,
      ),
    }),
  }),
    apps: dir(
      Object.fromEntries(
        APPS.filter((a) => a.id !== 'project').map((a) => [a.id, file(() => `${a.title}
${a.blurb}`)]),
      ),
    ),
  })
}

function resolve(FS: Node, path: string[], from: string[]): { node: Node | null; path: string[] } {
  let cur: string[] = path[0] === '' ? [] : [...from]
  for (const part of path) {
    if (part === '' || part === '.') continue
    if (part === '..') cur.pop()
    else cur.push(part)
  }
  let node: Node = FS
  for (const part of cur) {
    if (node.type !== 'dir' || !node.children?.[part]) return { node: null, path: cur }
    node = node.children[part]
  }
  return { node, path: cur }
}

const HOME = ['home', 'anya']

export default function Terminal() {
  const FS = useMemo(makeFS, [])
  const [cwd, setCwd] = useState<string[]>(HOME)
  const [lines, setLines] = useState<string[]>([
    'OSnya  [Version 6.1.7601]',
    'Type help for the list of commands.',
    '',
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [hAt, setHAt] = useState(-1)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const userName = useOS((s) => s.userName)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  const prompt = `${(userName || 'guest').toLowerCase()}@osnya:${
    cwd.join('/') === HOME.join('/') ? '~' : '/' + cwd.join('/')
  }$`

  const print = (...out: string[]) => setLines((l) => [...l, ...out])

  const listing = (node: Node) =>
    Object.entries(node.children ?? {})
      .map(([name, n]) => (n.type === 'dir' ? `${name}/` : name))
      .sort()

  const run = (raw: string) => {
    const line = raw.trim()
    print(`${prompt} ${raw}`)
    if (!line) return
    setHistory((h) => [line, ...h])
    setHAt(-1)

    const [cmd, ...args] = line.split(/\s+/)
    const arg = args.join(' ')

    switch (cmd) {
      case 'help':
        print(
          'ls [path]        list a folder',
          'cd <path>        change folder',
          'pwd              print current folder',
          'cat <file>       print a file',
          'tree             print the whole tree',
          'open <app>       open an app',
          'apps             list the apps',
          'tank             aquarium status',
          'coins            coin balance',
          'cv               the CV, and where to get it',
          'privacy          privacy summary',
          'license          licences and credits',
          'echo <text>      repeat the text',
          'whoami           current user',
          'date             current date and time',
          'uname            system name',
          'neofetch         system summary',
          'history          past commands',
          'clear            clear the screen',
          '',
        )
        break

      case 'ls': {
        const { node } = resolve(FS, (arg || '.').split('/'), cwd)
        if (!node) print(`ls: ${arg}: no such file or directory`, '')
        else if (node.type === 'file') print(arg, '')
        else print(listing(node).join('   '), '')
        break
      }

      case 'cd': {
        const { node, path } = resolve(FS, (arg || HOME.join('/')).split('/'), cwd)
        if (!node) print(`cd: ${arg}: no such file or directory`, '')
        else if (node.type !== 'dir') print(`cd: ${arg}: not a directory`, '')
        else setCwd(arg ? path : HOME)
        break
      }

      case 'pwd':
        print('/' + cwd.join('/'), '')
        break

      case 'cat': {
        if (!arg) {
          print('cat: give it a file', '')
          break
        }
        const { node } = resolve(FS, arg.split('/'), cwd)
        if (!node) print(`cat: ${arg}: no such file or directory`, '')
        else if (node.type === 'dir') print(`cat: ${arg}: is a directory`, '')
        else print(...(node.body?.() ?? '').split('\n'), '')
        break
      }

      case 'tree': {
        const walk = (n: Node, name: string, depth: number): string[] => {
          const pad = '  '.repeat(depth)
          if (n.type === 'file') return [`${pad}${name}`]
          return [
            `${pad}${name}/`,
            ...Object.entries(n.children ?? {}).flatMap(([k, v]) => walk(v, k, depth + 1)),
          ]
        }
        print(...walk(FS, '', 0).slice(1), '')
        break
      }

      case 'open': {
        const app = APPS.find((a) => a.id === arg || a.title.toLowerCase() === arg.toLowerCase())
        if (!app) print(`open: ${arg}: no such app. Try: apps`, '')
        else {
          launch(app.id)
          print(`opening ${app.title}…`, '')
        }
        break
      }

      case 'apps':
        print(
          ...APPS.filter((a) => a.id !== 'project').map((a) => `  ${a.id.padEnd(14)} ${a.blurb}`),
          '',
        )
        break

      case 'echo':
        print(arg, '')
        break

      case 'whoami':
        print(userName || 'guest', '')
        break

      case 'date':
        print(new Date().toString(), '')
        break

      case 'uname':
        print('OSnya 6.1 (aero) x86_64', '')
        break

      case 'neofetch':
        print(
          `  ▄▄▄▄▄▄▄   ${(userName || 'guest').toLowerCase()}@osnya`,
          `  █ █ █ █   ${'-'.repeat((userName || 'guest').length + 9)}`,
          `  █ █ █ █   OS       OSnya 6.1 (aero)`,
          `  █ █ █ █   Shell    a very small one`,
          `  ▀▀▀▀▀▀▀   Apps     ${APPS.length}`,
          `            Projects ${PROJECTS.length} featured, ${REPOS.length} more`,
          `            Source   ${GITHUB_PROFILE}`,
          '',
        )
        break

      case 'tank': {
        const t = loadTank()
        const stocked = SPECIES.reduce((n, sp) => n + (t.owned[sp.id] ?? 0), 0)
        const back = catchUp(t)
        print(
          `  balance   ${coinText(getCoins())} coins`,
          `  income    ${coinText(ratePerSecond(t.owned))}/s`,
          `  lifetime  ${coinText(t.earned)}`,
          `  stocked   ${stocked} creature${stocked === 1 ? '' : 's'}`,
          ...SPECIES.filter((sp) => t.owned[sp.id]).map(
            (sp) => `    ${sp.name.padEnd(11)} x${String(t.owned[sp.id]).padEnd(4)} ${coinText(sp.rate * t.owned[sp.id])}/s`,
          ),
          back.coins > 0 ? `  pending   ${coinText(back.coins)} earned while away` : '',
          '',
        )
        break
      }

      case 'coins':
        print(`  ${coinText(getCoins())} coins`, '')
        break

      case 'cv':
      case 'resume': {
        const file = `${import.meta.env.BASE_URL}Anya-Louni-CV.pdf`
        if (arg.includes('--download') || arg.includes('-d')) {
          const a = document.createElement('a')
          a.href = file
          a.download = 'Anya-Louni-CV.pdf'
          a.click()
          print('  saving Anya-Louni-CV.pdf', '')
          break
        }
        print(
          '  LOUNI ANYA',
          '  AI / Web Developer - Fullstack Engineer - Applied ML Research',
          '  Alger, Algerie',
          '',
          '  PROFILE',
          '  Fullstack developer and applied ML/AI researcher with a dual',
          '  background in Embedded Systems & AI (B.Sc.) and Geomatics /',
          '  Spatial Data (A.S.). Builds end-to-end web applications with',
          '  Next.js and React, and ships rigorously benchmarked ML research',
          '  with public writeups and live demos rather than notebooks alone,',
          '  spanning computer vision, sensor signal processing and workforce',
          '  optimization. Trilingual (English, French DALF C2, Arabic), with',
          '  experience delivering technical projects in multicultural,',
          '  cross-border environments.',
          '',
          '  EXPERIENCE',
          '',
          '  STEAM Mentor | World Learning Algeria | June 2026 - Present',
          '    Certified STEAM Mentor delivering hands-on Python and machine',
          '    learning workshops to student audiences.',
          '    Applied structured, rules-based instructional design to make',
          '    technical concepts approachable for beginner learners.',
          '    Built and delivered supporting workshop material, including a',
          '    Linux fundamentals session for a teacher training track.',
          '',
          '  Development Co-Manager | NIT Computer Society, Alger',
          '  Oct 2025 - Dec 2025',
          '    Designed and built internal dashboards to track participant',
          '    registrations across club events and programs.',
          '    Supported HR processes with lightweight custom tooling to',
          '    replace manual tracking.',
          '    Coordinated technical work across a small team, from initial',
          '    scoping through delivery.',
          '',
          '  Design Co-Manager | NIT Computer Society, Alger',
          '  Oct 2024 - Sep 2025',
          '    Designed the club logo and a branded notebook/planner, applying',
          '    consistent visual identity guidelines.',
          '    Followed established design principles (typography, color,',
          '    layout) to keep materials cohesive across formats.',
          '    Coordinated with the development team to align visual and',
          '    technical deliverables on shared timelines.',
          '',
          '  International Peer Leader, OISS | Portland Community College,',
          '  Oregon USA | Aug 2023 - Aug 2024',
          '    Created bilingual (EN/FR) digital resources and communications',
          '    reaching students from 30+ countries.',
          '    Coordinated multi-stakeholder international programs at OISS.',
          '    Gained firsthand context on Pacific Northwest coastal tech',
          '    communities.',
          '',
          '  PROJECTS',
          '',
          '  Tawzia, AI-Powered Workforce & HR Platform for Algeria',
          '  AI Forge Program, Boeing-sponsored via World Learning',
          '    Built an Algeria-specific workforce engine covering the full',
          '    employee lifecycle: hiring, scheduling, payroll, compliance and',
          '    retention, encoding the Hijri calendar and Algerian labor law',
          '    (SNMG, CNAS, IRG) directly into the system logic.',
          '    Combined scikit-learn demand forecasting with linear-programming',
          '    roster optimization (scipy.linprog) to generate staffing',
          '    schedules under real compliance constraints, plus attrition-risk',
          '    and CV-screening modules.',
          '    Added an aviation delay-cascade model projecting downstream',
          '    workforce impacts for Air Algerie / EGSA operations, and',
          '    validated the concept through direct outreach and discovery',
          '    calls with Algerian institutions.',
          '',
          '  Deep-Sea-OOD, Open-Set Recognition for Deep-Sea Gelatinous',
          '  Zooplankton',
          '  Independent ML research, full paper + live Streamlit demo + web app',
          '    Benchmarked four out-of-distribution detection methods (MSP,',
          '    Energy, Mahalanobis, ViM) on real ROV footage from FathomNet,',
          '    across 230 species under a 73.8x class imbalance, stratifying',
          '    novel species by taxonomic distance and stress-testing every',
          '    method against synthetic low-light, blur, scale-loss and',
          '    compression degradation.',
          '    Found that the best clean-data method (ViM, AUROC 0.677) is also',
          '    the least robust under degradation, while Mahalanobis distance,',
          '    the weaker clean-data performer, becomes the most reliable once',
          '    conditions degrade: a reversal with direct implications for',
          '    deploying OOD detection on real underwater cameras rather than',
          '    curated benchmarks.',
          '    Root-caused all 16 zero-F1 classes to specific, named failure',
          '    mechanisms (split artifacts, single-dive domain shift, thin',
          '    classes, taxonomic-label competition) rather than reporting them',
          '    as unexplained noise, and shipped the full analysis as a public',
          '    paper, dataset card and interactive demo.',
          '',
          '  Galaxy-Compass, Rotation-Equivariant CNNs for Galaxy Morphology',
          '  Independent ML research, self-supervised atlas + anomaly detector',
          '  + web demo',
          '    Built an E(2)-steerable convolutional network for Galaxy10',
          '    DECaLS morphology classification and ran a controlled,',
          '    matched-baseline comparison against a dense CNN with identical',
          '    channel widths, augmentation and compute, isolating the effect',
          '    of encoding rotational symmetry directly into the architecture.',
          '    Demonstrated a ~7x label-efficiency gain (statistically',
          '    confirmed: 15/15 paired comparisons favor the steerable model,',
          '    sign-test p = 6.1e-5) while using 11.8x fewer parameters, and',
          '    verified true equivariance to 1e-7 precision, versus a 2.6e-2',
          '    drift for the standard CNN.',
          '    Extended the encoder into a self-supervised SimCLR atlas over',
          '    all 17,736 galaxies and a two-signal anomaly ranker (VAE',
          '    reconstruction error + embedding-space isolation) that enriches',
          '    for mergers and complex spirals by up to 1.7x, shipped as a',
          '    public, GPU-free, laptop-reproducible repository with an',
          '    interactive results site.',
          '',
          '  EDUCATION',
          '  B.Sc. Embedded Systems & Artificial Intelligence',
          '    Numidia Institute of Technology, Alger | 2024 - 2027 (Expected)',
          '  A.S. Geographic Information Science & Cartography (GIS)',
          '    Portland Community College, Oregon USA | Apr 2023 - Aug 2024',
          '',
          '  PROGRAMS & CERTIFICATIONS',
          '    GCI World 2026 (Matsuo Lab, University of Tokyo): accepted,',
          '    starting September 2026',
          '    Thirduni Mentorship & Career Development Program: accepted',
          '    AI Forge, Boeing-sponsored program, World Learning',
          '    Certified STEAM Mentor, World Learning',
          '    Google Data Analytics, SQL, Data Analysis (2025)',
          '    Scientific Computing in Python, freeCodeCamp (2025)',
          '    Deep Learning, NVIDIA (2026)',
          '    Intro to Cybersecurity, Cisco (2025)',
          '    DALF C2 French, highest level, native-equivalent',
          '    Career Essentials in Cybersecurity, Microsoft x LinkedIn (2025)',
          '    TESOL Certified',
          '',
          '  TECHNICAL SKILLS',
          '    Frontend   Next.js, React, TypeScript, Tailwind CSS',
          '    Backend    Node.js, REST APIs, SQL / DBMS',
          '    AI / Data  Python, PyTorch, scikit-learn, Streamlit',
          '    Tools      Git / GitHub, Linux, Cybersecurity Basics',
          '',
          '  LANGUAGES',
          '    English (Fluent), French (DALF C2, bilingual), Arabic (Native)',
          '',
          `  ${CONTACT.email}`,
          `  ${CONTACT.linkedin}`,
          `  ${CONTACT.github}`,
          '',
          '  cv --download   to save the pdf',
          '',
        )
        break
      }

      case 'privacy':
        print(
          '  Settings coins tank and audio stay in this browser.',
          '  Notes and fish go to the database when you send them.',
          '  Visits are counted. How long. Which apps. That is all.',
          '  Embeds (YouTube archive.org Wiby Wokwi) set their own cookies.',
          '  open privacy   for the whole thing',
          '',
        )
        break

      case 'license':
        print(
          '  React, Zustand, three.js, 7.css, XP.css, Supabase JS   MIT',
          '  Hanken Grotesk, Fredoka, Azeret Mono                   OFL 1.1',
          '  App icons are Windows 7 artwork, owned by Microsoft.',
          '  Everything else was drawn for this machine.',
          '',
        )
        break

      case 'history':
        print(...[...history].reverse().map((h, i) => `  ${i + 1}  ${h}`), '')
        break

      case 'clear':
        setLines([])
        break

      case 'sudo':
        print('Everything here is already yours.', '')
        break

      case 'exit':
        print('There is no exit. Close the window.', '')
        break

      default:
        print(`${cmd}: command not found`, '')
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      run(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(history.length - 1, hAt + 1)
      if (history[next] !== undefined) {
        setHAt(next)
        setInput(history[next])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = hAt - 1
      setHAt(next)
      setInput(next >= 0 ? history[next] ?? '' : '')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const parts = input.split(/\s+/)
      const partial = parts[parts.length - 1] ?? ''
      const { node } = resolve(FS, ['.'], cwd)
      const pool =
        parts[0] === 'open'
          ? APPS.map((a) => a.id)
          : node?.type === 'dir'
            ? Object.keys(node.children ?? {})
            : []
      const hit = pool.filter((n) => n.startsWith(partial))
      if (hit.length === 1) {
        parts[parts.length - 1] = hit[0]
        setInput(parts.join(' '))
      } else if (hit.length > 1) {
        print(`${prompt} ${input}`, hit.join('   '), '')
      }
    }
  }

  return (
    <div className="term" onClick={() => inputRef.current?.focus()}>
      <div className="term__scroll">
        {lines.map((l, i) => (
          <pre className="term__line" key={i}>
            {l}
          </pre>
        ))}
        <div className="term__entry">
          <span className="term__prompt">{prompt}</span>
          <input
            ref={inputRef}
            className="term__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Terminal input"
            autoFocus
          />
        </div>
        <div ref={endRef} />
      </div>
    </div>
  )
}
