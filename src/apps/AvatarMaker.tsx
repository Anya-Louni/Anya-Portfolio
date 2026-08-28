import { useEffect, useState } from 'react'
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
  const pushToast = useOS((s) => s.pushToast)

  /* every change lands immediately — the sign-in tile, Start menu and
     Contacts all read the same store, so they update as you click */
  useEffect(() => {
    saveAvatar(spec)
  }, [spec])

  const set = <K extends keyof AvatarSpec>(k: K, v: AvatarSpec[K]) => {
    setSpec((s) => ({ ...s, [k]: v }))
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
    sound.click(0.9)
  }

  const confirm = () => {
    sound.chime()
    pushToast({
      icon: 'user',
      title: 'That is you now',
      body: 'It is already on the Start menu and the sign-in screen.',
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
        <p className="am__note">
          Changes apply straight away — this is already the picture on the sign-in tile and the
          Start menu.
        </p>
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
          <button className="aero-btn aero-btn--primary" onClick={confirm}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
