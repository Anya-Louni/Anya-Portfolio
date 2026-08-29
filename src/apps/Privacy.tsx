import { CONTACT } from '../content/contact'
import { isRemote } from '../lib/notes'

/**
 * What this site keeps, what it sends, and what it is built from.
 * Facts only. Nothing here is a promise the code does not keep.
 */

const LOCAL = [
  ['os.avatar', 'your sign-in picture'],
  ['os.theme, os.skin, os.wallpaper', 'appearance'],
  ['os.coins', 'coins won at the games'],
  ['os.tank', 'what the aquarium holds'],
  ['os.pet', 'which desktop pet'],
  ['os.sound, os.iconSize', 'preferences'],
  ['os.fish.released', 'that you already drew a fish'],
  ['IndexedDB os.ipod', 'audio files you added to the iPod'],
]

const THIRD_PARTY = [
  ['YouTube', 'Only when you add a link to the iPod and play it. The embed is theirs, and it can set cookies.', 'https://policies.google.com/privacy'],
  ['Internet Archive', 'Internet Explorer loads old pages from web.archive.org.', 'https://archive.org/about/terms.php'],
  ['DuckDuckGo', 'Searching in Internet Explorer opens a DuckDuckGo result.', 'https://duckduckgo.com/privacy'],
  ['Open-Meteo', 'The weather gadget asks for Algiers. Fixed coordinates, no location of yours.', 'https://open-meteo.com/en/terms'],
  ['Wokwi', 'One project page embeds a Wokwi simulation.', 'https://wokwi.com/legal/privacy'],
  ['Supabase', 'Holds the notes you send and the fish you draw. Nothing else.', 'https://supabase.com/privacy'],
]

const BUILT_WITH = [
  ['React, Zustand, three.js', 'MIT'],
  ['7.css, XP.css', 'MIT'],
  ['Supabase JS', 'MIT'],
  ['Hanken Grotesk, Fredoka, Azeret Mono', 'SIL Open Font License 1.1'],
]

export default function Privacy() {
  return (
    <div className="legal">
      <h2>Privacy</h2>
      <p className="legal__lede">
        No account, no tracking, no analytics. Nothing about you is measured or sold.
      </p>

      <h3>Kept in this browser</h3>
      <p>Cleared when you clear site data. Never uploaded.</p>
      <dl className="legal__keys">
        {LOCAL.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h3>Sent away, and only when you act</h3>
      <p>
        Two things leave this browser, both because you chose to send them.
        A note written in Leave a note, and a fish drawn for the aquarium.
        {isRemote ? '' : ' Neither is configured right now, so both stay local.'}
      </p>
      <ul>
        <li>
          <b>Notes</b> are write only. The database refuses to read them back to
          anyone but the owner. There is no delete from here.
        </li>
        <li>
          <b>Fish</b> are public: a name you type and a small drawing. Once released
          they cannot be edited or removed from the browser.
        </li>
      </ul>
      <p>Do not put anything private in either. Both are visible to the site owner.</p>

      <h3>Other people&apos;s servers</h3>
      <p>These are contacted only by the app that needs them.</p>
      <dl className="legal__keys">
        {THIRD_PARTY.map(([name, what, url]) => (
          <div key={name}>
            <dt>
              <a href={url} target="_blank" rel="noreferrer noopener">{name}</a>
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>

      <h3>Cookies</h3>
      <p>
        This site sets none. Embedded players and pages may set their own, under
        their own policies, once you open them.
      </p>

      <h3>Built with</h3>
      <dl className="legal__keys">
        {BUILT_WITH.map(([what, licence]) => (
          <div key={what}>
            <dt>{what}</dt>
            <dd>{licence}</dd>
          </div>
        ))}
      </dl>

      <h3>Artwork</h3>
      <p>
        App icons are Windows 7 icon artwork. Microsoft owns it and this is a
        personal, non commercial tribute. The wallpapers, the fish, the pets, the
        avatars and every other drawing here were made for this machine.
        Windows, Windows 7 and Windows XP are trademarks of Microsoft. This site
        is not affiliated with them.
      </p>

      <h3>Asking</h3>
      <p>
        To have a note or a fish removed, write to <b>{CONTACT.email}</b> and say
        which one.
      </p>
    </div>
  )
}
