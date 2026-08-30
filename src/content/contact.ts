import type { AvatarSpec } from '../ui/Avatar'
import { GITHUB_PROFILE, GITHUB_USER } from './projects'

/** The one card in Contacts. Edit here, nowhere else. */
export const CONTACT = {
  name: 'Anya Louni',
  handle: GITHUB_USER,
  email: 'Anyal.louni@gmail.com',
  github: GITHUB_PROFILE,
  linkedin: 'https://www.linkedin.com/in/anya-louni-93337b332/',
  /** shown under the name */
  line: 'STEAM Mentor - Computer Science & AI Student',
}

/**
 * Anya's picture. Fixed on purpose: the avatar everywhere else follows
 * whatever the visitor made in Change Picture, and this card is not them.
 */
export const CONTACT_AVATAR: AvatarSpec = {
  skin: 1,
  hair: 4, // long
  hairColour: 0, // black
  eyes: 0,
  shirt: 4, // purple
  bg: 4,
  accessory: 0,
}
