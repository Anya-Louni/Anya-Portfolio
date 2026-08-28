import { useEffect, useReducer, useRef, useState } from 'react'
import { sound } from '../os/sound'

/* ============================================================
   NOTEPAD
   ============================================================ */
export function Notepad() {
  const [text, setText] = useState(() => localStorage.getItem('os.notepad') ?? '')
  const [wrap, setWrap] = useState(true)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem('os.notepad', text)
      } catch {
        /* nothing to do */
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [text])

  const save = () => {
    const a = document.createElement('a')
    a.download = 'untitled.txt'
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const lines = text ? text.split('\n').length : 1
  const chars = text.length

  return (
    <div className="np">
      <div className="np__menu">
        <button className="np__menuItem" onClick={save}>File</button>
        <button className="np__menuItem" onClick={() => setText('')}>Edit</button>
        <button className="np__menuItem" data-on={wrap} onClick={() => setWrap(!wrap)}>
          Format
        </button>
        <span className="game__spacer" />
        <button className="game__btn" onClick={save}>Save as .txt</button>
      </div>
      <textarea
        ref={ref}
        className="np__area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        wrap={wrap ? 'soft' : 'off'}
        placeholder=""
        aria-label="Notepad document"
      />
      <div className="np__status">
        <span>Ln {lines}</span>
        <span>{chars} characters</span>
        <span className="game__spacer" />
        <span>{wrap ? 'Word wrap on' : 'Word wrap off'}</span>
      </div>
    </div>
  )
}

/* ============================================================
   CALCULATOR
   ============================================================ */
type Mode = 'standard' | 'scientific'

/* Declared out here on purpose. A component defined inside another
   component is a new type on every render, so React unmounts and
   remounts the entire keypad each keypress — presses land on nodes
   that are about to be thrown away, and the thing feels dead. */
function Btn({ label, onClick, kind }: { label: string; onClick: () => void; kind?: string }) {
  return (
    <button className="calc__key" data-kind={kind} onClick={onClick}>
      {label}
    </button>
  )
}

/* Every press is one reducer action.
   With plain useState the handlers read `display` and `fresh` from the
   render they were created in, so two clicks landing before React
   re-renders both saw the old values — pressing 7 + 5 = gave 75. A
   reducer always sees the current state, however fast you press. */
interface CalcState {
  display: string
  acc: number | null
  op: string | null
  fresh: boolean
  memory: number
  tape: string
}

type CalcAction =
  | { t: 'digit'; d: string }
  | { t: 'op'; op: string }
  | { t: 'equals' }
  | { t: 'unary'; fn: (n: number) => number; label: string }
  | { t: 'set'; value: number }
  | { t: 'clear' }
  | { t: 'clearEntry' }
  | { t: 'back' }
  | { t: 'sign' }
  | { t: 'mem'; how: 'clear' | 'recall' | 'add' | 'sub' | 'store' }

const INITIAL: CalcState = { display: '0', acc: null, op: null, fresh: true, memory: 0, tape: '' }

const ERR = 'Cannot divide by zero'

function show(n: number) {
  if (!isFinite(n)) return ERR
  return Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0)
    ? n.toExponential(9)
    : String(+n.toPrecision(14))
}
const num = (s: string) => (s === ERR ? 0 : parseFloat(s) || 0)

function apply(a: number, b: number, o: string) {
  switch (o) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b === 0 ? Infinity : a / b
    case 'xʸ': return Math.pow(a, b)
    default: return b
  }
}

