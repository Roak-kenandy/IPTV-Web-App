import { createContext, useContext, useEffect, useLayoutEffect, useRef } from 'react'
import type React from 'react'
import type { Content, RemoteKey, Route } from './types'

const KEYMAP: Record<string, RemoteKey> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'ok',
  ' ': 'ok',
  Escape: 'back',
  Backspace: 'back',
}

const REMOTE_EVENT = 'remotekey'

/** Subscribes to remote-control style key presses (arrow keys, Enter, Esc/Backspace, phone remote). */
export function useRemote(handler: (key: RemoteKey) => void, enabled = true) {
  const ref = useRef(handler)
  useLayoutEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const key = KEYMAP[e.key]
      if (!key) return
      e.preventDefault()
      ref.current(key)
    }
    const onRemote = (e: Event) => ref.current((e as CustomEvent<RemoteKey>).detail)
    window.addEventListener('keydown', onKey)
    window.addEventListener(REMOTE_EVENT, onRemote)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(REMOTE_EVENT, onRemote)
    }
  }, [enabled])
}

/** Delivers a key from a non-keyboard source (the phone remote) to whichever screen is listening. */
export function pressKey(key: RemoteKey) {
  window.dispatchEvent(new CustomEvent(REMOTE_EVENT, { detail: key }))
}

/** Sends a remote "Back" press to whichever screen or overlay is listening. */
export function pressBack() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

/**
 * Focus-on-hover for real mice only. Touch must not change focus on "hover": iOS Safari
 * swallows the tap (treats it as hover) when a hover handler changes the page.
 * Uses actual movement rather than pointerenter, which also fires when a new screen appears
 * under a resting cursor and would steal the focus.
 */
export function hover(fn: () => void) {
  return {
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && (e.movementX !== 0 || e.movementY !== 0)) fn()
    },
  }
}

export interface AppApi {
  content: Content
  go: (route: Route) => void
  back: () => void
  home: () => void
}

export const AppContext = createContext<AppApi | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppContext missing')
  return ctx
}

export function wrap(i: number, n: number) {
  return ((i % n) + n) % n
}

export function clamp(i: number, min: number, max: number) {
  return Math.max(min, Math.min(max, i))
}
