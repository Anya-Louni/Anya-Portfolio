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

/** Removes one of the visitor's own tracks from their own browser. The
    built-in playlist ships in the bundle and is not in here at all, so this
    cannot touch it. */
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

/* ============================================================
   THE SHARED JUKEBOX
   ============================================================

   Everyone sees the same songs and anyone can add one. A shared track is a
   YouTube id, a title and an artist, which is small enough to hand around.

   Uploaded audio files stay local and always will. A shared library of files
   means hosting other people's audio, which is a copyright problem, a storage
   bill and a moderation queue. A link is a pointer to something YouTube is
   already serving.

   Insert and read only, like the fish. Nothing here can edit or remove a
   track, so a bad one comes out through the SQL editor. See README-NOTES.md.
   ============================================================ */

import { supabase, isRemote as remote } from './notes'

export interface SharedTrack {
  id: string
  title: string
  artist: string
  video_id: string
  created_at: string
}

export const jukeboxOn = remote

/** Everything anyone has ever added, newest first. */
export async function listShared(): Promise<SharedTrack[]> {
  const db = supabase()
  if (!db) return []
  const { data, error } = await db
    .from('songs')
    .select('id,title,artist,video_id,created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) return []
  /* An eleven-character id is the only shape YouTube uses. Anything else in
     the column is not a video and does not belong in a player. */
  return ((data ?? []) as SharedTrack[]).filter((t) => /^[A-Za-z0-9_-]{11}$/.test(t.video_id))
}

export async function addShared(
  videoId: string,
  artist: string,
  title: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = supabase()
  if (!db) return { ok: false, error: 'The jukebox is not switched on.' }
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return { ok: false, error: 'That is not a YouTube link.' }
  const t = clean(title, 60)
  const a = clean(artist, 40)
  if (!t) return { ok: false, error: 'Give the song a name.' }
  const { error } = await db.from('songs').insert({ title: t, artist: a || 'Unknown', video_id: videoId })
  if (error) return { ok: false, error: 'Could not add that. Try again in a moment.' }
  return { ok: true }
}
