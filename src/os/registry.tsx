import type { ComponentType } from 'react'
import type { IconName } from '../ui/Icon'
import { useOS } from './store'
import Finder from '../apps/Finder'
import ProjectDoc from '../apps/ProjectDoc'
import Aquarium from '../apps/Aquarium'
import ControlPanel from '../apps/ControlPanel'
import Computer from '../apps/Computer'
import Games from '../apps/games/Games'
import Klondike from '../apps/games/Klondike'
import Spider from '../apps/games/Spider'
import FreeCell from '../apps/games/FreeCell'
import Minesweeper from '../apps/games/Minesweeper'
import BubbleBeat from '../apps/games/BubbleBeat'
import Chess from '../apps/games/chess/Chess'
import Guestbook from '../apps/Guestbook'
import FishPainter from '../apps/FishPainter'
import PaintApp from '../apps/Paint'
import Explorer from '../apps/Explorer'
import { Calculator, Notepad, StickyNotes } from '../apps/Accessories'
import Ipod from '../apps/Ipod'
import TerminalApp from '../apps/Terminal'
import SynthApp from '../apps/Synth'
import ContactsApp from '../apps/Contacts'
import AvatarMaker from '../apps/AvatarMaker'
import PhotoBooth from '../apps/PhotoBooth'
import WordPad from '../apps/WordPad'
import Snipping from '../apps/Snipping'
import MediaPlayer from '../apps/MediaPlayer'
import AsciiStudio from '../apps/AsciiStudio'
import Sketchpad from '../apps/Sketchpad'
import { byslug } from '../content/projects'

export interface AppDef {
  id: string
  title: string
  icon: IconName
  blurb: string
  w: number
  h: number
  minW?: number
  minH?: number
  resizable?: boolean
  flush?: boolean
  multi?: boolean
  Component: ComponentType<{ winId: string; params?: Record<string, unknown> }>
}

