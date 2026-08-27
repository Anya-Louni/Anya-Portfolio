import { isRemote, supabase } from './notes'

/**
 * The visitors' fish.
 *
 * One fish per visitor, and once released it cannot be changed — the table
 * grants anon `select` and `insert` only, so there is no edit path to abuse.
 * The per-visitor limit is held in this browser; clearing site data gets round
 * it, which is the honest limit of counting people without asking them to sign
 * in. Nothing else about a fish can be touched after it goes in.
 *
 * The tank is public on purpose, unlike the notes inbox.
 */

export interface Fish {
  id: string
  name: string
  image: string
  created_at: string
}

const LOCAL_KEY = 'os.fish.local'
const RELEASED_KEY = 'os.fish.released'

function readLocal(): Fish[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Fish[]
  } catch {
    return []
  }
}

/** What this browser has already put in the tank, if anything. */
export function releasedFish(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem(RELEASED_KEY)
    return raw ? (JSON.parse(raw) as { id: string; name: string }) : null
  } catch {
    return null
  }
}

function markReleased(id: string, name: string) {
  try {
    localStorage.setItem(RELEASED_KEY, JSON.stringify({ id, name }))
  } catch {
    /* storage blocked — the limit just cannot be remembered */
  }
}

export async function listFish(limit = 60): Promise<Fish[]> {
  const db = supabase()
  if (!db) return readLocal().slice(-limit)
  const { data, error } = await db
    .from('fish')
    .select('id, name, image, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as Fish[]
}

export async function saveFish(
  rawName: string,
  image: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const already = releasedFish()
  if (already) {
    return {
      ok: false,
      error: `You already released “${already.name}”. One fish per visitor, and fish cannot be repainted.`,
    }
  }

  const name = rawName.trim().slice(0, 24)
  if (!name) return { ok: false, error: 'Give your fish a name.' }
  if (image.length > 220_000) {
    return { ok: false, error: 'That drawing is too heavy — try fewer strokes.' }
  }

  const db = supabase()
  if (db) {
    const { data, error } = await db.from('fish').insert({ name, image }).select('id').single()
    if (error) return { ok: false, error: 'Could not add your fish. Try again in a moment.' }
    markReleased(data.id as string, name)
    return { ok: true }
  }

  const all = readLocal()
  const fish: Fish = {
    id: crypto.randomUUID(),
    name,
    image,
    created_at: new Date().toISOString(),
  }
  all.push(fish)
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch {
    return { ok: false, error: 'This browser is blocking storage.' }
  }
  markReleased(fish.id, name)
  return { ok: true }
}

export { isRemote }
