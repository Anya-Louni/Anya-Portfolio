/**
 * The iPod's built-in playlist.
 *
 * Empty until you add tracks — drop audio files in `public/music/` and list
 * them here, or host them anywhere and use the full URL. Visitors can always
 * add their own from the iPod itself; those stay in their browser and are
 * never uploaded.
 *
 *   { title: 'Song', artist: 'Someone', src: '/music/song.mp3' }
 */
export interface PlaylistTrack {
  title: string
  artist: string
  src: string
}

export const PLAYLIST: PlaylistTrack[] = []
