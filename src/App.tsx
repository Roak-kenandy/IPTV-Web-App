import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AppContext, pressBack, pressKey, type AppApi } from './remote'
import { usePhoneKeys } from './phone'
import { adjustVolume, isSoundUnlocked, replayWithSound } from './sound'
import type { Content, Route } from './types'
import Welcome from './screens/Welcome'
import Home from './screens/Home'
import Tv from './screens/Tv'
import Movies from './screens/Movies'
import About from './screens/About'
import SectionScreen from './screens/Section'
import StartOverlay from './components/StartOverlay'

const STAGE_W = 1920
const STAGE_H = 1080

/**
 * `?fill=1` stretches the stage to fill the whole window, remembered on this device until `?fill=0`.
 * For mirroring a 4:3 iPad to a receiver that stretches to 16:9 (e.g. AirScreen "Full screen"):
 * the iPad shows the stage squeezed, and the TV shows it undistorted with no black bars.
 */
const FILL = (() => {
  const param = new URLSearchParams(window.location.search).get('fill')
  try {
    if (param === '1') localStorage.setItem('stage-fill', '1')
    if (param === '0') localStorage.removeItem('stage-fill')
    return localStorage.getItem('stage-fill') === '1'
  } catch {
    return param === '1'
  }
})()

function useStageScale() {
  const [scale, setScale] = useState({ x: 1, y: 1 })
  useLayoutEffect(() => {
    const update = () => {
      const x = window.innerWidth / STAGE_W
      const y = window.innerHeight / STAGE_H
      setScale(FILL ? { x, y } : { x: Math.min(x, y), y: Math.min(x, y) })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}

/** Deep links such as #home, #tv, #movies, #about or #section/accommodation open a screen directly. */
function initialStack(): Route[] {
  const [name, id] = window.location.hash.replace(/^#\/?/, '').split('/')
  const base: Route[] = [{ name: 'welcome' }]
  if (name === 'home') return [...base, { name: 'home' }]
  if (name === 'tv' || name === 'movies' || name === 'about') return [...base, { name: 'home' }, { name }]
  if (name === 'section' && id) return [...base, { name: 'home' }, { name: 'section', id }]
  return base
}

/** True while the guest is using a mouse or touch; a key press switches back to remote mode. */
function usePointerMode() {
  const [pointer, setPointer] = useState(false)
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.type === 'pointermove' && e.movementX === 0 && e.movementY === 0) return
      setPointer(true)
      if (e.type === 'pointerdown' && e.button === 3) {
        e.preventDefault()
        pressBack()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.isTrusted) setPointer(false)
    }
    // A clicked button keeps DOM focus; without this, Space/Enter would also "click" it natively.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') e.preventDefault()
    }
    // Native image drag would cancel swipe/drag scrolling with the mouse.
    const onDragStart = (e: DragEvent) => e.preventDefault()
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('pointermove', onPointer)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('dragstart', onDragStart)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('dragstart', onDragStart)
    }
  }, [])
  return pointer
}

export default function App() {
  const [content, setContent] = useState<Content | null>(null)
  const [stack, setStack] = useState<Route[]>(initialStack)
  const scale = useStageScale()
  const pointer = usePointerMode()

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}content.json`)
      .then((r) => r.json())
      .then((c: Content) => {
        if (!cancelled) setContent(c)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const go = useCallback((route: Route) => setStack((s) => [...s, route]), [])
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), [])
  const home = useCallback(() => setStack([{ name: 'welcome' }, { name: 'home' }]), [])

  const [started, setStarted] = useState(isSoundUnlocked)
  const start = useCallback(() => {
    replayWithSound()
    setStarted(true)
  }, [])

  const [osd, setOsd] = useState<{ volume: number; muted: boolean } | null>(null)
  const osdTimer = useRef<number | undefined>(undefined)

  usePhoneKeys((key) => {
    if (!started) return start()
    switch (key) {
      case 'home':
      case 'menu':
        return home()
      case 'power':
        return setStack([{ name: 'welcome' }])
      case 'volup':
      case 'voldown':
      case 'mute':
        setOsd(adjustVolume(key === 'volup' ? 1 : key === 'voldown' ? -1 : 0))
        clearTimeout(osdTimer.current)
        osdTimer.current = window.setTimeout(() => setOsd(null), 2000)
        return
      default:
        pressKey(key)
    }
  })

  const api = useMemo<AppApi | null>(() => (content ? { content, go, back, home } : null), [content, go, back, home])

  const top = stack[stack.length - 1]
  const route: Route = top.name === 'section' && content && !content.sections[top.id] ? { name: 'home' } : top
  const themeVars = useMemo(() => {
    if (!content) return {}
    const t = content.theme
    return {
      '--primary': t.primaryColor,
      '--focus-fill': t.focusButtonFillColor,
      '--focus-outline': t.focusButtonOutlineColor,
      '--text': t.primaryTextColor,
      '--text-2': t.secondaryTextColor,
      '--bg-2': t.secondaryBackgroundColor,
    } as React.CSSProperties
  }, [content])

  return (
    <div className="viewport">
      <div
        className="stage"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale.x}, ${scale.y})`, ...themeVars }}
      >
        {api && (
          <AppContext.Provider value={api}>
            {route.name === 'welcome' && <Welcome />}
            {route.name === 'home' && <Home />}
            {route.name === 'tv' && <Tv />}
            {route.name === 'movies' && <Movies />}
            {route.name === 'about' && <About />}
            {route.name === 'section' && <SectionScreen key={route.id} id={route.id} />}
          </AppContext.Provider>
        )}
        {api && pointer && route.name !== 'welcome' && (
          <button className="backbtn" onClick={pressBack} aria-label="Back">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
        )}
        {osd && (
          <div className="osd">
            <span>{osd.muted ? 'Muted' : 'Volume'}</span>
            <div className="osd__bar">
              <i style={{ width: `${osd.muted ? 0 : osd.volume * 10}%` }} />
            </div>
            <b>{osd.muted ? '' : osd.volume}</b>
          </div>
        )}
        {content && <StartOverlay logo={content.logo} open={!started} onStart={start} />}
      </div>
      <div className="rotate-hint">Rotate your device to landscape for the best view</div>
    </div>
  )
}
