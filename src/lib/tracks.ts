/**
 * The iPod's library, held in IndexedDB for this browser only.
 *
 * A track is either a file the visitor picked, which stays here and is never
 * sent anywhere, or a YouTube link, which stores an eleven-character id and
 * no audio at all. Both carry an artist and a song name typed by hand, because
 * a filename is a bad guess at either and a link is worse.
 */

export type TrackKind = 'file' | 'youtube'

export interface StoredTrack {
  id: string
  title: string
  artist: string
  kind: TrackKind
  /** for a file track */
  blob?: Blob
  /** for a YouTube track */
  videoId?: string
}

const DB = 'os.ipod'
const STORE = 'tracks'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listTracks(): Promise<StoredTrack[]> {
  try {
    const db = await open()
    const rows = await new Promise<StoredTrack[]>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result as StoredTrack[])
      req.onerror = () => reject(req.error)
    })
    // anything saved before links existed is a file, and says so now
    return rows.map((t) => ({ ...t, kind: t.kind ?? 'file' }))
  } catch {
    return []
  }
}

async function put(track: StoredTrack): Promise<StoredTrack | null> {
  try {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(track)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return track
  } catch {
    return null
  }
}

const clean = (s: string, max: number) => s.trim().slice(0, max)

export function addFile(file: File, artist: string, title: string) {
  return put({
    id: crypto.randomUUID(),
    title: clean(title, 60),
    artist: clean(artist, 40),
    kind: 'file',
    blob: file,
  })
}

export function addLink(videoId: string, artist: string, title: string) {
  return put({
    id: crypto.randomUUID(),
    title: clean(title, 60),
    artist: clean(artist, 40),
    kind: 'youtube',
    videoId,
  })
}

export async function removeTrack(id: string) {
  try {
    const db = await open()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
  } catch {
    /* nothing to do */
  }
}

/**
 * Pull the id out of whatever form of YouTube link was pasted.
 *
 * People paste watch links, share links, embed links, links with a playlist
 * and a timestamp hanging off them, and sometimes just the id. All of those
 * should work; anything else should be refused rather than half-accepted.
 */
export function videoIdFrom(input: string): string | null {
  const raw = input.trim()
  if (/^[\w-]{11}$/.test(raw)) return raw
  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.slice(1)
  else if (host.endsWith('youtube.com')) {
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else if (url.pathname.startsWith('/embed/')) id = url.pathname.slice(7)
    else if (url.pathname.startsWith('/shorts/')) id = url.pathname.slice(8)
    else if (url.pathname.startsWith('/live/')) id = url.pathname.slice(6)
  }
  id = (id ?? '').split(/[/?&#]/)[0]
  return /^[\w-]{11}$/.test(id) ? id : null
}

/* ------------------------------------------------------------------ *
 * The YouTube IFrame player
 * ------------------------------------------------------------------ */

export interface YtPlayer {
  loadVideoById(id: string): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
}

export interface YtApi {
  Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YtPlayer
  PlayerState: { UNSTARTED: number; ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number }
}

declare global {
  interface Window {
    YT?: YtApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let pending: Promise<YtApi> | null = null

/**
 * The API script is a single global that may only be injected once and calls
 * a single global back, so everyone who wants it shares one promise.
 */
export function youtubeApi(): Promise<YtApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (pending) return pending
  pending = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!)
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return pending
}
