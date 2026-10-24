/**
 * One shared <video> element for the whole app, moved into whichever screen is showing a video.
 *
 * Browsers only allow sound after the guest interacts with the page, and iOS grants that per
 * element: a fresh element per screen would come up muted again. Reusing one element keeps sound
 * once it has been unlocked, and guarantees a single audio source (nothing keeps playing off-screen).
 */
/**
 * Keeps media on the page while the device is screen-mirrored. Otherwise iOS/iPadOS hands a playing
 * video to the AirPlay receiver on its own: the TV shows just the video instead of the whole app.
 */
function keepOnPage(media: HTMLMediaElement) {
  media.disableRemotePlayback = true
  media.setAttribute('x-webkit-airplay', 'deny')
}

const player = document.createElement('video')
player.className = 'player'
player.loop = true
player.playsInline = true
player.preload = 'auto'
player.setAttribute('playsinline', '')
player.setAttribute('webkit-playsinline', '')
keepOnPage(player)
player.addEventListener('playing', () => player.classList.add('is-ready'))

let owner: HTMLElement | null = null
let unlocked = false
let attempt = 0
/** Paused by the guest (movie player); nothing may resume playback until they unpause. */
let userPaused = false

/** Background music for screens without video. Never plays at the same time as the video player. */
const MUSIC_LEVEL = 0.5
const music = new Audio()
music.loop = true
music.volume = MUSIC_LEVEL
keepOnPage(music)
let musicOn = false

/** Guest volume (0–10) and mute, from the phone remote. Applies to both the video and the music. */
let volume = 10
let userMuted = false

function applyVolume() {
  player.volume = volume / 10
  player.muted = !unlocked || userMuted
  music.volume = MUSIC_LEVEL * (volume / 10)
  music.muted = userMuted
}

/** Changes the volume by `step` (or toggles mute when step is 0) and returns the new level for an on-screen display. */
export function adjustVolume(step: number) {
  if (step === 0) userMuted = !userMuted
  else {
    volume = Math.max(0, Math.min(10, volume + step))
    userMuted = false
  }
  applyVolume()
  return { volume, muted: userMuted }
}

function startMusic() {
  if (!musicOn || !unlocked || document.hidden) return
  music.play().catch(() => {})
}

function start() {
  if (!owner || document.hidden || userPaused) return
  const id = ++attempt
  player.muted = !unlocked || userMuted
  player.play().catch((err: DOMException) => {
    // AbortError just means a newer src/play superseded this one.
    if (id !== attempt || err.name !== 'NotAllowedError' || player.muted) return
    player.muted = true
    player.play().catch(() => {})
  })
}

/** Every real interaction retries sound, since browsers differ in which events count as a gesture. */
function unlock(e: Event) {
  if (!e.isTrusted) return
  unlocked = true
  if (owner && (player.muted || player.paused)) start()
  if (music.paused) startMusic()
}

for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
  window.addEventListener(type, unlock, true)
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    player.pause()
    music.pause()
  } else {
    start()
    startMusic()
  }
})

/** Loops `src` as background music (once sound is unlocked) until the returned stop function is called. */
export function playMusic(src: string) {
  if (music.getAttribute('src') !== src) music.src = src
  musicOn = true
  startMusic()
  return () => {
    musicOn = false
    music.pause()
  }
}

export function isSoundUnlocked() {
  return unlocked
}

/** Restarts the current video from the beginning; call from a tap/key handler so sound is allowed. */
export function replayWithSound() {
  unlocked = true
  player.currentTime = 0
  start()
}

/** Moves the shared player into `box` and plays `src`. Returns a detach function. */
export function attachPlayer(box: HTMLElement, src: string, loop = true) {
  if (player.getAttribute('src') !== src) {
    player.classList.remove('is-ready')
    player.src = src
  }
  player.loop = loop
  userPaused = false
  owner = box
  box.appendChild(player)
  start()
  return () => {
    if (owner !== box) return
    owner = null
    userPaused = false
    player.pause()
    player.remove()
  }
}

/** Pauses or resumes the shared player on the guest's request. */
export function setPaused(paused: boolean) {
  userPaused = paused
  if (paused) player.pause()
  else start()
}

/** Jumps the shared player by `sec` seconds (negative rewinds). */
export function seekBy(sec: number) {
  if (!Number.isFinite(player.duration)) return
  player.currentTime = Math.max(0, Math.min(player.duration - 0.5, player.currentTime + sec))
}

/** Jumps the shared player to a fraction (0–1) of the video. */
export function seekTo(fraction: number) {
  if (Number.isFinite(player.duration)) player.currentTime = fraction * player.duration
}

/** Reports playback progress and the end of a non-looping video. Returns an unsubscribe function. */
export function watchPlayer(onTime: (time: number, duration: number, paused: boolean) => void, onEnded: () => void) {
  const update = () => onTime(player.currentTime, player.duration || 0, player.paused)
  const events = ['timeupdate', 'durationchange', 'play', 'pause']
  for (const e of events) player.addEventListener(e, update)
  player.addEventListener('ended', onEnded)
  update()
  return () => {
    for (const e of events) player.removeEventListener(e, update)
    player.removeEventListener('ended', onEnded)
  }
}
