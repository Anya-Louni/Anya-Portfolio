/**
 * The YouTube IFrame player, wrapped just enough to be used twice.
 *
 * Both the iPod and Karaoke embed a player, and they are independent: each
 * owns its own, so playing something on one does not reach into the other.
 * What they share is this loader, because the API script is a single global
 * that may only be injected once and calls a single global back.
 *
 * The player is always visible and never smaller than 200 by 200, which is
 * what YouTube's terms require of an embed. Nothing here touches the audio —
 * it cannot, the frame is cross-origin — so there is no path by which this
 * app could separate a recording from its video.
 */

export interface YtPlayer {
  loadVideoById(id: string): void
  cueVideoById(id: string): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
  getPlayerState(): number
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setVolume(v: number): void
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

export function youtubeApi(): Promise<YtApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (pending) return pending
  pending = new Promise((resolve) => {
    /* YouTube calls this once, globally, whoever asked first. Every later
       caller gets the same promise rather than a second script tag. */
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!)
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return pending
}

/** The video ids of anything currently embedded, for the "no vocals" hint. */
export const KARAOKE_HINT = 'Search YouTube for the song plus “karaoke” — those have the vocals taken out already.'
