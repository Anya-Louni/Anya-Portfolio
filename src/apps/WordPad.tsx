import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * WordPad — the ribbon, the rich text, the save to .rtf-ish HTML.
 * execCommand is deprecated but it is still what every browser implements for
 * contenteditable formatting, and there is no replacement that works today.
 */

const FONTS = ['Hanken Grotesk Variable', 'Fredoka Variable', 'Georgia', 'Courier New', 'Tahoma']
const SIZES = [1, 2, 3, 4, 5, 6, 7]
const COLOURS = ['#000000', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#7f8c8d']

const SEED = `<h1 style="font-family:'Fredoka Variable'">Document</h1>
<p>This is WordPad. It does the things WordPad did: <b>bold</b>, <i>italic</i>,
<u>underline</u>, colours, sizes, alignment and lists.</p>
<ul><li>Type over this</li><li>Or clear it and start again</li></ul>`

export default function WordPad() {
  const ref = useRef<HTMLDivElement>(null)
  const [font, setFont] = useState(FONTS[0])
  const [size, setSize] = useState(3)
  const [stats, setStats] = useState({ words: 0, chars: 0 })

  const measure = useCallback(() => {
    const text = ref.current?.innerText ?? ''
    setStats({
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      chars: text.length,
    })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    try {
      el.innerHTML = localStorage.getItem('os.wordpad') || SEED
    } catch {
      el.innerHTML = SEED
    }
    measure()
  }, [measure])

  const save = useCallback(() => {
    try {
      localStorage.setItem('os.wordpad', ref.current?.innerHTML ?? '')
    } catch {
      /* nothing to do */
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(save, 3000)
    return () => window.clearInterval(id)
  }, [save])

  /* execCommand is the only thing that formats a contenteditable everywhere */
  const cmd = (name: string, value?: string) => {
    ref.current?.focus()
    document.execCommand(name, false, value)
    measure()
    save()
  }

  const download = () => {
    const html = `<!doctype html><meta charset="utf-8"><title>Document</title><body>${ref.current?.innerHTML ?? ''}</body>`
    const a = document.createElement('a')
    a.download = 'document.html'
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const Btn = ({ label, on, title }: { label: string; on: () => void; title?: string }) => (
    <button className="game__btn wp__btn" onClick={on} title={title}>
      {label}
    </button>
  )

  return (
    <div className="wp">
      <div className="wp__ribbon">
        <div className="wp__group">
          <span className="wp__groupLabel">Font</span>
          <div className="wp__row">
            <select
              className="wp__select"
              value={font}
              onChange={(e) => {
                setFont(e.target.value)
                cmd('fontName', e.target.value)
              }}
              aria-label="Font"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f.replace(' Variable', '')}
                </option>
              ))}
            </select>
            <select
              className="wp__select wp__select--size"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value))
                cmd('fontSize', e.target.value)
              }}
              aria-label="Size"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {[8, 10, 12, 14, 18, 24, 36][s - 1]}
                </option>
              ))}
            </select>
          </div>
          <div className="wp__row">
            <Btn label="B" on={() => cmd('bold')} title="Bold" />
            <Btn label="I" on={() => cmd('italic')} title="Italic" />
            <Btn label="U" on={() => cmd('underline')} title="Underline" />
            <Btn label="S" on={() => cmd('strikeThrough')} title="Strikethrough" />
            <div className="wp__colours">
              {COLOURS.map((c) => (
                <button
                  key={c}
                  className="wp__colour"
                  style={{ background: c }}
                  aria-label={c}
                  onClick={() => cmd('foreColor', c)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="wp__group">
          <span className="wp__groupLabel">Paragraph</span>
          <div className="wp__row">
            <Btn label="⯇" on={() => cmd('justifyLeft')} title="Align left" />
            <Btn label="≡" on={() => cmd('justifyCenter')} title="Centre" />
            <Btn label="⯈" on={() => cmd('justifyRight')} title="Align right" />
            <Btn label="•" on={() => cmd('insertUnorderedList')} title="Bullets" />
            <Btn label="1." on={() => cmd('insertOrderedList')} title="Numbering" />
          </div>
          <div className="wp__row">
            <Btn label="H1" on={() => cmd('formatBlock', 'h1')} />
            <Btn label="H2" on={() => cmd('formatBlock', 'h2')} />
            <Btn label="¶" on={() => cmd('formatBlock', 'p')} title="Paragraph" />
            <Btn label="❝" on={() => cmd('formatBlock', 'blockquote')} title="Quote" />
          </div>
        </div>

        <div className="wp__group wp__group--right">
          <span className="wp__groupLabel">File</span>
          <div className="wp__row">
            <Btn label="Undo" on={() => cmd('undo')} />
            <Btn label="Redo" on={() => cmd('redo')} />
            <Btn
              label="Clear"
              on={() => {
                if (ref.current) ref.current.innerHTML = '<p></p>'
                measure()
                save()
              }}
            />
            <Btn label="Save" on={download} />
          </div>
        </div>
      </div>

      <div className="wp__page">
        <div
          ref={ref}
          className="wp__doc"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          onInput={() => {
            measure()
          }}
          onBlur={save}
          aria-label="Document"
        />
      </div>

      <div className="wp__status">
        <span>{stats.words} words</span>
        <span>{stats.chars} characters</span>
        <span className="game__spacer" />
        <span>Saved in this browser</span>
      </div>
    </div>
  )
}
