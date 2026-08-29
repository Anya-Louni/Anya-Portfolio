/**
 * The Night Line.
 *
 * A deduction puzzle on a train. Seventeen stations, and at each one a clue
 * about the killer's name — its length, its letters, its vowels. The list of
 * suspects carries from stop to stop, shrinking, until exactly one name is
 * left at the terminus.
 *
 * The puzzle is generated rather than written, and generated backwards from
 * the answer: a killer is picked first, and only clues that are true of them
 * are ever considered — so the killer cannot be eliminated by their own case.
 * Each station then takes the gentlest clue that gets the list under a ceiling
 * walking evenly down to one at the terminus. A run that cannot reach exactly
 * one name is thrown away and started again, which is what makes every board
 * solvable and its answer unique: a board where two names survive is never
 * handed out, because it is never finished.
 *
 * You do the crossing off yourself. Depart with the wrong names struck and
 * the train will still carry you to the terminus; it is only at the
 * accusation that it tells you, and then it shows you the stop where your
 * list first parted company with the evidence.
 */
import { useCallback, useMemo, useState } from 'react'
import { prize } from '../../os/prize'
import { sound } from '../../os/sound'

const STATIONS = [
  'Halewood', 'Marrow Cross', 'Fen Ditton', 'Ockley Vale', 'Bramblewick',
  'Saltmarsh', 'Thorne Hollow', 'Ivy Bridge', 'Wray Cutting', 'Colder Gate',
  'Pellingham', 'Nettlebed', 'Quarry Halt', 'Ashen Reach', 'Dunmoor',
  'Whitlow Sands', 'Terminus',
]

const POOL = [
  'Ashcombe', 'Bell', 'Carrow', 'Deverel', 'Elmslie', 'Fairweather', 'Gant',
  'Halloway', 'Ingles', 'Jessop', 'Kettle', 'Larkspur', 'Mordaunt', 'Nettles',
  'Ollerenshaw', 'Pemberton', 'Quill', 'Ravenscroft', 'Sallow', 'Thirlwell',
  'Underhill', 'Vance', 'Whitlock', 'Yardley', 'Bramble', 'Corbin',
]

const VOWELS = 'aeiou'
const letters = (n: string) => n.toLowerCase()
const vowelCount = (n: string) => [...letters(n)].filter((c) => VOWELS.includes(c)).length
const hasDouble = (n: string) => /(.)\1/.test(letters(n))

interface Clue {
  text: string
  /** what kind of fact it is, so the line does not ask the same thing twice over */
  family: string
  holds: (name: string) => boolean
}

