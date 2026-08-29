import { isRemote, supabase } from './notes'

/**
 * The shared songbook.
 *
 * A row is an artist, a title, and a YouTube video id — never audio. That one
 * decision is what makes a public, anyone-can-add music library safe to run:
 * the recording stays on YouTube and is served by YouTube's own player under
 * YouTube's licences, and this site stores an eleven-character string. Hosting
 * the audio instead would make this a distributor of sound recordings, which
 * is a different thing entirely and not something a portfolio should be.
 *
 * The table grants anon `select` and `insert` and nothing else, like the fish,
 * so a song cannot be edited or deleted from the browser. See README-SONGS.md.
 */

export interface Song {
  id: string
  artist: string
  title: string
  video_id: string
  created_at: string
}

const LOCAL_KEY = 'os.songs.local'

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

export const thumbFor = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

function readLocal(): Song[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Song[]
  } catch {
    return []
  }
}

export async function listSongs(limit = 120): Promise<Song[]> {
  const db = supabase()
  if (!db) return readLocal().slice(-limit).reverse()
  const { data, error } = await db
    .from('songs')
    .select('id, artist, title, video_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as Song[]
}

export async function addSong(input: {
  artist: string
  title: string
  link: string
}): Promise<{ ok: true; song: Song } | { ok: false; error: string }> {
  const artist = input.artist.trim().slice(0, 60)
  const title = input.title.trim().slice(0, 90)
  const video_id = videoIdFrom(input.link)

  if (!artist) return { ok: false, error: 'Who is it by?' }
  if (!title) return { ok: false, error: 'What is it called?' }
  if (!video_id) return { ok: false, error: 'That does not look like a YouTube link.' }

  const db = supabase()
  if (db) {
    const { data, error } = await db
      .from('songs')
      .insert({ artist, title, video_id })
      .select('id, artist, title, video_id, created_at')
      .single()
    if (error) return { ok: false, error: 'Could not add that. Try again in a moment.' }
    return { ok: true, song: data as Song }
  }

  const song: Song = {
    id: crypto.randomUUID(),
    artist,
    title,
    video_id,
    created_at: new Date().toISOString(),
  }
  const all = readLocal()
  all.push(song)
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch {
    return { ok: false, error: 'This browser is blocking storage.' }
  }
  return { ok: true, song }
}

export { isRemote }
