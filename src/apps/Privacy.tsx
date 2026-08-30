import { CONTACT } from '../content/contact'
import { isRemote } from '../lib/notes'

/**
 * What this site keeps and what it sends.
 * Every line here matches what the code does.
 */

const LOCAL = [
  ['Your picture', 'the one you make in Change Picture'],
  ['How it looks', 'theme, colours and wallpaper'],
  ['Coins', 'what you have won at the games'],
  ['The aquarium', 'which creatures you have bought'],
  ['Your pet', 'which one is walking around'],
  ['Settings', 'sound on or off, icon size'],
  ['Your fish', 'that you have already drawn one'],
  ['Music', 'any audio files you added to the iPod'],
]

const THIRD_PARTY = [
  ['YouTube', 'Add a link to the iPod and play it. Their player sets their cookies.', 'https://policies.google.com/privacy'],
  ['Internet Archive', 'Internet Explorer loads old web pages from them.', 'https://archive.org/about/terms.php'],
  ['Wiby', 'Searching in Internet Explorer sends your words here.', 'https://wiby.me/about/'],
  ['Open-Meteo', 'The weather panel asks for Algiers. Your location stays yours.', 'https://open-meteo.com/en/terms'],
  ['Wokwi', 'One project page shows a circuit simulation from them.', 'https://wokwi.com/legal/privacy'],
  ['Supabase', 'Holds the notes you send. The fish you draw. The visit count.', 'https://supabase.com/privacy'],
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
        Short version: this site counts visits, keeps your settings on your own
        device, and sends nothing else anywhere unless you press a button that
        says it will.
      </p>

      <h3>Kept on your own device</h3>
      <p>
        Your browser holds all of this. Clear your browsing data and it is
        gone.
      </p>
      <dl className="legal__keys">
        {LOCAL.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h3>Sent when you send it</h3>
      <p>
        Two things leave your device. A note you write in Notes and a fish you
        draw for the aquarium. You choose to send both.
        {isRemote ? '' : ' Both are switched off right now and stay on this device.'}
      </p>
      <ul>
        <li>
          <b>Notes</b> go straight to Anya. The site keeps them out of reach
          for everyone else including you.
        </li>
        <li>
          <b>Fish</b> are public. Everyone sees the name you type and the
          drawing you make. A released fish stays as it is.
        </li>
      </ul>
      <p>Anya reads both. Keep private things out of them.</p>

      <h3>Other companies</h3>
      <p>
        A few apps load things from elsewhere. Opening the app is what starts
        it.
      </p>
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

      <h3>Counting visits</h3>
      <p>
        Signing in records a visit. Leaving records how long you stayed and
        which apps you opened. That is the whole list, and it is a tally rather
        than a profile: each visit lands as a fresh stranger and the record
        forgets you when the tab closes. Browsers sending Do Not Track or
        Global Privacy Control stay out of it.
      </p>

      <h3>Cookies</h3>
      <p>
        This site sets none. The videos and pages listed above set their own
        once you open them.
      </p>

      <h3>Made with</h3>
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
        Email <b>{CONTACT.email}</b> to have a note or a fish taken down. Say
        which one.
      </p>
    </div>
  )
}
