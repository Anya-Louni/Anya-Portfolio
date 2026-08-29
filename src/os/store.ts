import { create } from 'zustand'
import type { IconName } from '../ui/Icon'
import { sound } from './sound'
import { noteApp, startVisit } from '../lib/visits'

export type Phase = 'boot' | 'login' | 'desktop'
export type SnapZone = 'left' | 'right' | 'top' | null
export type ThemeName = 'aero' | 'night'
export type SkinName = 'seven' | 'luna'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface WinInstance extends Rect {
  id: string
  appId: string
  title: string
  icon: IconName
  z: number
  minimized: boolean
  maximized: boolean
  closing: boolean
  entering: boolean
  minW: number
  minH: number
  resizable: boolean
  flush: boolean
  /** maximised by the viewport being narrow, not by the visitor */
  autoMax: boolean
  props?: Record<string, unknown>
}

export interface OpenSpec {
  appId: string
  title: string
  icon: IconName
  w: number
  h: number
  minW?: number
  minH?: number
  resizable?: boolean
  flush?: boolean
  multi?: boolean
  props?: Record<string, unknown>
}

export type IconSize = 'large' | 'medium' | 'small'

export interface MenuItem {
  id: string
  label?: string
  divider?: boolean
  disabled?: boolean
  checked?: boolean
  bold?: boolean
  icon?: IconName
  submenu?: MenuItem[]
  run?: () => void
}

export interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

export interface Toast {
  id: number
  title: string
  body?: string
  icon: IconName
}

interface OSState {
  phase: Phase
  userName: string
  theme: ThemeName
  skin: SkinName
  /** null means whatever picture the current theme brings with it */
  wallpaper: string | null
  soundOn: boolean
  wins: WinInstance[]
  topZ: number
  activeId: string | null
  selected: string[]
  iconSize: IconSize
  menu: MenuState | null
  switcher: number | null
  startOpen: boolean
  peeking: boolean
  toasts: Toast[]

  setPhase: (p: Phase) => void
  signIn: (name: string) => void
  signOut: () => void
  setTheme: (t: ThemeName) => void
  setSkin: (s: SkinName) => void
  setWallpaper: (w: string | null) => void
  setSound: (on: boolean) => void

  open: (spec: OpenSpec) => string
  close: (id: string) => void
  reap: (id: string) => void
  settle: (id: string) => void
  focus: (id: string) => void
  minimize: (id: string) => void
  toggleMax: (id: string, viewport: Rect) => void
  setRect: (id: string, r: Partial<Rect>) => void
  snapTo: (id: string, zone: Exclude<SnapZone, null>, viewport: Rect) => void
  restoreIfMax: (id: string, pointerX: number) => void
  reflow: () => void

  setSelected: (ids: string[]) => void
  setIconSize: (s: IconSize) => void
  openMenu: (x: number, y: number, items: MenuItem[]) => void
  closeMenu: () => void
  openSwitcher: () => void
  cycleSwitcher: (dir: number) => void
  commitSwitcher: () => void
  setStartOpen: (v: boolean) => void
  setPeeking: (v: boolean) => void
  minimizeAll: () => void

  pushToast: (t: Omit<Toast, 'id'>) => void
  dropToast: (id: number) => void
}

const CASCADE = 28
/** at or below this width the OS goes near-fullscreen per window; the
    stylesheet's phone breakpoint is the same number */
const COMPACT = 768
let seq = 0

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode, the OS just forgets */
  }
}

