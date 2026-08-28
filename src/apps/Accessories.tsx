import { useEffect, useRef, useState } from 'react'
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

export function Calculator() {
  const [mode, setMode] = useState<Mode>('standard')
  const [display, setDisplay] = useState('0')
  const [acc, setAcc] = useState<number | null>(null)
  const [op, setOp] = useState<string | null>(null)
  const [fresh, setFresh] = useState(true)
  const [memory, setMemory] = useState(0)
  const [tape, setTape] = useState('')

  const value = parseFloat(display.replace(/,/g, '')) || 0
  const show = (n: number) => {
    if (!isFinite(n)) return 'Cannot divide by zero'
    const s = Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0) ? n.toExponential(9) : String(+n.toPrecision(14))
    return s
  }

  const digit = (d: string) => {
    sound.click(1.2)
    if (display === 'Cannot divide by zero') {
      setDisplay(d)
      setFresh(false)
      return
    }
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d)
      setFresh(false)
      return
    }
    if (d === '.' && display.includes('.')) return
    setDisplay(display.length > 16 ? display : display + d)
  }

  const apply = (a: number, b: number, o: string) => {
    switch (o) {
      case '+': return a + b
      case '−': return a - b
      case '×': return a * b
      case '÷': return b === 0 ? Infinity : a / b
      case 'xʸ': return Math.pow(a, b)
      default: return b
    }
  }

  const operate = (next: string) => {
    sound.click(0.95)
    const result = acc !== null && op ? apply(acc, value, op) : value
    setAcc(result)
    setDisplay(show(result))
    setOp(next)
    setFresh(true)
    setTape(`${show(result)} ${next}`)
  }

  const equals = () => {
    sound.click(0.8)
    if (acc === null || !op) return
    const result = apply(acc, value, op)
    setTape(`${show(acc)} ${op} ${show(value)} =`)
    setDisplay(show(result))
    setAcc(null)
    setOp(null)
    setFresh(true)
  }

  const unary = (fn: (n: number) => number, label: string) => {
    sound.click(1.3)
    const r = fn(value)
    setTape(`${label}(${show(value)})`)
    setDisplay(show(r))
    setFresh(true)
  }

  const clearAll = () => {
    setDisplay('0'); setAcc(null); setOp(null); setFresh(true); setTape('')
    sound.click(0.7)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9.]$/.test(e.key)) digit(e.key)
      else if (e.key === '+') operate('+')
      else if (e.key === '-') operate('−')
      else if (e.key === '*') operate('×')
      else if (e.key === '/') { e.preventDefault(); operate('÷') }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals() }
      else if (e.key === 'Escape') clearAll()
      else if (e.key === 'Backspace') setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : '0'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const Btn = ({ label, onClick, kind }: { label: string; onClick: () => void; kind?: string }) => (
    <button className="calc__key" data-kind={kind} onClick={onClick}>
      {label}
    </button>
  )

  return (
    <div className="calc">
      <div className="calc__modes">
        {(['standard', 'scientific'] as Mode[]).map((m) => (
          <button key={m} className="game__btn" data-on={mode === m} onClick={() => setMode(m)}>
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
        <span className="game__spacer" />
        <span className="calc__mem">{memory !== 0 ? 'M' : ''}</span>
      </div>

      <div className="calc__screen">
        <span className="calc__tape">{tape}</span>
        <span className="calc__display">{display}</span>
      </div>

      <div className="calc__memRow">
        <Btn label="MC" onClick={() => setMemory(0)} kind="mem" />
        <Btn label="MR" onClick={() => { setDisplay(show(memory)); setFresh(true) }} kind="mem" />
        <Btn label="M+" onClick={() => setMemory(memory + value)} kind="mem" />
        <Btn label="M−" onClick={() => setMemory(memory - value)} kind="mem" />
        <Btn label="MS" onClick={() => setMemory(value)} kind="mem" />
      </div>

      {mode === 'scientific' ? (
        <div className="calc__sci">
          <Btn label="sin" onClick={() => unary(Math.sin, 'sin')} />
          <Btn label="cos" onClick={() => unary(Math.cos, 'cos')} />
          <Btn label="tan" onClick={() => unary(Math.tan, 'tan')} />
          <Btn label="ln" onClick={() => unary(Math.log, 'ln')} />
          <Btn label="log" onClick={() => unary(Math.log10, 'log')} />
          <Btn label="n!" onClick={() => unary((n) => { let r = 1; for (let i = 2; i <= Math.min(170, Math.floor(n)); i++) r *= i; return r }, 'fact')} />
          <Btn label="xʸ" onClick={() => operate('xʸ')} />
          <Btn label="π" onClick={() => { setDisplay(show(Math.PI)); setFresh(true) }} />
          <Btn label="e" onClick={() => { setDisplay(show(Math.E)); setFresh(true) }} />
          <Btn label="1/x" onClick={() => unary((n) => 1 / n, '1/')} />
        </div>
      ) : null}

      <div className="calc__pad">
        <Btn label="%" onClick={() => unary((n) => n / 100, 'pct')} kind="fn" />
        <Btn label="√" onClick={() => unary(Math.sqrt, '√')} kind="fn" />
        <Btn label="CE" onClick={() => setDisplay('0')} kind="fn" />
        <Btn label="C" onClick={clearAll} kind="fn" />

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

        <Btn label="±" onClick={() => setDisplay(show(-value))} />
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
