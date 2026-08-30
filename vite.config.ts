import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Where the site lives. Used for the canonical link and the social card,
 * both of which need an absolute URL. Override with VITE_SITE_URL if the
 * domain changes; nothing else needs editing.
 */
const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://osnya.netlify.app/')
  .replace(/\/*$/, '/')

/**
 * What the page is allowed to load.
 *
 * Only applied to the built page. In development Vite serves modules and a
 * hot reload socket that a policy this tight would cut off, and a policy that
 * allowed them would not be the one that ships.
 *
 * frame-src is broad on purpose: Internet Explorer exists to load whatever
 * address you type, so it can only be limited to https rather than to a list.
 * It still refuses data: and javascript: frames, which is the part that
 * matters.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  // the YouTube iframe API is fetched as a script by the iPod
  "script-src 'self' https://www.youtube.com https://s.ytimg.com",
  // inline style attributes are used throughout for positions and sizes
  "style-src 'self' 'unsafe-inline'",
  // Vite inlines the smaller font subsets as data: URLs, so refusing data:
  // here blocks our own Cyrillic cut on every page load.
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://api.open-meteo.com https://*.supabase.co",
  'frame-src https:',
  'upgrade-insecure-requests',
].join('; ')

function head(): Plugin {
  return {
    name: 'anya-head',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const out = html.replaceAll('%SITE_URL%', SITE_URL)
        if (ctx.server) return out // dev: no policy, so hot reload survives
        return out.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        )
      },
    },
  }
}

/**
 * Where the site is served from. A user page or a custom domain is at the
 * root and needs nothing. A GitHub project page is served under the
 * repository name, and every absolute path in the build has to carry it, so
 * set VITE_BASE=/Anya-Portfolio/ before building for one.
 */
const BASE = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base: BASE,
  plugins: [react(), head()],
  server: { port: 5178, host: '127.0.0.1' },
  build: {
    // nothing here is worth handing out a map of
    sourcemap: false,
  },
})
