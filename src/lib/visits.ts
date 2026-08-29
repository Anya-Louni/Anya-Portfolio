import { supabase, isRemote } from './notes'

/**
 * Visit statistics.
 *
 * What this records, in full: that a visit happened, how many seconds it
 * lasted, which apps were opened and how often, whether the device was a
 * phone or a desktop, and the site the visitor arrived from. That is the
 * whole list.
 *
 * What it does not record: no name, no typed text, no drawing, no account,
 * no cookie, no identifier that survives the tab closing, and nothing that
 * links one visit to another. Two visits from the same person are two
 * strangers as far as this table is concerned.
 *
 * The session id is made fresh on every visit and exists only to pair the
 * "arrived" row with the "left" row. It is not stored anywhere on the device.
 *
 * Visitors who have asked not to be counted, through Do Not Track or Global
 * Privacy Control, are not counted. The Privacy app says all of this in
 * plainer words, because a page that promises no measurement while measuring
 * would be a lie.
 */

/** Honour the browser's own opt out signals. */
function optedOut(): boolean {
  try {
    const nav = navigator as Navigator & {
      globalPrivacyControl?: boolean
      doNotTrack?: string
      msDoNotTrack?: string
    }
    const dnt = nav.doNotTrack ?? nav.msDoNotTrack ?? (window as { doNotTrack?: string }).doNotTrack
    return nav.globalPrivacyControl === true || dnt === '1' || dnt === 'yes'
  } catch {
    return false
  }
}

function deviceKind(): string {
  const w = window.innerWidth
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  if (touch && w <= 768) return 'phone'
  if (touch) return 'tablet'
  return 'desktop'
}

/** Only the site they came from, never the page or its query string. */
function cameFrom(): string | null {
  try {
    if (!document.referrer) return null
    const host = new URL(document.referrer).hostname
    if (!host || host === window.location.hostname) return null
    return host.slice(0, 120)
  } catch {
    return null
  }
}

let session: string | null = null
let opened = 0
let visibleSince = 0
let seconds = 0
const apps: Record<string, number> = {}
let closed = false

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Count only the time the tab was actually in front of someone. */
function accrue() {
  if (visibleSince) {
    seconds += Math.round((Date.now() - visibleSince) / 1000)
    visibleSince = 0
  }
}

/**
 * The last write has to survive the tab closing, which a normal request does
 * not. keepalive hands it to the browser to finish on its own.
 */
function sendEnd() {
  if (closed || !session || !url || !key) return
  closed = true
  accrue()
  const body = JSON.stringify({
    session,
    kind: 'end',
    seconds: Math.min(seconds, 86_399),
    apps,
    device: deviceKind(),
  })
  try {
    void fetch(`${url}/rest/v1/visits`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body,
    }).catch(() => {})
  } catch {
    /* a visit that cannot be counted is not worth an error */
  }
}

/** Called once, when someone signs in. */
export function startVisit() {
  if (session || !isRemote || optedOut()) return
  session = crypto.randomUUID()
  visibleSince = Date.now()

  const db = supabase()
  void db
    ?.from('visits')
    .insert({ session, kind: 'start', device: deviceKind(), referrer: cameFrom() })
    .then(() => undefined, () => undefined)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      accrue()
      /* A phone leaving the browser may never fire pagehide, so the visit is
         closed here as well. Whichever lands first wins; the other is a no
         operation. */
      if (seconds > 2) sendEnd()
    } else if (!closed) {
      visibleSince = Date.now()
    }
  })
  window.addEventListener('pagehide', sendEnd)
}

/** Called every time a window is opened, to see which apps get used. */
export function noteApp(appId: string) {
  if (!session) return
  opened += 1
  if (opened > 400) return // a stuck loop should not fill the row
  apps[appId] = (apps[appId] ?? 0) + 1
}
