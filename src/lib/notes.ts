import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Visitor notes.
 *
 * Visitors can only INSERT. Reading is gated in the database by row-level
 * security and requires a signed-in owner account — not a password checked in
 * the browser, which would be no protection at all since anyone can read the
 * bundle. See README-NOTES.md for the SQL.
 *
 * With no Supabase credentials configured the app falls back to this browser's
 * localStorage so the flow still works end to end in development.
 */

export interface Note {
  id: string
  message: string
  colour: NoteColour
  from_name: string | null
  created_at: string
}

export type NoteColour = 'yellow' | 'blue' | 'green' | 'violet'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isRemote = Boolean(url && key)

let client: SupabaseClient | null = null
export function supabase(): SupabaseClient | null {
  if (!isRemote) return null
  if (!client) client = createClient(url!, key!)
  return client
}

const LOCAL_KEY = 'os.notes.local'

function readLocal(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Note[]
  } catch {
    return []
  }
}

/** Visitor-facing. Write only; nothing is ever read back here. */
export async function sendNote(input: {
  message: string
  colour: NoteColour
  from?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const message = input.message.trim().slice(0, 600)
  if (!message) return { ok: false, error: 'Write something first.' }
  const from_name = (input.from ?? '').trim().slice(0, 40) || null

  const db = supabase()
  if (db) {
    const { error } = await db.from('notes').insert({ message, colour: input.colour, from_name })
    if (error) return { ok: false, error: 'Could not send that. Try again in a moment.' }
    return { ok: true }
  }

  try {
    const all = readLocal()
    all.push({
      id: crypto.randomUUID(),
      message,
      colour: input.colour,
      from_name,
      created_at: new Date().toISOString(),
    })
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
    return { ok: true }
  } catch {
    return { ok: false, error: 'This browser is blocking storage.' }
  }
}

/* ---------------- owner side ---------------- */

export async function signIn(email: string, password: string) {
  const db = supabase()
  if (!db) return { ok: false as const, error: 'No backend configured on this build.' }
  const { error } = await db.auth.signInWithPassword({ email, password })
  return error ? { ok: false as const, error: error.message } : { ok: true as const }
}

export async function signOut() {
  await supabase()?.auth.signOut()
}

export async function currentUser() {
  const db = supabase()
  if (!db) return null
  const { data } = await db.auth.getUser()
  return data.user ?? null
}

export async function readNotes(): Promise<Note[]> {
  const db = supabase()
  if (!db) return readLocal().sort((a, b) => b.created_at.localeCompare(a.created_at))
  const { data, error } = await db
    .from('notes')
    .select('id, message, colour, from_name, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Note[]
}
