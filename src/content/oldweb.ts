/** Curated stops on the old internet, for Internet Explorer's Favorites bar. */
export interface Stop {
  title: string
  url: string
  year: number
  note: string
}

export const STOPS: Stop[] = [
  { title: 'Google', url: 'google.com', year: 1998, note: 'Before the logo settled down' },
  { title: 'Yahoo!', url: 'yahoo.com', year: 1996, note: 'A directory, not a search engine' },
  { title: 'Amazon', url: 'amazon.com', year: 1999, note: 'Still mostly books' },
  { title: 'Apple', url: 'apple.com', year: 1997, note: 'The year Jobs came back' },
  { title: 'YouTube', url: 'youtube.com', year: 2005, note: 'Four months old' },
  { title: 'Wikipedia', url: 'wikipedia.org', year: 2001, note: 'A few thousand articles in' },
  { title: 'Microsoft', url: 'microsoft.com', year: 1996, note: 'Peak under-construction' },
  { title: 'BBC', url: 'bbc.co.uk', year: 1998, note: 'Tables all the way down' },
  { title: 'IMDb', url: 'imdb.com', year: 1997, note: 'When it was still a hobby project' },
  { title: 'eBay', url: 'ebay.com', year: 1997, note: 'AuctionWeb, barely renamed' },
  { title: 'NASA', url: 'nasa.gov', year: 1996, note: 'Pathfinder era' },
  { title: 'Nintendo', url: 'nintendo.com', year: 1999, note: 'N64 in its prime' },
]

export const YEARS = [1996, 1998, 2000, 2002, 2004, 2006, 2008, 2010, 2013, 2016, 2020]

/**
 * Wayback resolves `/web/<year>/<url>` to the nearest snapshot itself, so no
 * API call and no CORS dance. Snapshots send no `frame-ancestors`, which is
 * why they can be embedded at all.
 *
 * The `if_` suffix asks for the archived page without the Wayback toolbar
 * bolted on top. That is a banner, a stylesheet and a good deal of script
 * that we do not want in the window and that is a fair share of why a
 * snapshot can take a while to appear.
 */
export function waybackUrl(url: string, year: number) {
  const clean = url.trim().replace(/^https?:\/\//i, '')
  return `https://web.archive.org/web/${year}0601000000if_/http://${clean}`
}

/**
 * Search.
 *
 * Not DuckDuckGo, and not Google or any of the others: every one of them
 * sends frame-ancestors or X-Frame-Options, so a search inside this window
 * was a blank white page and nothing else. Wiby indexes small, plain,
 * old-fashioned pages and lets itself be framed, which makes it both the
 * only one that works here and the right one for a browser like this.
 */
export function searchUrl(query: string) {
  return `https://wiby.me/?q=${encodeURIComponent(query.trim())}`
}

export function normalise(input: string) {
  const s = input.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return `https://${s}`
  return searchUrl(s)
}
