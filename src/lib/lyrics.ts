/**
 * Lyrics for a song, and the scripts you can read them in.
 *
 * These are yours. You type or paste the words, you tap along to time them,
 * and they stay in this browser under the video's id — they are never sent to
 * the songbook and never shared. That is deliberate rather than lazy: the
 * songbook is public, and publishing lyrics is publishing someone else's
 * writing. Keeping your own copy of the words you are singing is a different
 * thing entirely, and it is the thing this does.
 *
 * The script switcher is mechanical, not a translation. Kana, Hangul, Cyrillic
 * and Greek all map to Latin letters by rule, so romanizing them is a
 * transformation of the text you already have and needs no service and no
 * network. Anything that needs a dictionary — Han characters especially — is
 * left alone rather than guessed at. If you want the words in another
 * language, you paste that yourself as a second version.
 */

export interface Line {
  /** seconds into the song, or -1 if it has not been timed yet */
  t: number
  text: string
}

export interface Sheet {
  lines: Line[]
  /** extra readings you have pasted, line for line: a translation, say */
  versions: Record<string, string[]>
}

const KEY = 'os.lyrics'

type Store = Record<string, Sheet>

function all(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store
  } catch {
    return {}
  }
}

export function loadSheet(videoId: string): Sheet {
  return all()[videoId] ?? { lines: [], versions: {} }
}

export function saveSheet(videoId: string, sheet: Sheet) {
  try {
    const store = all()
    store[videoId] = sheet
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* a full or blocked store just means the words do not persist */
  }
}

export const splitLines = (text: string) =>
  text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean)

/* ------------------------------------------------------------------ *
 * Romanization
 * ------------------------------------------------------------------ */

const KANA: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
}
const YOON: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo', びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
}

/** Katakana sit exactly 0x60 above their hiragana, so one table serves both. */
const toHiragana = (ch: string) => {
  const c = ch.charCodeAt(0)
  return c >= 0x30a1 && c <= 0x30f6 ? String.fromCharCode(c - 0x60) : ch
}

const HANGUL_INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const HANGUL_MEDIAL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
const HANGUL_FINAL = ['', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h']

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}
const GREEK: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
}

/**
 * Romanize what can be romanized by rule, and leave the rest alone.
 *
 * Han characters are deliberately untouched: reading them needs a dictionary
 * and context, and a guess would be worse than the original.
 */
export function romanize(text: string): string {
  let out = ''
  const chars = [...text]

  for (let i = 0; i < chars.length; i++) {
    const raw = chars[i]
    const ch = toHiragana(raw)
    const code = raw.codePointAt(0)!

    // Hangul syllables decompose arithmetically
    if (code >= 0xac00 && code <= 0xd7a3) {
      const n = code - 0xac00
      out +=
        HANGUL_INITIAL[Math.floor(n / 588)] +
        HANGUL_MEDIAL[Math.floor((n % 588) / 28)] +
        HANGUL_FINAL[n % 28]
      continue
    }

    // small tsu doubles the consonant that follows it
    if (ch === 'っ') {
      const next = toHiragana(chars[i + 1] ?? '')
      const sound = YOON[next + toHiragana(chars[i + 2] ?? '')] ?? KANA[next]
      if (sound) out += sound[0]
      continue
    }
    // the long mark repeats the vowel just written
    if (raw === 'ー') {
      out += out.slice(-1)
      continue
    }

    const pair = YOON[ch + toHiragana(chars[i + 1] ?? '')]
    if (pair) { out += pair; i++; continue }

    const lower = raw.toLowerCase()
    /* Accents come off before the lookup: Greek and Cyrillic carry them on
       ordinary letters, and a table with every accented form in it would be
       four times the size for no gain. */
    const bare = lower.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const mapped = KANA[ch] ?? CYRILLIC[lower] ?? CYRILLIC[bare] ?? GREEK[lower] ?? GREEK[bare]
    if (mapped === undefined) { out += raw; continue }
    // keep the shape of the original: a capital in, a capital out
    out += raw !== lower && mapped ? mapped[0].toUpperCase() + mapped.slice(1) : mapped
  }
  return out
}

/** Whether romanizing would actually change anything, so the tab can hide. */
export const romanizable = (lines: Line[]) =>
  lines.some((l) => romanize(l.text) !== l.text)
