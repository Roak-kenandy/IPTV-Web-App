import { useEffect } from 'react'
import PhonePair from './PhonePair'

/**
 * Browsers block video sound until the visitor interacts with the page. On a fresh load this
 * asks for one tap / key press; `onStart` then restarts the current video with sound.
 */
export default function StartOverlay({ logo, open, onStart }: { logo: string; open: boolean; onStart: () => void }) {
  useEffect(() => {
    if (!open) return
    // Capture phase: the key only starts the app, it must not also reach the screen behind.
    const onKey = (e: KeyboardEvent) => {
      if (!e.isTrusted) return
      e.preventDefault()
      e.stopImmediatePropagation()
      onStart()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  if (!open) return null
  return (
    <div className="start" onClick={onStart}>
      <img className="start__logo" src={logo} alt="" />
      <div className="start__btn">Tap anywhere to start</div>
      <div className="start__hint">or press OK on the remote / Enter on the keyboard</div>
      <PhonePair />
    </div>
  )
}
