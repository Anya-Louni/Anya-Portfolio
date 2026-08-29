/**
 * The lyrics half of Karaoke: the big display, and the panel that edits it.
 *
 * The words are yours — typed or pasted here, timed by tapping along, kept in
 * this browser under the video's id and never sent to the songbook. What the
 * script switcher does is mechanical: kana, Hangul, Cyrillic and Greek all
 * romanize by rule, so that is a transformation of text you already have. A
 * translation is not mechanical, so there is no button that invents one —
 * there is a slot to paste your own, line for line, and switch to it.
 */
import { useEffect, useMemo, useState } from 'react'
import { romanize, romanizable, splitLines, type Line, type Sheet } from '../../lib/lyrics'

export const ORIGINAL = 'Original'
export const ROMANIZED = 'Romanized'

/** The text of every line in the chosen script. */
export function inScript(sheet: Sheet, script: string): string[] {
  if (script === ROMANIZED) return sheet.lines.map((l) => romanize(l.text))
  const version = sheet.versions[script]
  if (version) return sheet.lines.map((_, i) => version[i] ?? '')
  return sheet.lines.map((l) => l.text)
}

export function scriptsFor(sheet: Sheet): string[] {
  return [
    ORIGINAL,
    ...(romanizable(sheet.lines) ? [ROMANIZED] : []),
    ...Object.keys(sheet.versions),
  ]
}

/** Which line is being sung: the last one whose time has passed. */
export function lineAt(lines: Line[], time: number): number {
  let at = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].t >= 0 && lines[i].t <= time) at = i
    else if (lines[i].t > time) break
  }
  return at
}

/* ------------------------------------------------------------------ *
 * The display
 * ------------------------------------------------------------------ */

export function LyricsStage({
  sheet,
  script,
  time,
  big,
}: {
  sheet: Sheet
  script: string
  time: number
  big: boolean
}) {
  const text = useMemo(() => inScript(sheet, script), [sheet, script])
  const at = lineAt(sheet.lines, time)
  if (!sheet.lines.length) return null

  // the line before and the two after, so there is somewhere to look next
  const window = [at - 1, at, at + 1, at + 2].filter((i) => i >= 0 && i < text.length)

  return (
    <div className="lyr__stage" data-big={big}>
      {window.map((i) => (
        <p key={i} className="lyr__line" data-now={i === at} data-past={i < at}>
          {text[i] || '·'}
        </p>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * The editor
 * ------------------------------------------------------------------ */

export function LyricsPanel({
  sheet,
  onChange,
  script,
  onScript,
  time,
  seek,
}: {
  sheet: Sheet
  onChange: (s: Sheet) => void
  script: string
  onScript: (s: string) => void
  time: number
  seek: (t: number) => void
}) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [timing, setTiming] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [addingVersion, setAddingVersion] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [versionText, setVersionText] = useState('')

  const scripts = scriptsFor(sheet)
  const text = inScript(sheet, script)
  const at = lineAt(sheet.lines, time)

  /* Tapping is the whole timing interface: play the song, hit the key on the
     beat each line starts. Space is where a thumb already is. */
  useEffect(() => {
    if (!timing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      stamp()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const stamp = () => {
    if (cursor >= sheet.lines.length) { setTiming(false); return }
    const lines = sheet.lines.map((l, i) => (i === cursor ? { ...l, t: Math.max(0, time - 0.15) } : l))
    onChange({ ...sheet, lines })
    setCursor((n) => n + 1)
  }

  const saveWords = () => {
    const rows = splitLines(draft)
    // keep whatever times already line up, so editing does not lose the work
    const lines: Line[] = rows.map((textLine, i) => ({
      t: sheet.lines[i]?.text === textLine ? sheet.lines[i].t : -1,
      text: textLine,
    }))
    onChange({ ...sheet, lines })
    setEditing(false)
  }

  const saveVersion = () => {
    const name = versionName.trim().slice(0, 24)
    if (!name) return
    onChange({ ...sheet, versions: { ...sheet.versions, [name]: splitLines(versionText) } })
    setVersionName('')
    setVersionText('')
    setAddingVersion(false)
    onScript(name)
  }

  const dropVersion = (name: string) => {
    const versions = { ...sheet.versions }
    delete versions[name]
    onChange({ ...sheet, versions })
    if (script === name) onScript(ORIGINAL)
  }

  if (editing || !sheet.lines.length) {
    return (
      <div className="lyr__panel">
        <p className="lyr__hint">
          Paste the words, one line per line. They stay in this browser — the songbook only ever
          holds an artist, a song name and a link.
        </p>
        <textarea
          className="lyr__area"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={'One line\nper line'}
          rows={10}
        />
        <div className="lyr__row">
          <button className="lyr__go" onClick={saveWords} disabled={!draft.trim()}>
            Save the words
          </button>
          {sheet.lines.length ? (
            <button className="lyr__btn" onClick={() => setEditing(false)}>Cancel</button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="lyr__panel">
      <div className="lyr__scripts">
        {scripts.map((s) => (
          <button key={s} className="lyr__script" data-on={script === s} onClick={() => onScript(s)}>
            {s}
            {sheet.versions[s] ? (
              <i
                role="button"
                tabIndex={0}
                aria-label={`Remove ${s}`}
                onClick={(e) => { e.stopPropagation(); dropVersion(s) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); dropVersion(s) } }}
              >
                ×
              </i>
            ) : null}
          </button>
        ))}
        <button className="lyr__script lyr__script--add" onClick={() => setAddingVersion((a) => !a)}>
          + version
        </button>
      </div>

      {addingVersion ? (
        <div className="lyr__version">
          <input
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="English, say"
            maxLength={24}
          />
          <textarea
            value={versionText}
            onChange={(e) => setVersionText(e.target.value)}
            placeholder="The same lines, in the same order"
            rows={5}
          />
          <button className="lyr__go" onClick={saveVersion} disabled={!versionName.trim()}>
            Keep it
          </button>
        </div>
      ) : null}

      <div className="lyr__row">
        <button
          className="lyr__go"
          data-on={timing}
          onClick={() => { setTiming((t) => !t); setCursor(0) }}
        >
          {timing ? 'Stop timing' : 'Tap to time'}
        </button>
        <button className="lyr__btn" onClick={() => { setDraft(sheet.lines.map((l) => l.text).join('\n')); setEditing(true) }}>
          Edit words
        </button>
      </div>

      {timing ? (
        <button className="lyr__tap" onClick={stamp}>
          <b>Tap</b>
          <span>
            {cursor < sheet.lines.length
              ? `Line ${cursor + 1} of ${sheet.lines.length} — or press space`
              : 'All timed'}
          </span>
        </button>
      ) : null}

      <ol className="lyr__lines">
        {sheet.lines.map((l, i) => (
          <li key={i} data-now={i === at} data-next={timing && i === cursor}>
            <button
              className="lyr__seek"
              disabled={l.t < 0}
              onClick={() => seek(l.t)}
              title={l.t < 0 ? 'Not timed yet' : `Jump to ${l.t.toFixed(1)}s`}
            >
              {l.t < 0 ? '–:––' : `${Math.floor(l.t / 60)}:${String(Math.floor(l.t % 60)).padStart(2, '0')}`}
            </button>
            <span>{text[i] || l.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
