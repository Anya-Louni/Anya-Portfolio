/**
 * True on phones and tablets, where there is no mouse.
 *
 * Double-click is a mouse idea. On a touch screen the second tap is either
 * missed or read as a zoom, so anything that opens on double-click opens on
 * a single tap here instead. Read once: a device does not grow a mouse.
 */
export const coarse =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches
