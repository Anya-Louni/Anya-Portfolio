import { useEffect } from 'react'
import { useOS } from './os/store'
import { Wallpaper } from './art/Wallpaper'
import { Desktop } from './os/Desktop'
import { Taskbar } from './os/Taskbar'
import { Win } from './os/Win'
import { BootScreen } from './boot/BootScreen'
import { LoginScreen } from './boot/LoginScreen'
import { Toasts } from './ui/Toasts'
import { ContextMenu } from './os/ContextMenu'
import { Switcher } from './os/Switcher'
import { IconDefs } from './ui/Icon'
import { sound } from './os/sound'

export default function App() {
  const phase = useOS((s) => s.phase)
  const setPhase = useOS((s) => s.setPhase)
  const theme = useOS((s) => s.theme)
  const skin = useOS((s) => s.skin)
  const soundOn = useOS((s) => s.soundOn)
  const wins = useOS((s) => s.wins)
  const peeking = useOS((s) => s.peeking)
  const reflow = useOS((s) => s.reflow)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.skin = skin
  }, [skin])

  useEffect(() => {
    sound.setEnabled(soundOn)
  }, [soundOn])

  /* keep open windows inside the viewport when it changes size */
  useEffect(() => {
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = window.setTimeout(reflow, 90)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(t)
    }
  }, [reflow])

  return (
    <div className="os">
      <IconDefs />

      {phase === 'desktop' ? (
        <>
          <Wallpaper />
          <div className="os__stage" data-peeking={peeking}>
            <Desktop />
            {wins.map((w) => (
              <Win key={w.id} win={w} />
            ))}
          </div>
          <Taskbar />
          <Toasts />
          <Switcher />
          <ContextMenu />
        </>
      ) : null}

      {phase === 'login' ? <LoginScreen /> : null}
      {phase === 'boot' ? <BootScreen onDone={() => setPhase('login')} /> : null}
    </div>
  )
}
