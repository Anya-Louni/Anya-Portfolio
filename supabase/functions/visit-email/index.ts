/**
 * One email per sign in.
 *
 * Supabase calls this from a database webhook the moment a row lands in
 * public.visits. Rows of kind "end" are ignored, so a visit produces one
 * email and not two.
 *
 * It runs on Supabase, not in the browser, which is the only reason it can
 * hold an email API key at all. Nothing here reaches the visitor.
 *
 * Two guards, because the anon key is public and anyone holding it can insert
 * rows: the webhook has to present a shared secret, and if more than forty
 * sign ins land in an hour the emails stop and the daily summary covers it.
 * Without those, an afternoon of scripted inserts is an afternoon of email.
 *
 * Deploy:
 *   supabase functions deploy visit-email --no-verify-jwt
 *   supabase secrets set RESEND_API_KEY=... VISIT_EMAIL_TO=... VISIT_EMAIL_SECRET=...
 */

interface Row {
  session: string
  kind: 'start' | 'end'
  device: string | null
  referrer: string | null
  created_at: string
}

const KEY = Deno.env.get('RESEND_API_KEY')
const TO = Deno.env.get('VISIT_EMAIL_TO')
const FROM = Deno.env.get('VISIT_EMAIL_FROM') ?? 'OSnya <onboarding@resend.dev>'
const SECRET = Deno.env.get('VISIT_EMAIL_SECRET')

/* Supabase sets these for every function. */
const DB = Deno.env.get('SUPABASE_URL')
const DB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const PER_HOUR = 40

/** How many sign ins landed in the last hour, including this one. */
async function recentSignIns(): Promise<number> {
  if (!DB || !DB_KEY) return 0
  const since = new Date(Date.now() - 3_600_000).toISOString()
  const res = await fetch(
    `${DB}/rest/v1/visits?select=session&kind=eq.start&created_at=gte.${since}`,
    {
      headers: {
        apikey: DB_KEY,
        Authorization: `Bearer ${DB_KEY}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    },
  )
  const range = res.headers.get('content-range') ?? ''
  const total = Number(range.split('/')[1])
  return Number.isFinite(total) ? total : 0
}

Deno.serve(async (req: Request) => {
  if (!KEY || !TO) return new Response('not configured', { status: 200 })

  if (SECRET && req.headers.get('x-visit-secret') !== SECRET) {
    return new Response('no', { status: 401 })
  }

  let row: Row
  try {
    const body = (await req.json()) as { type?: string; record?: Row }
    if (body.type !== 'INSERT' || !body.record) return new Response('ignored', { status: 200 })
    row = body.record
  } catch {
    return new Response('bad request', { status: 400 })
  }

  if (row.kind !== 'start') return new Response('ignored', { status: 200 })

  if ((await recentSignIns()) > PER_HOUR) {
    return new Response('too many this hour, see the daily summary', { status: 200 })
  }

  const text = [
    'Someone opened OSnya.',
    '',
    `Time       ${new Date(row.created_at).toUTCString()}`,
    `Device     ${row.device ?? 'unknown'}`,
    `Came from  ${row.referrer ?? 'typed the address, or a link with no referrer'}`,
    '',
    'How long they stayed and what they opened arrive in the daily summary.',
    'No name, no address and nothing they typed is recorded.',
  ].join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject: `OSnya visit · ${row.device ?? 'unknown'}`,
      text,
    }),
  })

  /* A failed email must never fail the insert, so this always answers 200 and
     puts the reason in the body instead. */
  return new Response(res.ok ? 'sent' : `resend said ${res.status}`, { status: 200 })
})
