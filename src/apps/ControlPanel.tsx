import { useState } from 'react'
import { useOS, type SkinName, type ThemeName } from '../os/store'
import { sound } from '../os/sound'
import { Glyph } from '../ui/Icon'
import { WALLPAPERS } from '../art/Wallpaper'
import AvatarMaker from './AvatarMaker'

type Section = 'appearance' | 'account' | 'sound' | 'motion'

interface ThemeOption {
  id: string
  name: string
  note: string
  skin: SkinName
  theme: ThemeName
  swatch: string[]
}

const THEMES: ThemeOption[] = [
  {
    id: 'aero',
    name: 'Aero',
    note: 'Windows 7 glass over a bright sky.',
    skin: 'seven',
    theme: 'aero',
    swatch: ['#0a4bc4', '#2b80e6', '#67e4ef', '#3fcb85'],
  },
  {
    id: 'night',
    name: 'Deep Field',
    note: 'The same desktop, after dark.',
    skin: 'seven',
    theme: 'night',
    swatch: ['#050b2e', '#12246e', '#2b46b4', '#4fc6e0'],
  },
  {
    id: 'luna',
    name: 'Windows XP',
    note: 'Luna blue, green Start button, Bliss outside.',
    skin: 'luna',
    theme: 'aero',
    swatch: ['#0831d9', '#0050ee', '#7cb342', '#ece9d8'],
  },
]

export default function ControlPanel() {
  const [section, setSection] = useState<Section>('appearance')
  const theme = useOS((s) => s.theme)
  const skin = useOS((s) => s.skin)
  const setTheme = useOS((s) => s.setTheme)
  const setSkin = useOS((s) => s.setSkin)
  const wallpaper = useOS((s) => s.wallpaper)
  const setWallpaper = useOS((s) => s.setWallpaper)
  const soundOn = useOS((s) => s.soundOn)
  const setSound = useOS((s) => s.setSound)
  const [calm, setCalm] = useState(() => document.documentElement.dataset.calm === 'true')

  const activeId = skin === 'luna' ? 'luna' : theme === 'night' ? 'night' : 'aero'

  const apply = (t: ThemeOption) => {
    setSkin(t.skin)
    setTheme(t.theme)
    sound.click(0.9)
  }

  const toggleCalm = (v: boolean) => {
    setCalm(v)
    document.documentElement.dataset.calm = String(v)
  }

  return (
    <div className="cpl">
      <div className="cpl__crumbs">
        <Glyph.grid className="cpl__crumbIcon" />
        <span>Control Panel</span>
        <Glyph.chevronRight className="cpl__sep" />
        <strong>
          {section === 'appearance'
            ? 'Personalization'
            : section === 'account'
              ? 'User Accounts'
              : section === 'sound'
                ? 'Sound'
                : 'Ease of Access'}
        </strong>
      </div>

      <div className="cpl__split">
        <nav className="cpl__nav" aria-label="Control Panel sections">
          <p className="cpl__navHead">Adjust your computer’s settings</p>
          {(
            [
              ['appearance', 'Personalization', 'Theme, colour and desktop'],
              ['account', 'User Accounts', 'Your name and your picture'],
              ['sound', 'Sound', 'Chime and interface clicks'],
              ['motion', 'Ease of Access', 'Animation and drift'],
            ] as const
          ).map(([id, label, desc]) => (
            <button
              key={id}
              className="cpl__navItem"
              data-on={section === id}
              onClick={() => setSection(id)}
            >
              <span className="cpl__navLabel">{label}</span>
              <span className="cpl__navDesc">{desc}</span>
            </button>
          ))}
        </nav>

        <div className="cpl__pane">
          {section === 'appearance' ? (
            <>
              <h2 className="cpl__h">Change the visuals and sounds on your computer</h2>
              <p className="cpl__p">
                Click a theme. It changes the desktop the window colour and the taskbar at once.
                Windows XP is here because this all came from there.
              </p>
              <div className="cpl__themes">
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    className="themecard"
                    data-on={activeId === th.id}
                    onClick={() => apply(th)}
                    aria-pressed={activeId === th.id}
                  >
                    <span className="themecard__preview" data-theme-preview={th.id}>
                      <span className="themecard__sky" />
                      <span className="themecard__glass" />
                      <span className="themecard__bar" />
                    </span>
                    <span className="themecard__meta">
                      <span className="themecard__name">{th.name}</span>
                      <span className="themecard__note">{th.note}</span>
                      <span className="themecard__swatches">
                        {th.swatch.map((c) => (
                          <i key={c} style={{ background: c }} />
                        ))}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <h2 className="cpl__h cpl__h--sub">Desktop background</h2>
              <p className="cpl__p">
                Every theme brings its own picture. Put any of these behind it instead. The
                window colour stays where you left it.
              </p>
              <div className="cpl__walls">
                {WALLPAPERS.map((w) => (
                  <button
                    key={w.id}
                    className="wallcard"
                    data-on={wallpaper === w.id}
                    aria-pressed={wallpaper === w.id}
                    onClick={() => setWallpaper(wallpaper === w.id ? null : w.id)}
                  >
                    <span
                      className="wallcard__shot"
                      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}wall/${w.id}.webp)` }}
                    />
                    <span className="wallcard__name">{w.name}</span>
                    <span className="wallcard__note">{w.note}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {section === 'account' ? (
            <>
              <h2 className="cpl__h">Change your picture</h2>
              <p className="cpl__p">
                This is you on the sign-in screen and in the Start menu. Build it here. It
                saves as you click and stays in this browser.
              </p>
              {/* The same maker the Change Picture app opens, sitting in the
                  pane rather than a second window. */}
              <div className="cpl__account">
                <AvatarMaker />
              </div>
            </>
          ) : null}

          {section === 'sound' ? (
            <>
              <h2 className="cpl__h">Sound</h2>
              <p className="cpl__p">
                Two sounds. A sign-in chime and a soft click. The browser makes both on the
                spot.
              </p>
              <div className="cpl__row">
                <input
                  type="checkbox"
                  id="cp-sound"
                  checked={soundOn}
                  onChange={(e) => setSound(e.target.checked)}
                />
                <label htmlFor="cp-sound">Play interface sounds</label>
              </div>
              <div className="cpl__actions">
                <button className="aero-btn" onClick={() => sound.chime()} disabled={!soundOn}>
                  <Glyph.sound /> Test the chime
                </button>
                <button className="aero-btn" onClick={() => sound.click()} disabled={!soundOn}>
                  Test the click
                </button>
              </div>
            </>
          ) : null}

          {section === 'motion' ? (
            <>
              <h2 className="cpl__h">Make the screen easier to look at</h2>
              <p className="cpl__p">
                Calm mode stills the wallpaper and shortens window transitions. Your system
                setting for reduced motion already does the same.
              </p>
              <div className="cpl__row">
                <input
                  type="checkbox"
                  id="cp-calm"
                  checked={calm}
                  onChange={(e) => toggleCalm(e.target.checked)}
                />
                <label htmlFor="cp-calm">Turn off unnecessary animations</label>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