function reduce(s: CalcState, a: CalcAction): CalcState {
  const value = num(s.display)
  switch (a.t) {
    case 'digit': {
      if (s.display === ERR) return { ...s, display: a.d === '.' ? '0.' : a.d, fresh: false }
      if (s.fresh) return { ...s, display: a.d === '.' ? '0.' : a.d, fresh: false }
      if (a.d === '.' && s.display.includes('.')) return s
      if (s.display.length > 16) return s
      return { ...s, display: s.display === '0' && a.d !== '.' ? a.d : s.display + a.d }
    }
    case 'op': {
      const result = s.acc !== null && s.op && !s.fresh ? apply(s.acc, value, s.op) : value
      return { ...s, acc: result, display: show(result), op: a.op, fresh: true, tape: `${show(result)} ${a.op}` }
    }
    case 'equals': {
      if (s.acc === null || !s.op) return s
      const result = apply(s.acc, value, s.op)
      return {
        ...s,
        display: show(result),
        tape: `${show(s.acc)} ${s.op} ${show(value)} =`,
        acc: null,
        op: null,
        fresh: true,
      }
    }
    case 'unary':
      return { ...s, display: show(a.fn(value)), tape: `${a.label}(${show(value)})`, fresh: true }
    case 'set':
      return { ...s, display: show(a.value), fresh: true }
    case 'sign':
      return { ...s, display: show(-value) }
    case 'back':
      return { ...s, display: s.display.length > 1 ? s.display.slice(0, -1) : '0' }
    case 'clearEntry':
      return { ...s, display: '0', fresh: true }
    case 'clear':
      return { ...INITIAL, memory: s.memory }
    case 'mem':
      switch (a.how) {
        case 'clear': return { ...s, memory: 0 }
        case 'recall': return { ...s, display: show(s.memory), fresh: true }
        case 'add': return { ...s, memory: s.memory + value }
        case 'sub': return { ...s, memory: s.memory - value }
        case 'store': return { ...s, memory: value }
      }
  }
}