/**
 * Every clue the generator may use, all of them about the name alone.
 *
 * The set is deliberately enormous, and mostly negative. A tracing run showed
 * why: only thirty-odd clues were ever true of a given killer, and the ones
 * that removed a suspect or two were used up by the fifth station, after which
 * every remaining clue cut the list in half and the line could not be
 * finished. Negatives are what supply the fine distinctions — "contains no
 * letter Z" removes only the names with a Z in them, and "does not begin with
 * G" removes exactly the one name that does.
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

function allClues(): Clue[] {
  const out: Clue[] = []
  const L = (c: string) => c.toUpperCase()

  for (let n = 3; n <= 12; n++) {
    out.push({ text: `The name is ${n} letters long.`, family: 'length', holds: (x) => x.length === n })
    out.push({ text: `The name is not ${n} letters long.`, family: 'length', holds: (x) => x.length !== n })
  }
  for (const n of [6, 7, 8]) {
    out.push({ text: `The name is longer than ${n} letters.`, family: 'length', holds: (x) => x.length > n })
    out.push({ text: `The name is ${n} letters or shorter.`, family: 'length', holds: (x) => x.length <= n })
  }

  for (const c of ALPHABET) {
    out.push({ text: `The name contains the letter ${L(c)}.`, family: 'letter', holds: (x) => letters(x).includes(c) })
    out.push({ text: `There is no letter ${L(c)} in the name.`, family: 'letter', holds: (x) => !letters(x).includes(c) })
    out.push({ text: `The name begins with ${L(c)}.`, family: 'begins', holds: (x) => letters(x)[0] === c })
    out.push({ text: `The name does not begin with ${L(c)}.`, family: 'begins', holds: (x) => letters(x)[0] !== c })
    out.push({ text: `The name ends in ${L(c)}.`, family: 'ends', holds: (x) => letters(x).slice(-1) === c })
    out.push({ text: `The name does not end in ${L(c)}.`, family: 'ends', holds: (x) => letters(x).slice(-1) !== c })
    out.push({ text: `The second letter is not ${L(c)}.`, family: 'second', holds: (x) => letters(x)[1] !== c })
    out.push({ text: `The name contains no ${L(c)}${L(c)}.`, family: 'pair', holds: (x) => !letters(x).includes(c + c) })
  }

  for (let v = 0; v <= 5; v++) {
    out.push({ text: `The name has exactly ${v} vowel${v === 1 ? '' : 's'}.`, family: 'vowels', holds: (x) => vowelCount(x) === v })
    out.push({ text: `The name does not have ${v} vowel${v === 1 ? '' : 's'}.`, family: 'vowels', holds: (x) => vowelCount(x) !== v })
  }
  for (let d = 3; d <= 10; d++) {
    out.push({ text: `The name uses ${d} different letters.`, family: 'distinct', holds: (x) => new Set(letters(x)).size === d })
    out.push({ text: `The name does not use ${d} different letters.`, family: 'distinct', holds: (x) => new Set(letters(x)).size !== d })
  }

  out.push({ text: 'The name has more consonants than vowels.', family: 'shape', holds: (x) => x.length - vowelCount(x) > vowelCount(x) })
  out.push({ text: 'The name has a doubled letter.', family: 'shape', holds: hasDouble })
  out.push({ text: 'No letter in the name appears twice in a row.', family: 'shape', holds: (x) => !hasDouble(x) })
  out.push({ text: 'The name ends in a vowel.', family: 'shape', holds: (x) => VOWELS.includes(letters(x).slice(-1)) })
  out.push({ text: 'The name ends in a consonant.', family: 'shape', holds: (x) => !VOWELS.includes(letters(x).slice(-1)) })
  out.push({ text: 'The second letter of the name is a vowel.', family: 'shape', holds: (x) => VOWELS.includes(letters(x)[1]) })
  out.push({ text: 'The second letter of the name is a consonant.', family: 'shape', holds: (x) => !VOWELS.includes(letters(x)[1]) })
  out.push({ text: 'The name has two vowels in a row somewhere.', family: 'shape', holds: (x) => /[aeiou]{2}/.test(letters(x)) })
  out.push({ text: 'No two vowels stand together in the name.', family: 'shape', holds: (x) => !/[aeiou]{2}/.test(letters(x)) })
  out.push({ text: 'A letter appears more than once in the name.', family: 'shape', holds: (x) => new Set(letters(x)).size < x.length })
  out.push({ text: 'Every letter in the name is different.', family: 'shape', holds: (x) => new Set(letters(x)).size === x.length })

  for (const c of 'fjmqt') {
    out.push({ text: `The first letter comes before ${L(c)} in the alphabet.`, family: 'alpha', holds: (x) => letters(x)[0] < c })
    out.push({ text: `The first letter comes after ${L(c)} in the alphabet.`, family: 'alpha', holds: (x) => letters(x)[0] > c })
  }
  return out
}

const CLUES = allClues()

export interface Puzzle {
  suspects: string[]
  killer: string
  clues: string[]
  /** who is still standing after each station, worked out as it was built */
  survivors: string[][]
}

