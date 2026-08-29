/**
 * What is playing, wherever it is playing.
 *
 * Karaoke writes to this and the iPod reads it, which is how the iPod's screen
 * can show the flourish and the track name for a song whose player lives in
 * another window. It is a tiny store rather than shared React state because
 * the two apps are separate windows with no ancestor between them.
 *
 * Session only: it says nothing worth keeping once the desktop closes.
 */
import { useSyncExternalStore } from 'react'

export interface Track {
  artist: string
  title: string
  playing: boolean
}

let current: Track | null = null
/* A song the iPod has asked for but Karaoke has not picked up yet. It goes
   through here rather than through launch(): reopening a window that is
   already open focuses it without replacing its params, so an argument would
   only ever work the first time. */
let pending: { videoId: string; artist: string; title: string } | null = null
let version = 0
const listeners = new Set<() => void>()

const notify = () => {
  version++
  listeners.forEach((l) => l())
}

export const nowPlaying = {
  get: () => current,
  /** Ask Karaoke to play something, wherever it is. */
  request(song: { videoId: string; artist: string; title: string }) {
    pending = song
    notify()
  },
  /** Karaoke calls this and gets the request once. */
  take() {
    const r = pending
    pending = null
    return r
  },
  set(track: Track | null) {
    const same =
      current === track ||
      (!!current &&
        !!track &&
        current.artist === track.artist &&
        current.title === track.title &&
        current.playing === track.playing)
    if (same) return
    current = track
    notify()
  },
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useNowPlaying(): Track | null {
  useSyncExternalStore(subscribe, () => version, () => 0)
  return current
}

/** Re-renders whenever anything changes, so Karaoke can check for a request. */
export function usePlayVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0)
}
