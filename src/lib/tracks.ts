/**
 * Visitor-uploaded audio, held in IndexedDB for this browser only. Never sent
 * anywhere, never shared between visitors, gone when they clear site data.
 */

export interface StoredTrack {
  id: string
  title: string
  artist: string
  blob: Blob
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
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result as StoredTrack[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function addTrack(file: File): Promise<StoredTrack | null> {
  try {
    const db = await open()
    const clean = file.name.replace(/\.[^.]+$/, '')
    const [a, t] = clean.includes(' - ') ? clean.split(' - ') : ['You', clean]
    const track: StoredTrack = {
      id: crypto.randomUUID(),
      title: (t || clean).trim().slice(0, 60),
      artist: (t ? a : 'You').trim().slice(0, 40),
      blob: file,
    }
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

export async function removeTrack(id: string) {
  try {
    const db = await open()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
  } catch {
    /* nothing to do */
  }
}
