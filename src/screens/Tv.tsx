import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { clamp, hover, useApp, useRemote, wrap } from '../remote'
import type React from 'react'
import { AppBar } from '../components/common'
import { useDragScroll } from '../drag'
import Video from '../components/Video'
import type { Channel } from '../types'

const COLS = 4
const ROW_H = 300
const SAMPLE_CLIPS = ['assets/video/tv-1.mp4', 'assets/video/tv-2.mp4', 'assets/video/tv-3.mp4']

const GRID_TOP_PAD = 52
const GRID_VIEW_H = 1080 - 300

type Zone = 'tabs' | 'grid' | 'preview'

/** Moving onto this tab plays its (first) channel full screen straight away. */
const IN_HOUSE = 'In-House Channel'

function clipFor(channel: Channel, all: Channel[]) {
  if (channel.video) return channel.video
  const i = Math.max(0, all.findIndex((c) => c.id === channel.id))
  return SAMPLE_CLIPS[i % SAMPLE_CLIPS.length]
}

export default function Tv() {
  const { content, back } = useApp()
  const { categories, channels, instruction } = content.tv
  const byCat = useMemo(
    () => categories.map((c) => channels.filter((ch) => ch.category === c)),
    [categories, channels],
  )

  // Opens on the Sports tab while the first (in-house) channel keeps playing in the preview.
  const [cat, setCat] = useState(() => Math.max(0, categories.indexOf('Sports')))
  const [zone, setZone] = useState<Zone>('tabs')
  const [idx, setIdx] = useState(0)
  const [tuned, setTuned] = useState<Channel>(byCat[0][0])
  const [fullscreen, setFullscreen] = useState(false)
  const [banner, setBanner] = useState(false)
  const bannerTimer = useRef<number | undefined>(undefined)
  const list = byCat[cat]
  const row = Math.floor(idx / COLS)
  const [scroll, setScroll] = useState(0)
  const rows = Math.ceil(list.length / COLS)
  const maxScroll = Math.max(0, GRID_TOP_PAD + rows * ROW_H - GRID_VIEW_H)
  const gridSwipe = useDragScroll('y', (d) => setScroll((s) => clamp(s + d, 0, maxScroll)))
  const swipeStart = useRef<number | null>(null)
  const swiped = useRef(false)

  const tabsRef = useRef<HTMLDivElement>(null)
  const [tabScroll, setTabScroll] = useState(0)
  const maxTabScroll = () => {
    const box = tabsRef.current
    return box ? Math.max(0, box.firstElementChild!.scrollWidth - box.clientWidth) : 0
  }
  const tabSwipe = useDragScroll('x', (d) => setTabScroll((s) => clamp(s + d, 0, maxTabScroll())))

  useLayoutEffect(() => {
    const box = tabsRef.current
    const tab = box?.querySelectorAll<HTMLElement>('.tv__tab')[cat]
    if (!box || !tab) return
    const pad = 102
    setTabScroll((s) => {
      if (tab.offsetLeft - pad < s) return clamp(tab.offsetLeft - pad, 0, maxTabScroll())
      const right = tab.offsetLeft + tab.offsetWidth + pad - box.clientWidth
      return right > s ? clamp(right, 0, maxTabScroll()) : s
    })
  }, [cat])

  const moveIdx = (i: number) => {
    const r = Math.floor(i / COLS)
    setIdx(i)
    setScroll(r === 0 ? 0 : (r - 1) * ROW_H + 86)
  }

  const showBanner = () => {
    setBanner(true)
    clearTimeout(bannerTimer.current)
    bannerTimer.current = window.setTimeout(() => setBanner(false), 5000)
  }

  const enterFullscreen = (ch: Channel) => {
    setTuned(ch)
    setFullscreen(true)
    showBanner()
  }

  const selectChannel = (ch: Channel) => {
    if (tuned === ch) enterFullscreen(ch)
    else setTuned(ch)
  }

  const zap = (dir: number, allChannels = false) => {
    const pool = (!allChannels && byCat.find((l) => l.includes(tuned))) || channels
    setTuned(pool[wrap(pool.indexOf(tuned) + dir, pool.length)])
    showBanner()
  }

  /** Tab to go back to when leaving the full screen the In-House tab opened. */
  const returnCat = useRef<number | null>(null)

  const switchCat = (c: number) => {
    setCat(c)
    setIdx(0)
    setScroll(0)
    returnCat.current = null
    if (categories[c] === IN_HOUSE && byCat[c][0]) {
      returnCat.current = cat
      enterFullscreen(byCat[c][0])
    }
  }

  const exitFullscreen = () => {
    setFullscreen(false)
    if (returnCat.current === null) return
    setCat(returnCat.current)
    setIdx(0)
    setScroll(0)
    returnCat.current = null
  }

  const onFullDown = (e: React.PointerEvent) => {
    swipeStart.current = e.clientY
    swiped.current = false
  }
  const onFullUp = (e: React.PointerEvent) => {
    if (swipeStart.current === null) return
    const dy = e.clientY - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dy) < 60) return
    swiped.current = true
    zap(dy < 0 ? 1 : -1)
  }
  const onFullClick = () => {
    if (swiped.current) swiped.current = false
    else exitFullscreen()
  }

  useRemote((key) => {
    if (key === 'chup' || key === 'chdown') return zap(key === 'chup' ? 1 : -1, true)
    if (fullscreen) {
      if (key === 'ok' || key === 'back') exitFullscreen()
      else if (key === 'up') zap(-1)
      else if (key === 'down') zap(1)
      else showBanner()
      return
    }
    if (key === 'back') return back()
    if (zone === 'tabs') {
      const next = key === 'left' ? cat - 1 : key === 'right' ? cat + 1 : cat
      if (next !== cat && next >= 0 && next < categories.length) switchCat(next)
      else if (key === 'down' || key === 'ok') setZone('grid')
    } else if (zone === 'grid') {
      const col = idx % COLS
      if (key === 'left' && col > 0) moveIdx(idx - 1)
      else if (key === 'right') {
        if (col < COLS - 1 && idx + 1 < list.length) moveIdx(idx + 1)
        else setZone('preview')
      } else if (key === 'up') {
        if (row === 0) setZone('tabs')
        else moveIdx(idx - COLS)
      } else if (key === 'down' && idx + COLS < list.length) moveIdx(idx + COLS)
      else if (key === 'down' && row < Math.floor((list.length - 1) / COLS)) moveIdx(list.length - 1)
      else if (key === 'ok') selectChannel(list[idx])
    } else if (zone === 'preview') {
      if (key === 'left') setZone('grid')
      else if (key === 'ok') enterFullscreen(tuned)
      else if (key === 'up') setZone('tabs')
    }
  })

  return (
    <div className="screen tv">
      <AppBar variant="none" />
      <div className="tv__tabs drag-x" ref={tabsRef} {...tabSwipe}>
        <div className="tv__tabstrip" style={{ transform: `translateX(${-tabScroll}px)` }}>
          {categories.map((c, i) => (
            <button
              key={c}
              className={`tv__tab ${i === cat ? 'is-selected' : ''} ${zone === 'tabs' && i === cat ? 'is-focused' : ''}`}
              {...hover(() => setZone('tabs'))}
              onClick={() => {
                setZone('tabs')
                switchCat(i)
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div
        className="tv__gridwrap drag-y"
        {...gridSwipe}
      >
        <div className="tv__grid" style={{ transform: `translateY(${-scroll}px)` }}>
          {list.map((ch, i) => (
            <button
              key={ch.id + i}
              className={`tv__tile ${zone === 'grid' && i === idx ? 'is-focused' : ''}`}
              {...hover(() => {
                setZone('grid')
                setIdx(i)
              })}
              onClick={() => {
                setZone('grid')
                setIdx(i)
                selectChannel(ch)
              }}
            >
              <div className="tv__logo">
                {ch.image && (
                  <img
                    src={ch.image}
                    alt=""
                    onLoad={(e) => e.currentTarget.classList.toggle('is-small', e.currentTarget.naturalWidth < 300)}
                  />
                )}
              </div>
              <span className="tv__name">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tv__side">
        <button
          className={`tv__preview ${zone === 'preview' ? 'is-focused' : ''}`}
          {...hover(() => setZone('preview'))}
          onClick={() => {
            setZone('preview')
            enterFullscreen(tuned)
          }}
        >
          {!fullscreen && <Video src={clipFor(tuned, channels)} />}
        </button>
        <div className="tv__now">{tuned.name}</div>
        <div className="tv__hint">{instruction}</div>
      </div>

      {fullscreen && (
        <div className="tv__full" onPointerDown={onFullDown} onPointerUp={onFullUp} onClick={onFullClick}>
          <Video src={clipFor(tuned, channels)} />
          <div className={`tv__banner ${banner ? 'is-visible' : ''}`}>
            {tuned.image && <img src={tuned.image} alt="" />}
            <span>{tuned.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
