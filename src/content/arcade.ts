/**
 * Games by other people, played inside this desktop.
 *
 * Everything on this list belongs to whoever made it. The card carries the
 * name, the studio and a link to their itch.io page, and the studio link is
 * in the window's title bar the whole time a game is open, so nobody can play
 * one of these and come away thinking it was Anya's.
 *
 * `frame` is the game itself. Leave it null and the card links out to itch.io
 * instead of playing here, which is the right default until the developer has
 * said yes: an embedded game skips their page, their download counts and
 * anything they are selling on it. Credit is not the same as permission.
 * Once they agree, put the URL in and it plays in the window.
 */

export interface ArcadeGame {
  id: string
  title: string
  studio: string
  blurb: string
  page: string
  cover: string
  /** The playable build. Null until the developer has agreed to the embed. */
  frame: string | null
}

export const ARCADE: ArcadeGame[] = [
  {
    id: 'twilight-observer',
    title: 'Twilight Observer',
    studio: 'WhiteScar Studios',
    blurb: 'An adventure game where choices matter',
    page: 'https://whitescarstudio.itch.io/to',
    cover: 'https://img.itch.zone/aW1nLzI4NTEwNDMwLmpwZw==/original/TgzCqo.jpg',
    frame: null,
  },
  {
    id: 'it-paints-me',
    title: 'It Paints Me',
    studio: 'ENDYSIS',
    blurb: 'An artist struggles to paint his final work',
    page: 'https://endysis.itch.io/it-paints-me',
    cover: 'https://img.itch.zone/aW1nLzE1NjQ1Mzg1LnBuZw==/original/8Rh%2BC4.png',
    frame: null,
  },
]

export const byArcadeId = (id: string) => ARCADE.find((g) => g.id === id)
