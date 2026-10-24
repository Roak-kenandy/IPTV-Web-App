import { useEffect, useRef, useSyncExternalStore } from 'react'
import mqtt from 'mqtt'
import { BROKERS, isPhoneMessage, KEEPALIVE_SEC, randomId, topics, type PhoneKey } from './phoneKeys'

/**
 * "Phone as remote", TV side: the TV keeps a stable pairing id and shows it as a QR code; the phone
 * page (remote.html) sends button presses to that id through the brokers in `phoneKeys.ts`.
 */
const ID_STORAGE = 'phone-remote-pair'

interface State {
  id: string | null
  phones: number
}

let state: State = { id: null, phones: 0 }
const subscribers = new Set<() => void>()
const keyListeners = new Set<(key: PhoneKey) => void>()

function setState(next: Partial<State>) {
  state = { ...state, ...next }
  subscribers.forEach((fn) => fn())
}

function storedId() {
  let id = localStorage.getItem(ID_STORAGE)
  if (!id) {
    id = randomId(10)
    localStorage.setItem(ID_STORAGE, id)
  }
  return id
}

let started = false

function start() {
  if (started) return
  started = true
  const id = storedId()
  const t = topics(id)
  /** Phones seen on each broker; a phone may show up on more than one. */
  const seen = BROKERS.map(() => new Set<string>())
  const recount = () => setState({ phones: new Set(seen.flatMap((s) => [...s])).size })

  const clients = BROKERS.map((url, i) => {
    const client = mqtt.connect(url, {
      keepalive: KEEPALIVE_SEC,
      reconnectPeriod: 3000,
      connectTimeout: 10_000,
      will: { topic: t.tv, payload: '', retain: true, qos: 1 },
    })
    client.on('connect', () => {
      seen[i].clear()
      client.subscribe([t.keys, t.phones])
      client.publish(t.tv, '1', { retain: true, qos: 1 })
    })
    client.on('message', (topic, payload) => {
      if (topic === t.keys) {
        let data: unknown
        try {
          data = JSON.parse(payload.toString())
        } catch {
          return
        }
        if (isPhoneMessage(data)) keyListeners.forEach((fn) => fn(data.key))
      } else if (topic.startsWith(t.phonePrefix)) {
        const phoneId = topic.slice(t.phonePrefix.length)
        if (payload.length) seen[i].add(phoneId)
        else seen[i].delete(phoneId)
        recount()
      }
    })
    return client
  })

  const announce = (online: boolean) =>
    clients.forEach((c) => c.connected && c.publish(t.tv, online ? '1' : '', { retain: true, qos: 1 }))
  window.addEventListener('pagehide', () => announce(false))
  window.addEventListener('pageshow', () => announce(true))
  setState({ id })
}

function subscribe(fn: () => void) {
  start()
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

/** The pairing id and how many phones currently have the remote open. */
export function usePhoneRemoteState() {
  return useSyncExternalStore(subscribe, () => state)
}

/** Calls `handler` for every button pressed on a paired phone. */
export function usePhoneKeys(handler: (key: PhoneKey) => void) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    start()
    const fn = (key: PhoneKey) => ref.current(key)
    keyListeners.add(fn)
    return () => {
      keyListeners.delete(fn)
    }
  }, [])
}

/** URL of the phone remote page for a pairing id (the QR code content). */
export function remoteUrl(id: string) {
  return new URL(`remote.html?id=${encodeURIComponent(id)}`, window.location.href).href
}