export const useOS = create<OSState>((set, get) => ({
  phase: 'boot',
  userName: readLS('os.user', ''),
  theme: readLS<ThemeName>('os.theme', 'aero'),
  skin: readLS<SkinName>('os.skin', 'seven'),
  wallpaper: readLS<string | null>('os.wallpaper', null),
  soundOn: readLS('os.sound', true),
  wins: [],
  topZ: 10,
  activeId: null,
  selected: [],
  iconSize: readLS<IconSize>('os.iconSize', 'large'),
  menu: null,
  switcher: null,
  startOpen: false,
  peeking: false,
  toasts: [],

  setPhase: (phase) => set({ phase }),

  signIn: (name) => {
    const clean = name.trim().slice(0, 24)
    writeLS('os.user', clean)
    set({ userName: clean, phase: 'desktop' })
    startVisit()
  },

  signOut: () => set({ phase: 'login', wins: [], activeId: null, startOpen: false }),

  setTheme: (theme) => {
    writeLS('os.theme', theme)
    document.documentElement.dataset.theme = theme
    set({ theme })
  },

  /* Kept apart from the theme on purpose. A theme carries a picture, but
     picking a picture should not drag a whole window colour with it, which
     is exactly how Windows 7 separates the two. */
  setWallpaper: (wallpaper) => {
    writeLS('os.wallpaper', wallpaper)
    set({ wallpaper })
  },

  setSkin: (skin) => {
    writeLS('os.skin', skin)
    document.documentElement.dataset.skin = skin
    set({ skin })
  },

  setSound: (soundOn) => {
    writeLS('os.sound', soundOn)
    sound.setEnabled(soundOn)
    set({ soundOn })
  },

  open: (spec) => {
    noteApp(spec.appId)
    const { wins, topZ } = get()
    if (!spec.multi) {
      const existing = wins.find((w) => w.appId === spec.appId)
      if (existing) {
        set({
          wins: wins.map((w) =>
            w.id === existing.id ? { ...w, minimized: false, z: topZ + 1 } : w,
          ),
          topZ: topZ + 1,
          activeId: existing.id,
          startOpen: false,
        })
        sound.click(1.15)
        return existing.id
      }
    }

    const vp = viewport()
    const vw = vp.w
    const vh = vp.h
    const compact = vw <= COMPACT
    const w = compact ? Math.min(vw - 16, spec.w) : Math.min(spec.w, vw - 80)
    const h = compact ? Math.min(vh - 16, spec.h) : Math.min(spec.h, vh - 60)
    const n = wins.length
    const x = compact ? Math.round((vw - w) / 2) : Math.round((vw - w) / 2 + ((n % 5) - 2) * CASCADE)
    const y = compact ? 8 : Math.round((vh - h) / 2 - 14 + ((n % 5) - 2) * (CASCADE * 0.6))

    const id = `w${++seq}`
    const win: WinInstance = {
      id,
      appId: spec.appId,
      title: spec.title,
      icon: spec.icon,
      x: Math.max(6, x),
      y: Math.max(6, y),
      w,
      h,
      z: topZ + 1,
      minimized: false,
      maximized: compact,
      closing: false,
      entering: true,
      minW: spec.minW ?? 320,
      minH: spec.minH ?? 220,
      resizable: spec.resizable ?? true,
      flush: spec.flush ?? false,
      autoMax: compact,
      props: spec.props,
    }
    if (compact) {
      win.props = { ...win.props, __restore: { x: 40, y: 40, w: spec.w, h: spec.h } }
      win.x = 0
      win.y = 0
      win.w = vw
      win.h = vh
    }
    set({ wins: [...wins, win], topZ: topZ + 1, activeId: id, startOpen: false })
    sound.click(1.15)
    return id
  },

  settle: (id) =>
    set((s) => ({ wins: s.wins.map((w) => (w.id === id ? { ...w, entering: false } : w)) })),

  close: (id) => {
    sound.puff()
    set((s) => ({ wins: s.wins.map((w) => (w.id === id ? { ...w, closing: true } : w)) }))
  },

  reap: (id) =>
    set((s) => {
      const wins = s.wins.filter((w) => w.id !== id)
      const activeId =
        s.activeId === id
          ? (wins.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null)
          : s.activeId
      return { wins, activeId }
    }),

  focus: (id) =>
    set((s) => {
      if (s.activeId === id && !s.wins.find((w) => w.id === id)?.minimized) return {}
      const z = s.topZ + 1
      return {
        wins: s.wins.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
        topZ: z,
        activeId: id,
      }
    }),

  minimize: (id) => {
    sound.puff()
    set((s) => {
      const wins = s.wins.map((w) => (w.id === id ? { ...w, minimized: true } : w))
      const activeId = wins.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null
      return { wins, activeId }
    })
  },

  minimizeAll: () =>
    set((s) => ({ wins: s.wins.map((w) => ({ ...w, minimized: true })), activeId: null })),

  toggleMax: (id, viewport) => {
    sound.click(0.9)
    set((s) => ({
      wins: s.wins.map((w) => {
        if (w.id !== id || !w.resizable) return w
        if (w.maximized) {
          const r = (w.props?.__restore as Rect | undefined) ?? { x: 80, y: 60, w: 760, h: 520 }
          return { ...w, maximized: false, autoMax: false, ...r }
        }
        return {
          ...w,
          maximized: true,
          autoMax: false,
          props: { ...w.props, __restore: { x: w.x, y: w.y, w: w.w, h: w.h } },
          ...viewport,
        }
      }),
    }))
  },

  snapTo: (id, zone, viewport) => {
    sound.click(0.9)
    set((s) => ({
      wins: s.wins.map((w) => {
        if (w.id !== id) return w
        const store = w.maximized ? w.props?.__restore : { x: w.x, y: w.y, w: w.w, h: w.h }
        const base = { ...w, autoMax: false, props: { ...w.props, __restore: store } }
        if (zone === 'top') return { ...base, maximized: true, ...viewport }
        const half = Math.round(viewport.w / 2)
        return {
          ...base,
          maximized: false,
          x: zone === 'left' ? viewport.x : viewport.x + half,
          y: viewport.y,
          w: half,
          h: viewport.h,
        }
      }),
    }))
  },

  restoreIfMax: (id, pointerX) =>
    set((s) => ({
      wins: s.wins.map((w) => {
        if (w.id !== id || !w.maximized) return w
        const r = (w.props?.__restore as Rect | undefined) ?? { x: 80, y: 60, w: 760, h: 520 }
        return {
          ...w,
          maximized: false,
          autoMax: false,
          w: r.w,
          h: r.h,
          x: Math.round(pointerX - r.w / 2),
          y: 8,
        }
      }),
    })),

  setRect: (id, r) => set((s) => ({ wins: s.wins.map((w) => (w.id === id ? { ...w, ...r } : w)) })),

  /**
   * Keep every window inside the viewport when it changes size. Narrow
   * viewports take windows near-fullscreen; widening hands back the rect the
   * window had before the squeeze.
   */
  reflow: () =>
    set((s) => {
      const vp = viewport()
      const compact = vp.w <= COMPACT
      return {
        wins: s.wins.map((w) => {
          if (compact) {
            const keep = (w.props?.__restore as Rect | undefined) ?? { x: w.x, y: w.y, w: w.w, h: w.h }
            return {
              ...w,
              maximized: true,
              autoMax: true,
              props: { ...w.props, __restore: keep },
              x: vp.x,
              y: vp.y,
              w: vp.w,
              h: vp.h,
            }
          }
          if (w.autoMax) {
            const r = (w.props?.__restore as Rect | undefined) ?? { x: 60, y: 40, w: 760, h: 520 }
            const width = Math.min(r.w, vp.w - 24)
            const height = Math.min(r.h, vp.h - 24)
            return {
              ...w,
              maximized: false,
              autoMax: false,
              w: width,
              h: height,
              x: Math.round((vp.w - width) / 2),
              y: Math.max(6, Math.round((vp.h - height) / 2)),
            }
          }
          if (w.maximized) return { ...w, x: vp.x, y: vp.y, w: vp.w, h: vp.h }
          const width = Math.min(w.w, vp.w - 16)
          const height = Math.min(w.h, vp.h - 16)
          return {
            ...w,
            w: width,
            h: height,
            x: Math.min(Math.max(w.x, -width + 120), vp.w - 120),
            y: Math.min(Math.max(w.y, 0), vp.h - 40),
          }
        }),
      }
    }),

  setSelected: (selected) => set({ selected }),

  setIconSize: (iconSize) => {
    writeLS('os.iconSize', iconSize)
    set({ iconSize })
  },

  openMenu: (x, y, items) => set({ menu: { x, y, items }, startOpen: false }),
  closeMenu: () => set({ menu: null }),

  /* Alt+Tab. The list is ordered most-recently-used, like the real one. */
  openSwitcher: () =>
    set((s) => {
      if (s.switcher !== null) return {}
      const live = s.wins.filter((w) => !w.closing)
      if (live.length < 2) return {}
      return { switcher: 1 }
    }),

  cycleSwitcher: (dir) =>
    set((s) => {
      if (s.switcher === null) return {}
      const n = s.wins.filter((w) => !w.closing).length
      if (!n) return {}
      return { switcher: (s.switcher + dir + n) % n }
    }),

  commitSwitcher: () =>
    set((s) => {
      if (s.switcher === null) return { switcher: null }
      const order = s.wins.filter((w) => !w.closing).sort((a, b) => b.z - a.z)
      const target = order[s.switcher]
      if (!target) return { switcher: null }
      const z = s.topZ + 1
      return {
        switcher: null,
        topZ: z,
        activeId: target.id,
        wins: s.wins.map((w) => (w.id === target.id ? { ...w, z, minimized: false } : w)),
      }
    }),
  setStartOpen: (startOpen) => {
    if (startOpen) sound.click(0.8)
    set({ startOpen })
  },
  setPeeking: (peeking) => set({ peeking }),

  pushToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: Date.now() + Math.random() }] })),
  dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function viewport(): Rect {
  const bar =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-h')) || 46
  return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight - bar }
}