export const APPS: AppDef[] = [
  {
    id: 'finder',
    title: 'Projects',
    icon: 'folderProjects',
    blurb: 'Browse the work',
    w: 880,
    h: 570,
    minW: 520,
    minH: 380,
    Component: Finder,
  },
  {
    id: 'project',
    title: 'Project',
    icon: 'folder',
    blurb: 'A project document',
    w: 640,
    h: 560,
    minW: 400,
    minH: 340,
    multi: true,
    Component: ProjectDoc,
  },
  {
    id: 'aquarium',
    title: 'Aquarium',
    icon: 'aquarium',
    blurb: 'Seven residents, no upkeep',
    w: 760,
    h: 500,
    minW: 340,
    minH: 240,
    flush: true,
    Component: Aquarium,
  },
  {
    id: 'fishpainter',
    title: 'Draw a fish',
    icon: 'aquarium',
    blurb: 'Add one fish to the tank',
    w: 620,
    h: 560,
    minW: 520,
    minH: 500,
    Component: FishPainter,
  },
  {
    id: 'control',
    title: 'Control Panel',
    icon: 'control',
    blurb: 'Theme, sound and motion',
    w: 720,
    h: 500,
    minW: 480,
    minH: 340,
    Component: ControlPanel,
  },
  {
    id: 'paint',
    title: 'Paint',
    icon: 'paint',
    blurb: 'Brushes, shapes and patterns',
    w: 980,
    h: 700,
    minW: 620,
    minH: 460,
    Component: PaintApp,
  },
  {
    id: 'explorer',
    title: 'Internet Explorer',
    icon: 'explorer',
    blurb: 'Browse the web, and the old one',
    w: 940,
    h: 660,
    minW: 520,
    minH: 400,
    Component: Explorer,
  },
  {
    id: 'ipod',
    title: 'iPod',
    icon: 'ipod',
    blurb: 'Music, and yours if you add it',
    w: 320,
    h: 560,
    minW: 300,
    minH: 520,
    resizable: false,
    Component: Ipod,
  },
  {
    id: 'synth',
    title: 'Synth',
    icon: 'synth',
    blurb: 'Two octaves, playable',
    w: 780,
    h: 540,
    minW: 560,
    minH: 440,
    Component: SynthApp,
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: 'terminal',
    blurb: 'A small shell over this machine',
    w: 700,
    h: 460,
    minW: 380,
    minH: 260,
    Component: TerminalApp,
  },
  {
    id: 'contacts',
    title: 'Contacts',
    icon: 'contacts',
    blurb: 'How to reach Anya',
    w: 640,
    h: 440,
    minW: 420,
    minH: 340,
    Component: ContactsApp,
  },
  {
    id: 'avatar',
    title: 'Change Picture',
    icon: 'user',
    blurb: 'Make your sign-in avatar',
    w: 760,
    h: 560,
    minW: 560,
    minH: 460,
    Component: AvatarMaker,
  },
  {
    id: 'chess',
    title: 'Chess',
    icon: 'games',
    blurb: 'Full rules, four strengths',
    w: 860,
    h: 660,
    minW: 520,
    minH: 460,
    Component: Chess,
  },
  {
    id: 'bubblebeat',
    title: 'Bubble Beat',
    icon: 'arcade',
    blurb: 'Catch the notes, hear the tune',
    w: 720,
    h: 640,
    minW: 460,
    minH: 480,
    Component: BubbleBeat,
  },
  {
    id: 'ascii',
    title: 'ASCII Studio',
    icon: 'ascii',
    blurb: 'Draw in characters, then make them move',
    w: 900,
    h: 660,
    minW: 620,
    minH: 480,
    Component: AsciiStudio,
  },
  {
    id: 'sketchpad',
    title: 'Draw Music',
    icon: 'sketchpad',
    blurb: 'Draw a line and hear it play',
    w: 860,
    h: 600,
    minW: 560,
    minH: 440,
    Component: Sketchpad,
  },
  {
    id: 'photobooth',
    title: 'Photo Booth',
    icon: 'camera',
    blurb: 'Camera, filters, nothing uploaded',
    w: 620,
    h: 700,
    minW: 460,
    minH: 520,
    Component: PhotoBooth,
  },
  {
    id: 'wordpad',
    title: 'WordPad',
    icon: 'wordpad',
    blurb: 'Text, but with formatting',
    w: 820,
    h: 620,
    minW: 520,
    minH: 400,
    Component: WordPad,
  },
  {
    id: 'wmp',
    title: 'Windows Media Player',
    icon: 'wmp',
    blurb: 'Music, with the visualiser',
    w: 780,
    h: 620,
    minW: 520,
    minH: 460,
    Component: MediaPlayer,
  },
  {
    id: 'snip',
    title: 'Snipping Tool',
    icon: 'snip',
    blurb: 'Grab a piece of the screen',
    w: 620,
    h: 480,
    minW: 380,
    minH: 300,
    Component: Snipping,
  },
  {
    id: 'notepad',
    title: 'Notepad',
    icon: 'notepad',
    blurb: 'Plain text, nothing else',
    w: 560,
    h: 440,
    minW: 300,
    minH: 220,
    Component: Notepad,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: 'calculator',
    blurb: 'Standard and scientific',
    w: 320,
    h: 470,
    minW: 280,
    minH: 420,
    resizable: false,
    Component: Calculator,
  },
  {
    id: 'stickynotes',
    title: 'Sticky Notes',
    icon: 'sticky',
    blurb: 'Notes that stay put',
    w: 520,
    h: 420,
    minW: 300,
    minH: 260,
    Component: StickyNotes,
  },
  {
    id: 'games',
    title: 'Games',
    icon: 'games',
    blurb: 'Solitaire, Spider, FreeCell, Minesweeper',
    w: 560,
    h: 400,
    minW: 340,
    minH: 260,
    Component: Games,
  },
  {
    id: 'klondike',
    title: 'Solitaire',
    icon: 'cards',
    blurb: 'Klondike',
    w: 700,
    h: 560,
    minW: 620,
    minH: 440,
    Component: Klondike,
  },
  {
    id: 'spider',
    title: 'Spider Solitaire',
    icon: 'spider',
    blurb: 'One, two or four suits',
    w: 860,
    h: 600,
    minW: 700,
    minH: 460,
    Component: Spider,
  },
  {
    id: 'freecell',
    title: 'FreeCell',
    icon: 'freecell',
    blurb: 'Eight columns, four cells',
    w: 720,
    h: 580,
    minW: 640,
    minH: 460,
    Component: FreeCell,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    icon: 'mine',
    blurb: 'Beginner to expert',
    w: 420,
    h: 460,
    minW: 300,
    minH: 300,
    Component: Minesweeper,
  },
  {
    id: 'guestbook',
    title: 'Leave a note',
    icon: 'guestbook',
    blurb: 'Send a note to Anya',
    w: 460,
    h: 500,
    minW: 360,
    minH: 420,
    resizable: false,
    Component: Guestbook,
  },
  {
    id: 'computer',
    title: 'Computer',
    icon: 'computer',
    blurb: 'Drives and system',
    w: 620,
    h: 470,
    minW: 420,
    minH: 320,
    Component: Computer,
  },
]

const index = new Map(APPS.map((a) => [a.id, a]))
export const getApp = (id: string) => index.get(id)

/** Open an app window, resolving per-instance titles and dedupe rules. */
export function launch(appId: string, params?: Record<string, unknown>) {
  const app = getApp(appId)
  if (!app) return
  const store = useOS.getState()

  if (appId === 'project') {
    const slug = String(params?.slug ?? '')
    const project = byslug(slug)
    if (!project) return
    const already = store.wins.find((w) => w.appId === 'project' && w.props?.slug === slug)
    if (already) {
      store.focus(already.id)
      return already.id
    }
    return store.open({
      appId,
      title: project.name,
      icon: project.featured ? 'folderProjects' : 'folder',
      w: app.w,
      h: app.h,
      minW: app.minW,
      minH: app.minH,
      multi: true,
      props: { slug },
    })
  }

  return store.open({
    appId,
    title: app.title,
    icon: app.icon,
    w: app.w,
    h: app.h,
    minW: app.minW,
    minH: app.minH,
    resizable: app.resizable,
    flush: app.flush,
    multi: app.multi,
    props: params,
  })
}