function shuffled<T>(list: T[], rng: () => number): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * One attempt at a line. Returns null if this killer and these draws cannot be
 * made to end on exactly one name.
 *
 * Getting this right took three goes. Asking each station only to remove
 * somebody never worked: nothing stopped the train reaching the terminus with
 * five suspects still standing. Steering toward an evenly falling count did
 * not work either, and for a more interesting reason — clues that cut a list
 * of twenty-four down by exactly two barely exist, so the first station would
 * take a clue that halved the list, and then every station after it had to
 * remove exactly one to fill seventeen stops, which is not possible.
 *
 * So it now takes the *smallest* cut it can at every station. Removing as few
 * names as possible keeps the most room for the stops still ahead, which is
 * the thing that was running out. The rule that makes it terminate is the
 * other one: after each station at least one name must remain for every
 * station left, and the last station has to land on exactly one.
 */
function attempt(rng: () => number): Puzzle | null {
  const suspects = shuffled(POOL, rng).slice(0, 24).sort()
  const killer = suspects[Math.floor(rng() * suspects.length)]
  const stops = STATIONS.length
  const start = suspects.length

  // only clues that are true of the killer can ever be used
  const usable = shuffled(CLUES.filter((c) => c.holds(killer)), rng)

  let live = suspects
  const clues: string[] = []
  const survivors: string[][] = []
  const used = new Set<string>()
  const recent: string[] = []

  for (let i = 0; i < stops; i++) {
    const left = stops - i - 1
    const last = left === 0

    /* The ceiling is what makes the line finish. It walks evenly from the
       full list down to one at the terminus, and a clue is only allowed if it
       gets the count under the ceiling for this station — so the list can
       never dawdle at twenty and then have nowhere to go. Under that
       ceiling, the gentlest cut wins, which keeps the puzzle a slow squeeze
       rather than two clues and a shrug. */
    const ceiling = last ? 1 : Math.round(start - ((start - 1) * (i + 1)) / stops)

    /* Among the clues that fit, one from a family we have not used lately
       beats one that fits slightly better. Without this the gentlest-cut rule
       produced lines that were four consecutive variations on "the name does
       not begin with", which is arithmetically fine and no fun at all. */
    let pick: Clue | null = null
    let pickAfter: string[] = []
    let pickStale = true
    for (const c of usable) {
      if (used.has(c.text)) continue
      const after = live.filter(c.holds)
      if (after.length === live.length) continue // tells us nothing new
      if (after.length > ceiling) continue
      if (last ? after.length !== 1 : after.length < left + 1) continue
      const stale = recent.includes(c.family)
      const better = !pick || (pickStale && !stale) || (pickStale === stale && after.length > pickAfter.length)
      if (better) { pick = c; pickAfter = after; pickStale = stale }
    }
    if (!pick) return null

    recent.push(pick.family)
    if (recent.length > 3) recent.shift()

    used.add(pick.text)
    live = pickAfter
    clues.push(pick.text)
    survivors.push(live)
  }

  return live.length === 1 && live[0] === killer ? { suspects, killer, clues, survivors } : null
}

export function generate(seed = Date.now()): Puzzle {
  let s = seed >>> 0
  const rng = () => {
    // mulberry32, so a seed reproduces a board exactly
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), 1 | t)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = 0; i < 400; i++) {
    const p = attempt(rng)
    if (p) return p
  }
  // 400 attempts without a board would mean the clue set had stopped being
  // able to separate the pool, which is worth knowing about rather than hiding
  throw new Error('could not generate a solvable line')
}

