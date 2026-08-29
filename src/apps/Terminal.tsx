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
 * actual windows. No assistant, no network — everything it prints is already
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
            'Anya OS 6.1',
            '',
            'Portfolio desktop. Projects are real repositories.',
            'Apps and games written for this machine.',
            'Aquarium earns while closed. Games pay into the same purse.',
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
          'This one is yours: it lives in this browser and is not',
          'shared with anyone. The named fish are the shared half.',
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
        APPS.filter((a) => a.id !== 'project').map((a) => [a.id, file(() => `${a.title} — ${a.blurb}`)]),
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
    'Anya OS  [Version 6.1.7601]',
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

  const prompt = `${(userName || 'guest').toLowerCase()}@anya-os:${
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
          'ls [path]        list a directory',
          'cd <path>        change directory',
          'pwd              print the working directory',
          'cat <file>       print a file',
          'tree             show everything at once',
          'open <app>       launch an app window',
          'apps             list the apps you can open',
          'tank             what is in the aquarium',
          'coins            what is in the purse',
          'privacy          what is kept and what is sent',
          'license          what this is built from',
          'echo <text>      say it back',
          'whoami           who is signed in',
          'date             the time right now',
          'uname            what this machine claims to be',
          'neofetch         the obligatory system readout',
          'history          what you have typed',
          'clear            wipe the screen',
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
        print('Anya OS 6.1 (aero) x86_64', '')
        break

      case 'neofetch':
        print(
          `  ▄▄▄▄▄▄▄   ${(userName || 'guest').toLowerCase()}@anya-os`,
          `  █ █ █ █   ${'-'.repeat((userName || 'guest').length + 9)}`,
          `  █ █ █ █   OS       Anya OS 6.1 (aero)`,
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

      case 'privacy':
        print(
          '  No account, no tracking, no analytics.',
          '  Settings, coins, the tank and any audio you add stay in this browser.',
          '  Notes and fish go to the database, and only when you send them.',
          '  Embeds (YouTube, archive.org, DuckDuckGo, Wokwi) set their own cookies.',
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
        print('This machine has no root and nothing worth guarding.', '')
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
