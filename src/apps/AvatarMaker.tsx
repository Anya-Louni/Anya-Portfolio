import { useState } from 'react'
import {
  Avatar,
  BG,
  DEFAULT_AVATAR,
  HAIR_COLOUR,
  SHIRT,
  SKIN,
  saveAvatar,
  useAvatar,
  type AvatarSpec,
} from '../ui/Avatar'
import { sound } from '../os/sound'
import { useOS } from '../os/store'

const HAIR = ['Short', 'Long', 'Buns', 'Swept']
const EYES = ['Round', 'Happy', 'Wide']
const ACCESSORY = ['None', 'Glasses', 'Headphones', 'Sparkle']

export default function AvatarMaker() {
  const saved = useAvatar()
  const [spec, setSpec] = useState<AvatarSpec>(saved)
  const [done, setDone] = useState(false)
  const pushToast = useOS((s) => s.pushToast)

  const set = <K extends keyof AvatarSpec>(k: K, v: AvatarSpec[K]) => {
    setSpec((s) => ({ ...s, [k]: v }))
    setDone(false)
    sound.click(1.2)
  }

  const randomise = () => {
    setSpec({
      skin: Math.floor(Math.random() * SKIN.length),
      hair: Math.floor(Math.random() * HAIR.length),
      hairColour: Math.floor(Math.random() * HAIR_COLOUR.length),
      eyes: Math.floor(Math.random() * EYES.length),
      shirt: Math.floor(Math.random() * SHIRT.length),
      bg: Math.floor(Math.random() * BG.length),
      accessory: Math.floor(Math.random() * ACCESSORY.length),
    })
    setDone(false)
    sound.click(0.9)
  }

  const apply = () => {
    saveAvatar(spec)
    setDone(true)
    sound.chime()
    pushToast({
      icon: 'user',
      title: 'Picture changed',
      body: 'It shows on the Start menu and the sign-in screen.',
    })
  }

  const Row = ({
    label,
    count,
    value,
    onPick,
    swatches,
    names,
  }: {
    label: string
    count: number
    value: number
    onPick: (n: number) => void
    swatches?: string[] | [string, string][]
    names?: string[]
  }) => (
    <div className="am__row">
      <span className="am__label">{label}</span>
      <div className="am__opts">
        {Array.from({ length: count }, (_, i) => {
          const sw = swatches?.[i]
          const bg = Array.isArray(sw) ? `linear-gradient(160deg, ${sw[0]}, ${sw[1]})` : sw
          return (
            <button
              key={i}
              className={sw ? 'am__swatch' : 'am__chip'}
              style={sw ? { background: bg } : undefined}
              data-on={value === i}
              aria-label={names?.[i] ?? `${label} ${i + 1}`}
              onClick={() => onPick(i)}
            >
              {sw ? null : (names?.[i] ?? i + 1)}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="am">
      <div className="am__stage">
        <div className="am__frame">
          <Avatar spec={spec} size={188} />
        </div>
        <div className="am__sizes">
          <Avatar spec={spec} size={48} />
          <Avatar spec={spec} size={28} />
          <Avatar spec={spec} size={16} />
        </div>
        <p className="am__note">How it looks on the sign-in tile, the Start menu and the taskbar.</p>
      </div>

      <div className="am__panel">
        <Row label="Skin" count={SKIN.length} value={spec.skin} onPick={(n) => set('skin', n)} swatches={SKIN} />
        <Row label="Hair" count={HAIR.length} value={spec.hair} onPick={(n) => set('hair', n)} names={HAIR} />
        <Row
          label="Colour"
          count={HAIR_COLOUR.length}
          value={spec.hairColour}
          onPick={(n) => set('hairColour', n)}
          swatches={HAIR_COLOUR}
        />
        <Row label="Eyes" count={EYES.length} value={spec.eyes} onPick={(n) => set('eyes', n)} names={EYES} />
        <Row label="Shirt" count={SHIRT.length} value={spec.shirt} onPick={(n) => set('shirt', n)} swatches={SHIRT} />
        <Row
          label="Extras"
          count={ACCESSORY.length}
          value={spec.accessory}
          onPick={(n) => set('accessory', n)}
          names={ACCESSORY}
        />
        <Row
          label="Backdrop"
          count={BG.length}
          value={spec.bg}
          onPick={(n) => set('bg', n)}
          swatches={BG as [string, string][]}
        />

        <div className="am__actions">
          <button className="aero-btn" onClick={randomise}>
            Surprise me
          </button>
          <button className="aero-btn" onClick={() => setSpec(DEFAULT_AVATAR)}>
            Reset
          </button>
          <span className="game__spacer" />
          <button className="aero-btn aero-btn--primary" onClick={apply}>
            {done ? 'Saved' : 'Use this picture'}
          </button>
        </div>
      </div>
    </div>
  )
}
