import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/hanken-grotesk'
import '@fontsource-variable/fredoka'
import '@fontsource-variable/azeret-mono'
import './styles/vendor.css'

import './styles/tokens.css'
import './styles/base.css'
import './styles/aero.css'
import './styles/wallpaper.css'
import './styles/os.css'
import './styles/boot.css'
import './styles/apps.css'
import './styles/games.css'
import './styles/notes.css'
import './styles/accessories.css'
import './styles/media.css'
import './styles/skin-luna.css'
import './styles/mobile.css'

import App from './App'
import { Pinboard } from './owner/Pinboard'

/* /notes (or #/notes) is the owner's private inbox; everything else is the OS. */
const path = window.location.pathname.replace(/\/+$/, '')
const isOwnerRoute = path === '/notes' || window.location.hash === '#/notes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isOwnerRoute ? <Pinboard /> : <App />}</StrictMode>,
)
