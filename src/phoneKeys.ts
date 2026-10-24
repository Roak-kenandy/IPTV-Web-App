/** Phone remote protocol, shared by the TV app and the phone remote page (remote.html). */
export const PHONE_KEYS = [
  'up',
  'down',
  'left',
  'right',
  'ok',
  'back',
  'home',
  'menu',
  'power',
  'chup',
  'chdown',
  'volup',
  'voldown',
  'mute',
] as const

export type PhoneKey = (typeof PHONE_KEYS)[number]

export interface PhoneMessage {
  key: PhoneKey
}

export function isPhoneMessage(data: unknown): data is PhoneMessage {
  return typeof data === 'object' && data !== null && PHONE_KEYS.includes((data as PhoneMessage).key)
}

/**
 * The TV and the phone talk through free public MQTT brokers over secure WebSockets, so they work
 * on any two networks (a direct phone-to-TV WebRTC link fails across most mobile/hotel networks).
 * Both sides connect to every broker, so the remote keeps working if one broker is down.
 */
export const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt']

/**
 * Topics for one TV:
 * - `tv`: retained "1" while the TV is online, cleared ("") when it goes away.
 * - `keys`: button presses from phones, JSON `{key}`.
 * - `phone/<phoneId>`: retained "1" while that phone's remote page is open.
 */
export function topics(tvId: string) {
  const root = `boutique-hotels-tv/${tvId}`
  return {
    tv: `${root}/tv`,
    keys: `${root}/keys`,
    phones: `${root}/phone/+`,
    phone: (phoneId: string) => `${root}/phone/${phoneId}`,
    phonePrefix: `${root}/phone/`,
  }
}

export function randomId(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('')
}

/** Keep MQTT keepalive short so a closed TV/phone is noticed (via its last will) within ~30 s. */
export const KEEPALIVE_SEC = 20
