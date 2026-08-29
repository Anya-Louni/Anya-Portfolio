/**
 * Desktop sticky notes.
 *
 * Empty on purpose. The last set was placeholder text I wrote, and it read as
 * random because it was, fragments about projects with no context around them.
 * Add your own lines here and they appear on the desktop, draggable, in the
 * order given. Two or three short ones is the right amount; more than that and
 * the desktop stops looking like a desktop.
 *
 *   { id: 'n1', text: 'whatever you actually want on there', tint: 'yellow', x: 64, y: 18, rot: -2.5 }
 *
 * x and y are viewport percentages. rot is degrees of tilt.
 */
export interface Sticky {
  id: string
  text: string
  tint: 'yellow' | 'blue' | 'green' | 'violet'
  x: number
  y: number
  rot: number
}

export const STICKIES: Sticky[] = []
