import type { ReactElement, ReactNode } from 'react'

/**
 * Aero-kawaii icon set.
 * Every icon is authored SVG on a 48-unit grid, built from the same three
 * ingredients: a saturated cool-hued body, one specular sweep across the
 * upper third, and a soft inner floor shadow. Gradients live in a single
 * <IconDefs/> mounted once at the app root so instances stay cheap.
 */

export type IconName =
  | 'computer'
  | 'folder'
  | 'folderProjects'
  | 'ipod'
  | 'explorer'
  | 'paint'
  | 'terminal'
  | 'notes'
  | 'guestbook'
  | 'arcade'
  | 'aquarium'
  | 'control'
  | 'pet'
  | 'recycle'
  | 'star'
  | 'user'
  | 'games'
  | 'cards'
  | 'spider'
  | 'freecell'
  | 'mine'
  | 'github'
  | 'notepad'
  | 'calculator'
  | 'sticky'
  | 'synth'
  | 'camera'
  | 'wordpad'
  | 'contacts'

export function IconDefs() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="gViolet" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#b5a6ff" />
          <stop offset="0.48" stopColor="#6a56dd" />
          <stop offset="1" stopColor="#2d2192" />
        </linearGradient>
        <linearGradient id="gBlue" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#a8dcff" />
          <stop offset="0.48" stopColor="#4b90ea" />
          <stop offset="1" stopColor="#1c4fa8" />
        </linearGradient>
        <linearGradient id="gAqua" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ccfaff" />
          <stop offset="0.48" stopColor="#5fd3ee" />
          <stop offset="1" stopColor="#1a7fa8" />
        </linearGradient>
        <linearGradient id="gPeri" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#c3caff" />
          <stop offset="0.48" stopColor="#7b88f5" />
          <stop offset="1" stopColor="#3a35a8" />
        </linearGradient>
        <linearGradient id="gLav" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#eeebfa" />
          <stop offset="1" stopColor="#c2bce0" />
        </linearGradient>
        <linearGradient id="gSlate" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#4d4880" />
          <stop offset="0.5" stopColor="#252047" />
          <stop offset="1" stopColor="#100d28" />
        </linearGradient>
        <linearGradient id="gGold" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.48" stopColor="#ffc82e" />
          <stop offset="1" stopColor="#c07d05" />
        </linearGradient>
        <linearGradient id="gOrange" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ffd0a3" />
          <stop offset="0.48" stopColor="#ff8a2e" />
          <stop offset="1" stopColor="#c04e08" />
        </linearGradient>
        <linearGradient id="gGreen" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#c8f8cf" />
          <stop offset="0.48" stopColor="#4fcc6a" />
          <stop offset="1" stopColor="#158a3a" />
        </linearGradient>
        <linearGradient id="gTeal" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#b9f6ee" />
          <stop offset="0.48" stopColor="#33c9b8" />
          <stop offset="1" stopColor="#0c7a70" />
        </linearGradient>
        <linearGradient id="gMagenta" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ffc4f0" />
          <stop offset="0.48" stopColor="#e256c0" />
          <stop offset="1" stopColor="#8f1a78" />
        </linearGradient>
        <linearGradient id="gSteel" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#e8eef6" />
          <stop offset="0.5" stopColor="#9fadc0" />
          <stop offset="1" stopColor="#5d6b80" />
        </linearGradient>
        <linearGradient id="gRose" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ffc2d4" />
          <stop offset="0.5" stopColor="#f36187" />
          <stop offset="1" stopColor="#b82b52" />
        </linearGradient>
        <linearGradient id="gSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="gSheenSoft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.26" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Real lighting, not a painted-on highlight: the alpha channel is
            treated as a height field and lit from the upper left, so every
            edge catches a specular the way a moulded plastic object does.
            Renders once per icon and costs nothing after that. */}
        <filter id="fx3d" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="height" />
          <feSpecularLighting
            in="height"
            surfaceScale="3.4"
            specularConstant="0.78"
            specularExponent="24"
            lightingColor="#ffffff"
            result="spec"
          >
            <feDistantLight azimuth="228" elevation="56" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClipped" />
          <feComposite
            in="SourceGraphic"
            in2="specClipped"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="0.85"
            k4="0"
          />
        </filter>
        <radialGradient id="gBloom" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}

type P = { className?: string }
const box = (children: ReactNode, className?: string) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
    <g filter="url(#fx3d)">{children}</g>
  </svg>
)

/* ---------- the desktop set ---------- */

