import { CONTACT } from '../content/contact'
import { isRemote } from '../lib/notes'

/**
 * What this site keeps, what it sends, and what it is built from.
 * Facts only. Nothing here is a promise the code does not keep.
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
  ['YouTube', 'Only if you add a link to the iPod and play it. The player is theirs and can set cookies.', 'https://policies.google.com/privacy'],
  ['Internet Archive', 'Internet Explorer loads old web pages from them.', 'https://archive.org/about/terms.php'],
  ['DuckDuckGo', 'Searching in Internet Explorer sends the words you typed to them.', 'https://duckduckgo.com/privacy'],
  ['Open-Meteo', 'The weather panel asks for Algiers. It never asks where you are.', 'https://open-meteo.com/en/terms'],
  ['Wokwi', 'One project page shows a circuit simulation from them.', 'https://wokwi.com/legal/privacy'],
  ['Supabase', 'Stores the notes you send, the fish you draw, and the visit count. Nothing else.', 'https://supabase.com/privacy'],
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
        There is no sign up, no advertising and nothing is ever sold. Visits
        are counted, and that is the only thing measured here.
      </p>

      <h3>Kept on your own device</h3>
      <p>
        This is saved in your browser and nowhere else. It goes away when you
        clear your browsing data. It is never sent anywhere.
      </p>
      <dl className="legal__keys">
        {LOCAL.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h3>Sent away, and only if you send it</h3>
      <p>
        Two things leave your device, and only when you choose to send them.
        A note written in Notes, and a fish drawn for the aquarium.
        {isRemote ? '' : ' Neither is switched on right now, so nothing leaves at all.'}
      </p>
      <ul>
        <li>
          <b>Notes</b> go to Anya and nobody else. They cannot be read back from
          this site, not even by you, and there is no way to delete one here.
        </li>
        <li>
          <b>Fish</b> are public: the name you type and the small drawing you
          make. Once you let one go you cannot edit or remove it.
        </li>
      </ul>
      <p>Please do not put anything private in either one. Anya can see both.</p>

      <h3>Other companies</h3>
      <p>
        A few parts of this site load things from elsewhere. That only happens
        when you open the app that needs it.
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
        Anya keeps a count of how the site is doing. When you sign in it
        records that a visit happened, and when you leave it records how long
        you stayed and which apps you opened. That is the whole list.
      </p>
      <p>
        There is no name, no address, nothing you typed or drew, and no cookie
        or code that stays on your device. Nothing joins one visit to another,
        so coming back tomorrow looks like a different person. It is a tally,
        not a profile.
      </p>
      <p>
        If your browser sends Do Not Track or Global Privacy Control, you are
        not counted at all.
      </p>

      <h3>Cookies</h3>
      <p>
        This site sets none of its own. The videos and pages listed above may
        set theirs once you open them, under their own rules.
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
        To have a note or a fish removed, email <b>{CONTACT.email}</b> and say
        which one.
      </p>
    </div>
  )
}
