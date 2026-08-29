/**
 * Yesterday's visits, in one email.
 *
 * Run by .github/workflows/visits.yml. Everything it needs comes from
 * environment variables; if any are missing it says so and exits without
 * failing the workflow, so a half configured repository is quiet rather than
 * red every morning.
 */

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY,
  VISIT_EMAIL_TO,
  VISIT_EMAIL_FROM = 'OSnya <onboarding@resend.dev>',
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !VISIT_EMAIL_TO) {
  console.log('Not configured yet. See README-NOTES.md, Visit statistics.')
  process.exit(0)
}

const DAY = 24 * 60 * 60 * 1000
const since = new Date(Date.now() - DAY).toISOString()
const week = new Date(Date.now() - 7 * DAY).toISOString()

async function read(from) {
  const url =
    `${SUPABASE_URL}/rest/v1/visits` +
    `?select=session,kind,seconds,apps,device,referrer,created_at` +
    `&created_at=gte.${from}&order=created_at.asc&limit=10000`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Supabase answered ${res.status}: ${await res.text()}`)
  return res.json()
}

/** Fold the start and end rows of each visit into one record. */
function sessions(rows) {
  const byId = new Map()
  for (const r of rows) {
    const s = byId.get(r.session) ?? { seconds: 0, apps: {}, device: null, referrer: null }
    if (r.kind === 'start') {
      s.device = r.device
      s.referrer = r.referrer
      s.started = r.created_at
    } else {
      s.seconds = Math.max(s.seconds, r.seconds ?? 0)
      for (const [k, n] of Object.entries(r.apps ?? {})) s.apps[k] = (s.apps[k] ?? 0) + n
      if (!s.device) s.device = r.device
    }
    byId.set(r.session, s)
  }
  return [...byId.values()]
}

const mins = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)

function tally(list, pick) {
  const out = {}
  for (const item of list) {
    const k = pick(item)
    if (k) out[k] = (out[k] ?? 0) + 1
  }
  return Object.entries(out).sort((a, b) => b[1] - a[1])
}

const day = sessions(await read(since))
const seven = sessions(await read(week))

const stayed = day.filter((s) => s.seconds > 0).map((s) => s.seconds)
const median = stayed.length
  ? mins(stayed.slice().sort((a, b) => a - b)[Math.floor(stayed.length / 2)])
  : 'nobody stayed long enough to say'

const appCounts = {}
for (const s of day) for (const [k, n] of Object.entries(s.apps)) appCounts[k] = (appCounts[k] ?? 0) + n
const topApps = Object.entries(appCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

const bounced = day.filter((s) => s.seconds > 0 && s.seconds < 10).length

const lines = [
  `OSnya, the last 24 hours.`,
  ``,
  `Visits              ${day.length}`,
  `Typical stay        ${median}`,
  `Left within 10s     ${bounced}`,
  `Visits this week    ${seven.length}`,
  ``,
  `Devices`,
  ...(tally(day, (s) => s.device).map(([k, n]) => `  ${k.padEnd(18)} ${n}`) || []),
  ``,
  `Apps opened`,
  ...(topApps.length
    ? topApps.map(([k, n]) => `  ${k.padEnd(18)} ${n}`)
    : ['  nothing was opened']),
  ``,
  `Arrived from`,
  ...(tally(day, (s) => s.referrer).length
    ? tally(day, (s) => s.referrer).map(([k, n]) => `  ${k.padEnd(18)} ${n}`)
    : ['  typed the address, or a link with no referrer']),
  ``,
  `No names, no addresses and nothing anyone typed. Counts only.`,
]

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: VISIT_EMAIL_FROM,
    to: [VISIT_EMAIL_TO],
    subject: `OSnya: ${day.length} visit${day.length === 1 ? '' : 's'} yesterday`,
    text: lines.join('\n'),
  }),
})

if (!res.ok) {
  console.error(`Resend answered ${res.status}: ${await res.text()}`)
  process.exit(1)
}
console.log(lines.join('\n'))