const Computer = ({ className }: P) =>
  box(
    <>
      <path
        d="M6 10.5A3.5 3.5 0 0 1 9.5 7h29A3.5 3.5 0 0 1 42 10.5v20A3.5 3.5 0 0 1 38.5 34h-29A3.5 3.5 0 0 1 6 30.5Z"
        fill="url(#gSlate)"
        stroke="#0e0b26"
        strokeWidth="1"
      />
      <rect x="9" y="10" width="30" height="21" rx="2.2" fill="url(#gBlue)" />
      <path d="M9 10h30v10.5c-6 3-24 3-30 0Z" fill="url(#gSheen)" />
      <circle cx="33.5" cy="15" r="4.5" fill="url(#gBloom)" opacity="0.75" />
      <path d="M18 34h12l2.2 6H15.8Z" fill="url(#gLav)" stroke="#3c3668" strokeWidth="0.9" strokeLinejoin="round" />
      <rect x="12" y="39.4" width="24" height="3.6" rx="1.8" fill="url(#gLav)" stroke="#3c3668" strokeWidth="0.9" />
    </>,
    className,
  )

const Folder = ({ className }: P) =>
  box(
    <>
      <path
        d="M4 13.5A3.5 3.5 0 0 1 7.5 10h10.2c1.1 0 2.1.5 2.8 1.4l2.1 2.6H40a3.5 3.5 0 0 1 3.5 3.5v3H4Z"
        fill="url(#gGold)"
        stroke="#8a5c04"
        strokeWidth="0.9"
      />
      <path
        d="M4.6 19.5h38.8a2.6 2.6 0 0 1 2.55 3.14l-2.9 14.2A3.6 3.6 0 0 1 39.5 39.7h-31a3.6 3.6 0 0 1-3.53-2.9L2.05 22.6A2.6 2.6 0 0 1 4.6 19.5Z"
        fill="url(#gOrange)"
        stroke="#a85708"
        strokeWidth="0.9"
      />
      <path d="M5 20.6h38l-1.3 6.6c-9.5 3.4-26 3.4-35.4 0Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const FolderProjects = ({ className }: P) =>
  box(
    <>
      <path
        d="M4 13.5A3.5 3.5 0 0 1 7.5 10h10.2c1.1 0 2.1.5 2.8 1.4l2.1 2.6H40a3.5 3.5 0 0 1 3.5 3.5v3H4Z"
        fill="url(#gViolet)"
        stroke="#241a72"
        strokeWidth="0.9"
      />
      <path
        d="M4.6 19.5h38.8a2.6 2.6 0 0 1 2.55 3.14l-2.9 14.2A3.6 3.6 0 0 1 39.5 39.7h-31a3.6 3.6 0 0 1-3.53-2.9L2.05 22.6A2.6 2.6 0 0 1 4.6 19.5Z"
        fill="url(#gPeri)"
        stroke="#2b2680"
        strokeWidth="0.9"
      />
      <path d="M5 20.6h38l-1.3 6.6c-9.5 3.4-26 3.4-35.4 0Z" fill="url(#gSheen)" />
      <path
        d="M24 24.4l1.85 3.9 4.15.58-3 3.02.71 4.3L24 34.16l-3.71 2.04.71-4.3-3-3.02 4.15-.58Z"
        fill="#f4fbff"
        stroke="#2b2680"
        strokeWidth="0.7"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </>,
    className,
  )

const Ipod = ({ className }: P) =>
  box(
    <>
      <rect x="11" y="3.5" width="26" height="41" rx="5.5" fill="url(#gLav)" stroke="#3c3668" strokeWidth="1" />
      <rect x="14" y="6.5" width="20" height="14" rx="2" fill="url(#gSlate)" />
      <rect x="14" y="6.5" width="20" height="6.5" rx="2" fill="url(#gSheenSoft)" />
      <circle cx="24" cy="32" r="9.2" fill="url(#gPeri)" stroke="#2b2680" strokeWidth="0.9" />
      <circle cx="24" cy="32" r="9.2" fill="url(#gSheenSoft)" />
      <circle cx="24" cy="32" r="3.4" fill="url(#gLav)" stroke="#3c3668" strokeWidth="0.8" />
      <path d="M13.5 5.5h21v3.2c-4.6 1.8-16.4 1.8-21 0Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const Explorer = ({ className }: P) =>
  box(
    <>
      <circle cx="24" cy="24" r="18" fill="url(#gBlue)" stroke="#153e86" strokeWidth="1" />
      <ellipse cx="24" cy="24" rx="7.6" ry="18" fill="none" stroke="#d9edff" strokeWidth="1.3" opacity="0.75" />
      <path d="M6.4 18.5h35.2M6.4 29.5h35.2" stroke="#d9edff" strokeWidth="1.3" opacity="0.75" />
      <path d="M8 13c5.5-4.5 26.5-4.5 32 0-2 6-30 6-32 0Z" fill="url(#gSheen)" />
      <path
        d="M31.5 12.5c6 2.5 9 8 6.5 12.5-2.2 4-8.6 4.6-14.5 1.6"
        fill="none"
        stroke="#ffe9a8"
        strokeWidth="0"
      />
      <path
        d="M13.2 24c8.4 4.6 17.8 4.6 26.2-1.2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.1"
        opacity="0.5"
      />
    </>,
    className,
  )

const Paint = ({ className }: P) =>
  box(
    <>
      <path
        d="M24 5.5c10.5 0 19 6.6 19 14.8 0 5.4-4 8.2-8.4 8.2h-3.2c-2.6 0-4.6 2-4.6 4.4 0 1 .4 1.9 1 2.7.6.8 1 1.6 1 2.6 0 2.4-2 4.3-4.8 4.3C13.8 42.5 5 34.6 5 23.6 5 13.5 13.5 5.5 24 5.5Z"
        fill="url(#gLav)"
        stroke="#3c3668"
        strokeWidth="1"
      />
      <circle cx="15" cy="16.5" r="3.3" fill="url(#gViolet)" />
      <circle cx="24.5" cy="13" r="3.3" fill="url(#gAqua)" />
      <circle cx="33.5" cy="17.5" r="3.3" fill="url(#gBlue)" />
      <circle cx="14.5" cy="27" r="3.3" fill="url(#gPeri)" />
      <path d="M8 14c4-6 26-8 33 3-8-4-27-3-33-3Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const Terminal = ({ className }: P) =>
  box(
    <>
      <rect x="4.5" y="8.5" width="39" height="31" rx="5" fill="url(#gSlate)" stroke="#0c0a20" strokeWidth="1" />
      <rect x="7" y="11" width="34" height="26" rx="3.2" fill="#0d0b2c" />
      <path d="M7 11h34v6.5c-8 2.4-26 2.4-34 0Z" fill="url(#gSheenSoft)" opacity="0.5" />
      <path d="M13 20.5l5 4-5 4" fill="none" stroke="#5fdcff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.5 29.5h11" stroke="#8f6dff" strokeWidth="2.2" strokeLinecap="round" />
    </>,
    className,
  )

const Notes = ({ className }: P) =>
  box(
    <>
      <path
        d="M9 8.5a3 3 0 0 1 3-3h20.5L40 13.2V39.5a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3Z"
        fill="url(#gLav)"
        stroke="#3c3668"
        strokeWidth="1"
      />
      <path d="M32.5 5.5 40 13.2h-7.5Z" fill="#b3aede" stroke="#3c3668" strokeWidth="1" strokeLinejoin="round" />
      <path d="M15.5 19h17M15.5 25h17M15.5 31h11" stroke="#6c7bf2" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <path d="M10 6.5h22v4.2c-6 2-16 2-22 0Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const Guestbook = ({ className }: P) =>
  box(
    <>
      <rect x="5" y="12" width="38" height="26" rx="4.5" fill="url(#gGreen)" stroke="#0f6b30" strokeWidth="1" />
      <path d="M5.8 14.4 24 27.2l18.2-12.8" fill="none" stroke="#eaf0ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 13h36v6.2c-8.6 3.2-27.4 3.2-36 0Z" fill="url(#gSheen)" />
      <path
        d="M31 6.2c1.9-2 5-1.9 6.7.2 1.6-2.1 4.8-2.2 6.7-.2 2 2.1 1.7 5.3-.5 7.3l-6.2 5.6-6.2-5.6c-2.2-2-2.5-5.2-.5-7.3Z"
        fill="url(#gRose)"
        stroke="#8f1c36"
        strokeWidth="0.9"
      />
    </>,
    className,
  )

const Arcade = ({ className }: P) =>
  box(
    <>
      <rect x="3.5" y="17" width="41" height="22" rx="9.5" fill="url(#gMagenta)" stroke="#6d1259" strokeWidth="1" />
      <path d="M5 19h38v7.5c-9 3.6-29 3.6-38 0Z" fill="url(#gSheen)" />
      <path d="M12.5 24v8M8.5 28h8" stroke="#f2f6ff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="33.5" cy="25.5" r="2.9" fill="#5fdcff" />
      <circle cx="38.5" cy="31" r="2.9" fill="#ffc2d4" />
      <circle cx="28.5" cy="31" r="2.9" fill="#c3caff" />
      <path d="M24 17V9.5a4 4 0 0 1 4-4h3.5" fill="none" stroke="#8f9bf7" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="33" cy="5.5" r="3.4" fill="url(#gAqua)" stroke="#1a6f96" strokeWidth="0.9" />
    </>,
    className,
  )

const Aquarium = ({ className }: P) =>
  box(
    <>
      <rect x="4" y="9" width="40" height="30" rx="6" fill="url(#gAqua)" stroke="#12617f" strokeWidth="1" opacity="0.92" />
      <path d="M5.5 10.5h37v9c-9 3.8-28 3.8-37 0Z" fill="url(#gSheen)" />
      <path
        d="M30.5 25.5c0 3.4-3.8 6.2-8.5 6.2-2.6 0-5-.9-6.6-2.3l-4 2.6 1.6-3.9-1.6-3.9 4 2.6c1.6-1.4 4-2.3 6.6-2.3 4.7 0 8.5 2.8 8.5 6.2Z"
        fill="#ffffff"
        opacity="0"
      />
      <path
        d="M13.5 25.5c1.8-3 5.4-4.8 9-4.8 3.3 0 6.1 1.5 7.6 3.7l4.4-3.3v9.5l-4.4-3.3c-1.5 2.2-4.3 3.7-7.6 3.7-3.6 0-7.2-1.8-9-4.8Z"
        fill="url(#gViolet)"
        stroke="#241a72"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <circle cx="18.4" cy="24.3" r="1.15" fill="#fff" />
      <circle cx="34" cy="13.5" r="2.1" fill="#ffffff" opacity="0.72" />
      <circle cx="38" cy="19" r="1.4" fill="#ffffff" opacity="0.6" />
      <circle cx="35.5" cy="24" r="1" fill="#ffffff" opacity="0.5" />
      <path d="M6 35.5c4-2.5 8-2.5 12 0s8 2.5 12 0 8-2.5 12 0v1.5a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5Z" fill="#2c73a8" opacity="0.45" />
    </>,
    className,
  )

const Control = ({ className }: P) =>
  box(
    <>
      <rect x="5" y="7" width="38" height="34" rx="6" fill="url(#gLav)" stroke="#3c3668" strokeWidth="1" />
      <path d="M6.5 8.5h35v8c-8 3.2-27 3.2-35 0Z" fill="url(#gSheen)" />
      <path d="M12 17.5h24M12 24h24M12 30.5h24" stroke="#b3aede" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="19" cy="17.5" r="4" fill="url(#gAqua)" stroke="#12617f" strokeWidth="0.9" />
      <circle cx="30" cy="24" r="4" fill="url(#gPeri)" stroke="#2b2680" strokeWidth="0.9" />
      <circle cx="22" cy="30.5" r="4" fill="url(#gViolet)" stroke="#241a72" strokeWidth="0.9" />
    </>,
    className,
  )

const Pet = ({ className }: P) =>
  box(
    <>
      <path
        d="M11 22c0-7.2 5.8-12.5 13-12.5S37 14.8 37 22v7.5c0 6-5.8 10.5-13 10.5S11 35.5 11 29.5Z"
        fill="url(#gTeal)"
        stroke="#0a6a61"
        strokeWidth="1"
      />
      <path d="M12.5 20c2-6 20-6 23 0-4.5 4-18.5 4-23 0Z" fill="url(#gSheen)" />
      <path d="M13.5 13.2 11 5.5l7.6 3.6Z" fill="url(#gViolet)" stroke="#241a72" strokeWidth="1" strokeLinejoin="round" />
      <path d="M34.5 13.2 37 5.5l-7.6 3.6Z" fill="url(#gViolet)" stroke="#241a72" strokeWidth="1" strokeLinejoin="round" />
      <ellipse cx="19" cy="25" rx="2.1" ry="2.6" fill="#161238" />
      <ellipse cx="29" cy="25" rx="2.1" ry="2.6" fill="#161238" />
      <circle cx="19.8" cy="24" r="0.8" fill="#fff" />
      <circle cx="29.8" cy="24" r="0.8" fill="#fff" />
      <path d="M21.5 30.5c.8 1 1.6 1.5 2.5 1.5s1.7-.5 2.5-1.5" fill="none" stroke="#161238" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="29.5" r="2.3" fill="#8fd3ff" opacity="0.75" />
      <circle cx="34" cy="29.5" r="2.3" fill="#8fd3ff" opacity="0.75" />
    </>,
    className,
  )

const Recycle = ({ className }: P) =>
  box(
    <>
      <path
        d="M11 14h26l-2.4 24.2A4 4 0 0 1 30.6 42H17.4a4 4 0 0 1-4-3.8Z"
        fill="url(#gGreen)"
        stroke="#0f6b30"
        strokeWidth="1"
        opacity="0.9"
      />
      <path d="M11.5 15h25l-.7 7c-7.4 3-16.2 3-23.6 0Z" fill="url(#gSheen)" />
      <rect x="8.5" y="9.5" width="31" height="5.4" rx="2.7" fill="url(#gLav)" stroke="#3c3668" strokeWidth="0.9" />
      <path d="M19 7.5h10" stroke="#3c3668" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 22.5v13M24 22.5v13M29 22.5v13" stroke="#0f5f7d" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
    </>,
    className,
  )

const Star = ({ className }: P) =>
  box(
    <>
      <path
        d="M24 5.5 29.6 18l13.4 1.8-9.8 9.4L35.6 42 24 35.6 12.4 42l2.4-12.8L5 19.8 18.4 18Z"
        fill="url(#gGold)"
        stroke="#8a5c04"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M24 7.5 28.6 18 24 20Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const User = ({ className }: P) =>
  box(
    <>
      <rect x="0" y="0" width="48" height="48" rx="8" fill="url(#gPeri)" />
      <path d="M0 0h48v22C34 30 14 30 0 22Z" fill="url(#gSheenSoft)" />
      <circle cx="24" cy="19.5" r="8.2" fill="url(#gLav)" stroke="#3c3668" strokeWidth="0.9" />
      <path
        d="M9 44.5c1.4-8 7.6-12.4 15-12.4s13.6 4.4 15 12.4Z"
        fill="url(#gLav)"
        stroke="#3c3668"
        strokeWidth="0.9"
      />
      <circle cx="20.6" cy="18.6" r="1.35" fill="#2b2660" />
      <circle cx="27.4" cy="18.6" r="1.35" fill="#2b2660" />
      <path d="M21.6 22.4c.7.8 1.5 1.2 2.4 1.2s1.7-.4 2.4-1.2" fill="none" stroke="#2b2660" strokeWidth="1.3" strokeLinecap="round" />
    </>,
    className,
  )

const Games = ({ className }: P) =>
  box(
    <>
      <rect x="4" y="9" width="40" height="30" rx="4" fill="url(#gOrange)" stroke="#8f3a05" strokeWidth="1" />
      <path d="M5.5 10.5h37v8.5c-9 3.4-28 3.4-37 0Z" fill="url(#gSheen)" />
      <circle cx="15" cy="24" r="3.1" fill="#f2f6ff" />
      <circle cx="15" cy="31.5" r="3.1" fill="#f2f6ff" />
      <path d="M31 20.5v10M26 25.5h10" stroke="#f2f6ff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="35.5" cy="32" r="2.6" fill="url(#gAqua)" stroke="#12617f" strokeWidth="0.7" />
    </>,
    className,
  )

const Cards = ({ className }: P) =>
  box(
    <>
      <rect x="6" y="12" width="22" height="30" rx="3" fill="url(#gLav)" stroke="#3c3668" strokeWidth="1" transform="rotate(-12 17 27)" />
      <rect x="15" y="8" width="24" height="32" rx="3" fill="#ffffff" stroke="#3c3668" strokeWidth="1" />
      <path d="M27 14.5c2.6 3.4 6 4.6 6 7.6 0 2-1.7 3.3-3.4 3.3-1.1 0-2-.5-2.6-1.3-.6.8-1.5 1.3-2.6 1.3-1.7 0-3.4-1.3-3.4-3.3 0-3 3.4-4.2 6-7.6Z" fill="#d63b2f" />
      <path d="M25.6 26.6h2.8l-1.4 6.4Z" fill="#d63b2f" />
    </>,
    className,
  )

const Spider = ({ className }: P) =>
  box(
    <>
      <rect x="5" y="10" width="20" height="28" rx="3" fill="url(#gLav)" stroke="#3c3668" strokeWidth="1" />
      <rect x="14" y="13" width="20" height="28" rx="3" fill="#fbfcff" stroke="#3c3668" strokeWidth="1" />
      <rect x="23" y="8" width="20" height="28" rx="3" fill="#ffffff" stroke="#3c3668" strokeWidth="1" />
      <path d="M33 13.5c2.4 3.2 5.6 4.3 5.6 7.1 0 1.9-1.6 3.1-3.2 3.1-1 0-1.9-.5-2.4-1.2-.5.7-1.4 1.2-2.4 1.2-1.6 0-3.2-1.2-3.2-3.1 0-2.8 3.2-3.9 5.6-7.1Z" fill="#161238" />
      <path d="M31.7 25h2.6l-1.3 5.8Z" fill="#161238" />
    </>,
    className,
  )

const FreeCellIcon = ({ className }: P) =>
  box(
    <>
      <rect x="4" y="7" width="40" height="34" rx="4" fill="url(#gAqua)" stroke="#12617f" strokeWidth="1" opacity="0.9" />
      <path d="M5.5 8.5h37v8c-9 3.2-28 3.2-37 0Z" fill="url(#gSheen)" />
      <rect x="8" y="11" width="9" height="12" rx="1.6" fill="#ffffff" stroke="#3c3668" strokeWidth="0.8" />
      <rect x="19.5" y="11" width="9" height="12" rx="1.6" fill="#ffffff" stroke="#3c3668" strokeWidth="0.8" />
      <rect x="31" y="11" width="9" height="12" rx="1.6" fill="#ffffff" stroke="#3c3668" strokeWidth="0.8" />
      <rect x="10" y="26" width="9" height="12" rx="1.6" fill="#ffffff" stroke="#3c3668" strokeWidth="0.8" />
      <rect x="21.5" y="26" width="9" height="12" rx="1.6" fill="#ffffff" stroke="#3c3668" strokeWidth="0.8" />
      <path d="M14.5 30.5 16 33l-1.5 2.5L13 33Z" fill="#d63b2f" />
      <path d="M26 30.5 27.5 33 26 35.5 24.5 33Z" fill="#161238" />
    </>,
    className,
  )

const Mine = ({ className }: P) =>
  box(
    <>
      <rect x="4" y="6" width="40" height="36" rx="3" fill="#c0c0c0" stroke="#7b7b7b" strokeWidth="1" />
      <path d="M6 8h36v3H6Z" fill="#ffffff" opacity="0.85" />
      <circle cx="24" cy="25" r="9" fill="#1a1a1a" />
      <path d="M24 12v26M11 25h26M15.5 16.5l17 17M32.5 16.5l-17 17" stroke="#1a1a1a" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20.5" cy="21.5" r="2.4" fill="#ffffff" />
    </>,
    className,
  )

/* The GitHub mark, on the glossy tile the OS gives every other launcher.
   Used only to link to GitHub, which is what the mark is for. */
const GitHub = ({ className }: P) =>
  box(
    <>
      <rect x="3" y="3" width="42" height="42" rx="7" fill="url(#gSlate)" stroke="#0b0d12" strokeWidth="1" />
      <path d="M4.5 4.5h39v14c-9 4-30 4-39 0Z" fill="url(#gSheen)" />
      <g transform="translate(9.6 9.6) scale(1.8)">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" fill="#ffffff" />
      </g>
    </>,
    className,
  )

const Notepad = ({ className }: P) =>
  box(
    <>
      <path d="M9 6.5a2.5 2.5 0 0 1 2.5-2.5h19L40 13.5v28A2.5 2.5 0 0 1 37.5 44h-26A2.5 2.5 0 0 1 9 41.5Z" fill="#ffffff" stroke="#5a6b82" strokeWidth="1" />
      <path d="M30.5 4 40 13.5h-9.5Z" fill="#cfdcea" stroke="#5a6b82" strokeWidth="1" strokeLinejoin="round" />
      <path d="M15 20h18M15 26h18M15 32h12" stroke="#7fa0c8" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 5.5h20v4.5c-6 2-14 2-20 0Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const Calculator = ({ className }: P) =>
  box(
    <>
      <rect x="7" y="4" width="34" height="40" rx="4" fill="url(#gSlate)" stroke="#0e131f" strokeWidth="1" />
      <path d="M8.5 5.5h31v9c-7 3-24 3-31 0Z" fill="url(#gSheen)" />
      <rect x="11" y="8" width="26" height="9" rx="2" fill="#9fe8b0" stroke="#2f5a3c" strokeWidth="0.8" />
      <path d="M22 10.5h13" stroke="#2b4a35" strokeWidth="1.6" strokeLinecap="round" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={11.5 + c * 6.6}
            y={21 + r * 5.6}
            width={5.2}
            height={4.4}
            rx={1.2}
            fill={c === 3 ? '#ff9f2e' : '#dfe8f5'}
          />
        )),
      )}
    </>,
    className,
  )

const Sticky = ({ className }: P) =>
  box(
    <>
      <path d="M7 8.5A2.5 2.5 0 0 1 9.5 6h29A2.5 2.5 0 0 1 41 8.5V30L27 44H9.5A2.5 2.5 0 0 1 7 41.5Z" fill="#fdf0a4" stroke="#c8a93c" strokeWidth="1" />
      <path d="M41 30 27 44V32.5A2.5 2.5 0 0 1 29.5 30Z" fill="#f2df82" stroke="#c8a93c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M14 16h20M14 22h20M14 28h13" stroke="#b39527" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 7.5h30v4.5c-9 2-21 2-30 0Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const SynthIcon = ({ className }: P) =>
  box(
    <>
      <rect x="3" y="12" width="42" height="26" rx="4" fill="url(#gSlate)" stroke="#0e131f" strokeWidth="1" />
      <path d="M4.5 13.5h39v6c-9 2.6-30 2.6-39 0Z" fill="url(#gSheen)" />
      <rect x="6" y="24" width="36" height="12" rx="2" fill="#f2f6ff" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={9 + i * 7} y={24} width={3.4} height={7.5} rx={0.8} fill="#1a2233" />
      ))}
      <circle cx="12" cy="18" r="2.6" fill="#5fdcff" />
      <circle cx="20" cy="18" r="2.6" fill="#ff8f2e" />
      <path d="M27 19h13" stroke="#8fa4c8" strokeWidth="2" strokeLinecap="round" />
    </>,
    className,
  )

const ContactsIcon = ({ className }: P) =>
  box(
    <>
      <rect x="8" y="4" width="33" height="40" rx="4" fill="url(#gLav)" stroke="#5a6b82" strokeWidth="1" />
      <rect x="5" y="9" width="7" height="4" rx="2" fill="url(#gTeal)" />
      <rect x="5" y="22" width="7" height="4" rx="2" fill="url(#gOrange)" />
      <rect x="5" y="35" width="7" height="4" rx="2" fill="url(#gGreen)" />
      <circle cx="24" cy="19" r="7" fill="url(#gBlue)" />
      <path d="M14 38c1.4-6.4 5.4-9.6 10-9.6s8.6 3.2 10 9.6Z" fill="url(#gBlue)" />
      <path d="M9 5.5h31v5c-9 2.4-22 2.4-31 0Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const Camera = ({ className }: P) =>
  box(
    <>
      <path d="M4 16a4 4 0 0 1 4-4h5l3-4h8l3 4h5a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="url(#gSlate)" stroke="#0e131f" strokeWidth="1" />
      <path d="M5.5 14h37v6c-9 2.6-28 2.6-37 0Z" fill="url(#gSheen)" />
      <circle cx="24" cy="25" r="10" fill="url(#gTeal)" stroke="#0a6a61" strokeWidth="1" />
      <circle cx="24" cy="25" r="5.4" fill="#0d2230" />
      <circle cx="21" cy="22" r="2.2" fill="#ffffff" opacity="0.8" />
      <circle cx="37" cy="17" r="1.8" fill="#ff6b5c" />
    </>,
    className,
  )

const WordPadIcon = ({ className }: P) =>
  box(
    <>
      <path d="M9 6.5a2.5 2.5 0 0 1 2.5-2.5h20.5L40 13.2V39.5a2.5 2.5 0 0 1-2.5 2.5H11.5A2.5 2.5 0 0 1 9 39.5Z" fill="#ffffff" stroke="#5a6b82" strokeWidth="1" />
      <path d="M32.5 4 40 13.2h-7.5Z" fill="#cfdcea" stroke="#5a6b82" strokeWidth="1" strokeLinejoin="round" />
      <path d="M15 19h13" stroke="#e0553a" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M15 25h18M15 31h18M15 36h11" stroke="#7fa0c8" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 5.5h22v4.2c-6 2-16 2-22 0Z" fill="url(#gSheen)" />
    </>,
    className,
  )

const registry: Record<IconName, (p: P) => ReactElement> = {
  camera: Camera,
  wordpad: WordPadIcon,
  synth: SynthIcon,
  contacts: ContactsIcon,
  notepad: Notepad,
  calculator: Calculator,
  sticky: Sticky,
  github: GitHub,
  games: Games,
  cards: Cards,
  spider: Spider,
  freecell: FreeCellIcon,
  mine: Mine,
  computer: Computer,
  folder: Folder,
  folderProjects: FolderProjects,
  ipod: Ipod,
  explorer: Explorer,
  paint: Paint,
  terminal: Terminal,
  notes: Notes,
  guestbook: Guestbook,
  arcade: Arcade,
  aquarium: Aquarium,
  control: Control,
  pet: Pet,
  recycle: Recycle,
  star: Star,
  user: User,
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const C = registry[name]
  return <C className={className} />
}

/* ------------------------------------------------------------
   Line glyphs: one stroke weight, one cap style, used for chrome
   controls where a glossy object would be noise.
   ------------------------------------------------------------ */

const glyph = (d: ReactNode, className?: string) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ? `gly ${className}` : 'gly'}
    aria-hidden
    focusable="false"
  >
    {d}
  </svg>
)

export const Glyph = {
  minimize: (p: P) => glyph(<path d="M3.5 11.5h9" />, p.className),
  maximize: (p: P) => glyph(<rect x="3.3" y="3.3" width="9.4" height="9.4" rx="1.4" />, p.className),
  restore: (p: P) =>
    glyph(
      <>
        <rect x="2.6" y="5.6" width="7.8" height="7.8" rx="1.3" />
        <path d="M5.6 5.6V3.9A1.3 1.3 0 0 1 6.9 2.6h6.2a1.3 1.3 0 0 1 1.3 1.3v6.2a1.3 1.3 0 0 1-1.3 1.3h-1.7" />
      </>,
      p.className,
    ),
  close: (p: P) => glyph(<path d="M4 4l8 8M12 4l-8 8" />, p.className),
  arrowRight: (p: P) => glyph(<path d="M3.5 8h9M8.5 4l4 4-4 4" />, p.className),
  chevronRight: (p: P) => glyph(<path d="M6 3.5 10.5 8 6 12.5" />, p.className),
  check: (p: P) => glyph(<path d="M3.4 8.6 6.4 11.6 12.6 4.6" />, p.className),
  pin: (p: P) =>
    glyph(
      <>
        <path d="M9.6 1.8 14.2 6.4 11.9 8.7 12.4 12 9.1 9.4l-4 4.6.9-5.1L3.3 6.6l3.3.5Z" />
      </>,
      p.className,
    ),
  search: (p: P) => glyph(<><circle cx="7.2" cy="7.2" r="4.2" /><path d="m10.4 10.4 3 3" /></>, p.className),
  power: (p: P) => glyph(<><path d="M8 2.4v5.4" /><path d="M11.9 4.6a5.2 5.2 0 1 1-7.8 0" /></>, p.className),
  sound: (p: P) =>
    glyph(
      <>
        <path d="M3 6.2h2.4L8.6 3.4v9.2L5.4 9.8H3Z" />
        <path d="M10.8 6a2.8 2.8 0 0 1 0 4" />
        <path d="M12.8 4.2a5.4 5.4 0 0 1 0 7.6" />
      </>,
      p.className,
    ),
  soundOff: (p: P) =>
    glyph(
      <>
        <path d="M3 6.2h2.4L8.6 3.4v9.2L5.4 9.8H3Z" />
        <path d="m11 6.2 3.2 3.6M14.2 6.2 11 9.8" />
      </>,
      p.className,
    ),
  network: (p: P) =>
    glyph(
      <>
        <path d="M2 6.2a8.6 8.6 0 0 1 12 0" />
        <path d="M4.4 8.7a5.2 5.2 0 0 1 7.2 0" />
        <path d="M6.8 11.2a1.8 1.8 0 0 1 2.4 0" />
        <circle cx="8" cy="13.4" r="0.5" fill="currentColor" />
      </>,
      p.className,
    ),
  accessibility: (p: P) =>
    glyph(
      <>
        <circle cx="8" cy="3.4" r="1.5" />
        <path d="M3.2 6.4h9.6M8 6.4v4M8 10.4l-2.2 3M8 10.4l2.2 3" />
      </>,
      p.className,
    ),
  sparkle: (p: P) =>
    glyph(
      <path d="M8 2.2c.4 3.2 1.2 4 4.4 4.4-3.2.4-4 1.2-4.4 4.4-.4-3.2-1.2-4-4.4-4.4 3.2-.4 4-1.2 4.4-4.4Z" />,
      p.className,
    ),
  grid: (p: P) =>
    glyph(
      <>
        <rect x="2.6" y="2.6" width="4.6" height="4.6" rx="1.1" />
        <rect x="8.8" y="2.6" width="4.6" height="4.6" rx="1.1" />
        <rect x="2.6" y="8.8" width="4.6" height="4.6" rx="1.1" />
        <rect x="8.8" y="8.8" width="4.6" height="4.6" rx="1.1" />
      </>,
      p.className,
    ),
}

/** The start orb mark and boot logo: four glass panes in a pinwheel. */
export function Mark({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="mk1" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#e6f9ff" />
          <stop offset="1" stopColor="#5fdcff" />
        </linearGradient>
        <linearGradient id="mk2" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#dfe6ff" />
          <stop offset="1" stopColor="#6c7bf2" />
        </linearGradient>
        <linearGradient id="mk3" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#e2f0ff" />
          <stop offset="1" stopColor="#5aa6f2" />
        </linearGradient>
        <linearGradient id="mk4" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ece5ff" />
          <stop offset="1" stopColor="#8f6dff" />
        </linearGradient>
      </defs>
      <g>
        <path d="M21.4 4.6 8.2 8.9a2 2 0 0 0-1.4 1.9v9.5h14.6Z" fill="url(#mk1)" />
        <path d="M26.6 4.6 41.2 9a2 2 0 0 1 1.4 1.9v9.4H26.6Z" fill="url(#mk2)" />
        <path d="M6.8 25.6h14.6v17.8L8.2 39.1a2 2 0 0 1-1.4-1.9Z" fill="url(#mk3)" />
        <path d="M26.6 25.6h16v11.6a2 2 0 0 1-1.4 1.9l-14.6 4.3Z" fill="url(#mk4)" />
      </g>
      <path d="M6.8 10.8 24 6v11.5L6.8 20.3Z" fill="#fff" opacity="0.35" />
      <path d="M26.6 6.5 42.6 11v8L26.6 17Z" fill="#fff" opacity="0.28" />
    </svg>
  )
}
