import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import { BROKERS, KEEPALIVE_SEC, randomId, topics, type PhoneKey, type PhoneMessage } from '../phoneKeys'

const REPEAT_DELAY_MS = 450
const REPEAT_EVERY_MS = 120
/** How long to wait for the TV's retained "online" flag after reaching a broker. */
const TV_LOOKUP_MS = 4000

type Status = 'connecting' | 'connected' | 'lost' | 'missing'

interface Link {
  client: MqttClient
  /** Broker reached and the TV's online flag had time to arrive. */
  checked: boolean
  tvOnline: boolean
}

/**
 * Sends button presses to the TV whose pairing id is in the URL (?id=...). The MQTT clients
 * reconnect by themselves. Each press is published on one broker only, so the TV (which listens on
 * all of them) receives it once.
 */
function useRemoteKeys(tvId: string | null) {
  const [status, setStatus] = useState<Status>(tvId ? 'connecting' : 'missing')
  const links = useRef<Link[]>([])

  useEffect(() => {
    if (!tvId) return
    const t = topics(tvId)
    const phoneTopic = t.phone(randomId(8))
    const timers: number[] = []

    const update = () => {
      const all = links.current
      setStatus(all.some((l) => l.tvOnline) ? 'connected' : all.some((l) => l.checked) ? 'lost' : 'connecting')
    }

    links.current = BROKERS.map((url) => {
      const client = mqtt.connect(url, {
        keepalive: KEEPALIVE_SEC,
        reconnectPeriod: 2000,
        connectTimeout: 10_000,
        will: { topic: phoneTopic, payload: '', retain: true, qos: 1 },
      })
      const link: Link = { client, checked: false, tvOnline: false }
      client.on('connect', () => {
        client.subscribe(t.tv)
        client.publish(phoneTopic, '1', { retain: true, qos: 1 })
        timers.push(
          window.setTimeout(() => {
            link.checked = client.connected
            update()
          }, TV_LOOKUP_MS),
        )
      })
      client.on('message', (topic, payload) => {
        if (topic !== t.tv) return
        link.tvOnline = payload.toString() === '1'
        update()
      })
      client.on('close', () => {
        link.checked = false
        link.tvOnline = false
        update()
      })
      return link
    })

    // Phones suspend pages in the background; reconnect as soon as the page is visible again.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      links.current.forEach(({ client }) => !client.connected && client.reconnect())
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      timers.forEach(clearTimeout)
      document.removeEventListener('visibilitychange', onVisible)
      links.current.forEach(({ client }) => {
        if (client.connected) client.publish(phoneTopic, '', { retain: true })
        client.end()
      })
      links.current = []
    }
  }, [tvId])

  const send = (key: PhoneKey) => {
    const link = links.current.find((l) => l.tvOnline && l.client.connected)
    if (!link || !tvId) return
    link.client.publish(topics(tvId).keys, JSON.stringify({ key } satisfies PhoneMessage))
    navigator.vibrate?.(12)
  }

  return { status, send }
}

function Key({
  k,
  send,
  repeat = false,
  className,
  label,
  children,
}: {
  k: PhoneKey
  send: (key: PhoneKey) => void
  repeat?: boolean
  className: string
  label: string
  children: React.ReactNode
}) {
  const timer = useRef<number | undefined>(undefined)
  const stop = () => {
    clearTimeout(timer.current)
    clearInterval(timer.current)
  }
  return (
    <button
      className={`key ${className}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        send(k)
        if (repeat) timer.current = window.setTimeout(() => (timer.current = window.setInterval(() => send(k), REPEAT_EVERY_MS)), REPEAT_DELAY_MS)
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

const Icon = ({ d, size = 26 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const STATUS_TEXT: Record<Status, string> = {
  connecting: 'Connecting to the TV…',
  connected: 'Connected',
  lost: 'TV not found – is the demo open on the screen?',
  missing: 'Scan the QR code on the TV screen to connect',
}

export default function RemoteApp() {
  const [tvId] = useState(() => new URLSearchParams(window.location.search).get('id'))
  const { status, send } = useRemoteKeys(tvId)
  const off = status !== 'connected'

  return (
    <div className="page">
      <div className={`status status--${status}`}>
        <i />
        {STATUS_TEXT[status]}
      </div>

      <div className={`remote ${off ? 'is-off' : ''}`}>
        <div className="row row--top">
          <Key k="power" send={send} className="key--round key--power" label="Power">
            <Icon d="M12 3v8M6.6 6.6a8 8 0 1 0 10.8 0" />
          </Key>
          <Key k="menu" send={send} className="key--round key--small" label="Menu">
            <Icon d="M5 7h14M5 12h14M5 17h14" size={22} />
          </Key>
        </div>

        <div className="dpad">
          <Key k="up" send={send} repeat className="dpad__btn dpad__up" label="Up">
            <span className="tri tri--up" />
          </Key>
          <Key k="left" send={send} repeat className="dpad__btn dpad__left" label="Left">
            <span className="tri tri--left" />
          </Key>
          <Key k="right" send={send} repeat className="dpad__btn dpad__right" label="Right">
            <span className="tri tri--right" />
          </Key>
          <Key k="down" send={send} repeat className="dpad__btn dpad__down" label="Down">
            <span className="tri tri--down" />
          </Key>
          <Key k="ok" send={send} className="dpad__ok" label="OK">
            <b>OK</b>
            <small>▶/❚❚</small>
          </Key>
        </div>

        <div className="row">
          <Key k="back" send={send} className="key--round" label="Back">
            <Icon d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" size={22} />
            <small>Back</small>
          </Key>
          <Key k="home" send={send} className="key--round key--home" label="Home">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
              <path d="M12 3 2 12h3v9h5v-6h4v6h5v-9h3z" />
            </svg>
          </Key>
          <Key k="mute" send={send} className="key--round" label="Mute">
            <Icon d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" size={22} />
          </Key>
        </div>

        <div className="row">
          <Key k="voldown" send={send} repeat className="key--round" label="Volume down">
            <Icon d="M11 5 6 9H2v6h4l5 4zM15 12h6" size={22} />
          </Key>
          <span className="row__gap" />
          <Key k="volup" send={send} repeat className="key--round" label="Volume up">
            <Icon d="M11 5 6 9H2v6h4l5 4zM15 12h6M18 9v6" size={22} />
          </Key>
        </div>

        <div className="channels">
          <Key k="chup" send={send} className="key--pill" label="Channel up">
            CH+
          </Key>
          <Key k="chdown" send={send} className="key--pill" label="Channel down">
            CH−
          </Key>
        </div>

        <img className="brand" src="assets/img/mvision-m.png" alt="mVision" />
      </div>
    </div>
  )
}
