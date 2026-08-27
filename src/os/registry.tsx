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
import Guestbook from '../apps/Guestbook'
import FishPainter from '../apps/FishPainter'
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
