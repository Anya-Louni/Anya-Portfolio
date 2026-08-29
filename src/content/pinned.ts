import { GITHUB_PROFILE, REPOS } from './projects'

/**
 * The first repository pinned on the GitHub profile.
 *
 * GitHub only exposes pins through GraphQL, which needs a token, so the
 * lookup runs in a scheduled Action instead and commits the answer to
 * public/pinned.json. Change a pin on GitHub and the desktop catches up on
 * the next run without anyone editing this file.
 *
 * If the file is missing, unreadable, or nothing is pinned, the first entry
 * of the hand written list stands in. The gadget should always have something
 * to show.
 */

export interface Pinned {
  name: string
  description: string | null
  url: string
  stars: number
  forks: number
  pushedAt: string | null
  language: string | null
  topics: string[]
}

const FALLBACK: Pinned = {
  name: REPOS[0].name,
  description: REPOS[0].desc,
  url: REPOS[0].url,
  stars: 0,
  forks: 0,
  pushedAt: null,
  language: REPOS[0].language,
  topics: [],
}

export async function loadPinned(): Promise<{ repo: Pinned; live: boolean }> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}pinned.json`, { cache: 'no-cache' })
    if (!res.ok) return { repo: FALLBACK, live: false }
    /* A missing file on a single page host answers with index.html rather
       than a 404, so the content type is checked before parsing. */
    if (!(res.headers.get('content-type') ?? '').includes('json')) {
      return { repo: FALLBACK, live: false }
    }
    const data = (await res.json()) as Pinned | null
    if (!data || typeof data.name !== 'string' || typeof data.url !== 'string') {
      return { repo: FALLBACK, live: false }
    }
    return {
      repo: {
        ...data,
        url: data.url.startsWith('https://github.com/') ? data.url : GITHUB_PROFILE,
        topics: Array.isArray(data.topics) ? data.topics.slice(0, 4) : [],
      },
      live: true,
    }
  } catch {
    return { repo: FALLBACK, live: false }
  }
}

/** "3 days ago", roughly. */
export function since(iso: string | null): string {
  if (!iso) return ''
  const secs = (Date.now() - new Date(iso).getTime()) / 1000
  if (!Number.isFinite(secs) || secs < 0) return ''
  const steps: [number, string][] = [
    [31536000, 'year'], [2592000, 'month'], [604800, 'week'],
    [86400, 'day'], [3600, 'hour'], [60, 'minute'],
  ]
  for (const [size, name] of steps) {
    const n = Math.floor(secs / size)
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`
  }
  return 'just now'
}