export default function NightLine() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const puzzle = useMemo(() => generate(seed), [seed])
  const [at, setAt] = useState(0)
  const [struck, setStruck] = useState<Set<string>>(() => new Set())
  const [verdict, setVerdict] = useState<{ right: boolean; named: string; slip: number | null } | null>(null)

  const atTerminus = at === STATIONS.length - 1
  const standing = puzzle.suspects.filter((n) => !struck.has(n))

  const strike = (name: string) => {
    if (verdict) return
    setStruck((s) => {
      const next = new Set(s)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
    sound.click(0.8)
  }

  const depart = () => {
    if (atTerminus || verdict) return
    setAt((n) => n + 1)
    sound.click(1.1)
  }

  const accuse = useCallback((name: string) => {
    const right = name === puzzle.killer
    /* Where the deduction went wrong: the first station whose surviving list
       is not what the player is carrying. More use than a bare "no". */
    let slip: number | null = null
    for (let i = 0; i <= at; i++) {
      const should = new Set(puzzle.survivors[i])
      const mine = puzzle.suspects.filter((n) => !struck.has(n))
      const wrong = mine.some((n) => !should.has(n)) || puzzle.survivors[i].some((n) => struck.has(n))
      if (wrong) { slip = i; break }
    }
    setVerdict({ right, named: name, slip })
    if (right) {
      sound.chime()
      prize(`nightline-${seed}`, 500, 'The Night Line, solved')
    } else {
      sound.puff()
    }
  }, [puzzle, struck, at, seed])

  const restart = () => {
    setSeed(Math.floor(Math.random() * 2 ** 31))
    setAt(0)
    setStruck(new Set())
    setVerdict(null)
    sound.click(1.1)
  }

  return (
    <div className="nl">
      <div className="nl__bar">
        <button className="nl__go" onClick={restart}>New line</button>
        <button
          className="nl__btn"
          onClick={() => { setStruck(new Set()); setVerdict(null) }}
          disabled={!struck.size}
        >
          Clear marks
        </button>
        <span className="nl__count">
          {standing.length} still standing · station {at + 1} of {STATIONS.length}
        </span>
      </div>

      <div className="nl__body">
        <div className="nl__left">
          <ol className="nl__line">
            {STATIONS.map((s, i) => (
              <li key={s} className="nl__stop" data-state={i < at ? 'past' : i === at ? 'here' : 'ahead'}>
                <i />
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="nl__middle">
          <section className="nl__clue">
            <header>
              <b>{STATIONS[at]}</b>
              <span>Clue {at + 1}</span>
            </header>
            <p>{puzzle.clues[at]}</p>
            {atTerminus ? (
              <p className="nl__final">
                End of the line. Name your killer.
              </p>
            ) : (
              <button className="nl__depart" onClick={depart}>
                Depart for {STATIONS[at + 1]} →
              </button>
            )}
          </section>

          <section className="nl__notebook">
            <h3>Notebook</h3>
            <ol>
              {puzzle.clues.slice(0, at + 1).map((c, i) => (
                <li key={i}>
                  <b>{STATIONS[i]}</b>
                  {c}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="nl__right">
          <h3>Passengers</h3>
          <ul className="nl__suspects">
            {puzzle.suspects.map((n) => (
              <li key={n}>
                <button
                  className="nl__suspect"
                  data-out={struck.has(n)}
                  data-named={verdict?.named === n}
                  onClick={() => (atTerminus && !verdict ? accuse(n) : strike(n))}
                  title={atTerminus && !verdict ? `Accuse ${n}` : struck.has(n) ? 'Bring back' : 'Cross off'}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {verdict ? (
        <div className="nl__verdict" data-right={verdict.right}>
          {verdict.right ? (
            <p>
              <b>{verdict.named}.</b> That is your killer — the only name the seventeen clues leave
              standing.
            </p>
          ) : (
            <p>
              <b>{verdict.named}</b> is not the one. It was <b>{puzzle.killer}</b>.
              {verdict.slip !== null
                ? ` Your list first parted company with the evidence at ${STATIONS[verdict.slip]}.`
                : ' Your marks were right; the accusation was not.'}
            </p>
          )}
          <button className="nl__go" onClick={restart}>Another line</button>
        </div>
      ) : null}
    </div>
  )
}