export function Calculator() {
  const [mode, setMode] = useState<Mode>('standard')
  const [st, send] = useReducer(reduce, INITIAL)

  const digit = (d: string) => { sound.click(1.2); send({ t: 'digit', d }) }
  const operate = (op: string) => { sound.click(0.95); send({ t: 'op', op }) }
  const equals = () => { sound.click(0.8); send({ t: 'equals' }) }
  const unary = (fn: (n: number) => number, label: string) => { sound.click(1.3); send({ t: 'unary', fn, label }) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (/^[0-9.]$/.test(e.key)) digit(e.key)
      else if (e.key === '+') operate('+')
      else if (e.key === '-') operate('−')
      else if (e.key === '*') operate('×')
      else if (e.key === '/') { e.preventDefault(); operate('÷') }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals() }
      else if (e.key === 'Escape') send({ t: 'clear' })
      else if (e.key === 'Backspace') send({ t: 'back' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="calc">
      <div className="calc__modes">
        {(['standard', 'scientific'] as Mode[]).map((m) => (
          <button key={m} className="game__btn" data-on={mode === m} onClick={() => setMode(m)}>
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
        <span className="game__spacer" />
        <span className="calc__mem">{st.memory !== 0 ? 'M' : ''}</span>
      </div>

      <div className="calc__screen">
        <span className="calc__tape">{st.tape}</span>
        <span className="calc__display">{st.display}</span>
      </div>

      <div className="calc__memRow">
        <Btn label="MC" onClick={() => send({ t: 'mem', how: 'clear' })} kind="mem" />
        <Btn label="MR" onClick={() => send({ t: 'mem', how: 'recall' })} kind="mem" />
        <Btn label="M+" onClick={() => send({ t: 'mem', how: 'add' })} kind="mem" />
        <Btn label="M−" onClick={() => send({ t: 'mem', how: 'sub' })} kind="mem" />
        <Btn label="MS" onClick={() => send({ t: 'mem', how: 'store' })} kind="mem" />
      </div>

      {mode === 'scientific' ? (
        <div className="calc__sci">
          <Btn label="sin" onClick={() => unary(Math.sin, 'sin')} />
          <Btn label="cos" onClick={() => unary(Math.cos, 'cos')} />
          <Btn label="tan" onClick={() => unary(Math.tan, 'tan')} />
          <Btn label="ln" onClick={() => unary(Math.log, 'ln')} />
          <Btn label="log" onClick={() => unary(Math.log10, 'log')} />
          <Btn
            label="n!"
            onClick={() =>
              unary((n) => {
                let r = 1
                for (let i = 2; i <= Math.min(170, Math.floor(n)); i++) r *= i
                return r
              }, 'fact')
            }
          />
          <Btn label="xʸ" onClick={() => operate('xʸ')} />
          <Btn label="π" onClick={() => send({ t: 'set', value: Math.PI })} />
          <Btn label="e" onClick={() => send({ t: 'set', value: Math.E })} />
          <Btn label="1/x" onClick={() => unary((n) => 1 / n, '1/')} />
        </div>
      ) : null}

      <div className="calc__pad">
        <Btn label="%" onClick={() => unary((n) => n / 100, 'pct')} kind="fn" />
        <Btn label="√" onClick={() => unary(Math.sqrt, '√')} kind="fn" />
        <Btn label="CE" onClick={() => send({ t: 'clearEntry' })} kind="fn" />
        <Btn label="C" onClick={() => { sound.click(0.7); send({ t: 'clear' }) }} kind="fn" />

        <Btn label="7" onClick={() => digit('7')} />
        <Btn label="8" onClick={() => digit('8')} />
        <Btn label="9" onClick={() => digit('9')} />
        <Btn label="÷" onClick={() => operate('÷')} kind="op" />

        <Btn label="4" onClick={() => digit('4')} />
        <Btn label="5" onClick={() => digit('5')} />
        <Btn label="6" onClick={() => digit('6')} />
        <Btn label="×" onClick={() => operate('×')} kind="op" />

        <Btn label="1" onClick={() => digit('1')} />
        <Btn label="2" onClick={() => digit('2')} />
        <Btn label="3" onClick={() => digit('3')} />
        <Btn label="−" onClick={() => operate('−')} kind="op" />

        <Btn label="±" onClick={() => send({ t: 'sign' })} />
        <Btn label="0" onClick={() => digit('0')} />
        <Btn label="." onClick={() => digit('.')} />
        <Btn label="+" onClick={() => operate('+')} kind="op" />

        <Btn label="=" onClick={equals} kind="eq" />
      </div>
    </div>
  )
}

/* ============================================================
   STICKY NOTES
   ============================================================ */
interface Note {
  id: string
  text: string
  tint: 'yellow' | 'blue' | 'green' | 'violet'
}

const TINTS: Note['tint'][] = ['yellow', 'blue', 'green', 'violet']

export function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = localStorage.getItem('os.stickies')
      if (raw) return JSON.parse(raw) as Note[]
    } catch {
      /* fall through */
    }
    return [{ id: crypto.randomUUID(), text: '', tint: 'yellow' }]
  })

  useEffect(() => {
    try {
      localStorage.setItem('os.stickies', JSON.stringify(notes))
    } catch {
      /* nothing to do */
    }
  }, [notes])

  const add = () => {
    sound.click(1.2)
    setNotes([...notes, { id: crypto.randomUUID(), text: '', tint: TINTS[notes.length % 4] }])
  }

  return (
    <div className="sn">
      <div className="sn__bar">
        <button className="game__btn" onClick={add}>New note</button>
        <span className="game__spacer" />
        <span className="game__stat">{notes.length} note{notes.length === 1 ? '' : 's'}</span>
      </div>
      <div className="sn__wall">
        {notes.map((n) => (
          <div className="sn__note" data-tint={n.tint} key={n.id}>
            <div className="sn__head">
              {TINTS.map((t) => (
                <button
                  key={t}
                  className="sn__tint"
                  data-tint={t}
                  data-on={n.tint === t}
                  aria-label={t}
                  onClick={() => setNotes(notes.map((x) => (x.id === n.id ? { ...x, tint: t } : x)))}
                />
              ))}
              <span className="game__spacer" />
              <button
                className="sn__del"
                aria-label="Delete note"
                onClick={() => {
                  sound.puff()
                  setNotes(notes.filter((x) => x.id !== n.id))
                }}
              >
                ×
              </button>
            </div>
            <textarea
              className="sn__text"
              value={n.text}
              placeholder="…"
              aria-label="Note"
              onChange={(e) =>
                setNotes(notes.map((x) => (x.id === n.id ? { ...x, text: e.target.value } : x)))
              }
            />
          </div>
        ))}
        {notes.length === 0 ? <p className="sn__empty">No notes. Add one.</p> : null}
      </div>
    </div>
  )
}
