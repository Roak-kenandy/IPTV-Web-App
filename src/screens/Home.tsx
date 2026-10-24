import { useEffect, useState } from 'react'
import { clamp, hover, useApp, useRemote } from '../remote'
import { AppBar } from '../components/common'
import { useDragScroll } from '../drag'
import { playMusic } from '../sound'
import type { MenuItem } from '../types'

const CARD_W = 322
const GAP = 12
const EDGE = 30
const STAGE_W = 1920

let lastFocus = 0
let lastOffset = 0

export default function Home() {
  const { content, go, back } = useApp()
  const { menu, slides, slideIntervalSec, music } = content.home
  const [focus, setFocusState] = useState(lastFocus)
  const [offset, setOffset] = useState(lastOffset)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), slideIntervalSec * 1000)
    return () => clearInterval(t)
  }, [slides.length, slideIntervalSec])

  useEffect(() => (music ? playMusic(music) : undefined), [music])

  const setFocus = (i: number) => {
    const left = EDGE + i * (CARD_W + GAP)
    let next = offset
    if (left - next < EDGE) next = left - EDGE
    if (left + CARD_W - next > STAGE_W - EDGE) next = left + CARD_W - (STAGE_W - EDGE)
    lastFocus = i
    lastOffset = next
    setFocusState(i)
    setOffset(next)
  }

  const maxOffset = Math.max(0, EDGE + menu.length * (CARD_W + GAP) - GAP - (STAGE_W - EDGE))
  const swipe = useDragScroll('x', (d) =>
    setOffset((o) => {
      lastOffset = clamp(o + d, 0, maxOffset)
      return lastOffset
    }),
  )

  const open = (m: MenuItem) => {
    if (m.route === 'section') go({ name: 'section', id: m.id })
    else go({ name: m.route })
  }

  useRemote((key) => {
    if (key === 'left') setFocus(clamp(focus - 1, 0, menu.length - 1))
    else if (key === 'right') setFocus(clamp(focus + 1, 0, menu.length - 1))
    else if (key === 'ok') open(menu[focus])
    else if (key === 'back') back()
  })

  return (
    <div className="screen home">
      {slides.map((src, i) => (
        <img key={src} className={`bg-media slide ${i === slide ? 'is-active' : ''}`} src={src} alt="" />
      ))}
      <div className="home__shade" />
      <AppBar variant="gradient" />
      <div className="home__menu drag-x" {...swipe}>
        <div className="home__track" style={{ transform: `translateX(${-offset}px)` }}>
          {menu.map((m, i) => (
            <button
              key={m.id}
              className={`home__card ${i === focus ? 'is-focused' : ''}`}
              {...hover(() => setFocus(i))}
              onClick={() => {
                setFocus(i)
                open(m)
              }}
            >
              <img src={m.icon} alt="" />
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
