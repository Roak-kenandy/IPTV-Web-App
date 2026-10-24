import { useLayoutEffect, useRef, useState } from 'react'
import { clamp, hover, useApp, useRemote } from '../remote'
import { AppBar, Html, QuickFooter, Qr } from '../components/common'
import DetailsDrawer from '../components/DetailsDrawer'
import { useDragScroll } from '../drag'
import Video from '../components/Video'

type Focus = { zone: 'tabs'; i: number } | { zone: 'button' } | { zone: 'footer'; i: number }

const TAB_EDGE = 30
const STAGE_W = 1920

export default function SectionScreen({ id }: { id: string }) {
  const { content, back, home, go } = useApp()
  const section = content.sections[id]
  const items = section.items
  const [selected, setSelected] = useState(0)
  const item = items[selected]
  const hasDetails = item.details.length > 0
  const [focus, setFocus] = useState<Focus>(hasDetails ? { zone: 'button' } : { zone: 'tabs', i: 0 })
  const [drawer, setDrawer] = useState(false)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [tabOffset, setTabOffset] = useState(0)
  const focusedTab = focus.zone === 'tabs' ? focus.i : selected

  useLayoutEffect(() => {
    const el = tabRefs.current[focusedTab]
    if (!el) return
    const left = el.offsetLeft
    const right = left + el.offsetWidth
    setTabOffset((off) => {
      if (left - off < TAB_EDGE) return Math.max(0, left - TAB_EDGE)
      if (right - off > STAGE_W - TAB_EDGE) return right - (STAGE_W - TAB_EDGE)
      return off
    })
  }, [focusedTab])

  const tabSwipe = useDragScroll('x', (d) => {
    const last = tabRefs.current[items.length - 1]
    const max = last ? Math.max(0, last.offsetLeft + last.offsetWidth + TAB_EDGE - STAGE_W) : 0
    setTabOffset((off) => clamp(off + d, 0, max))
  })

  const select = (i: number) => {
    setSelected(i)
    setDrawer(false)
  }

  const activate = (f: Focus) => {
    if (f.zone === 'tabs') select(f.i)
    else if (f.zone === 'button') setDrawer(true)
    else if (f.i === 0) home()
    else go({ name: 'tv' })
  }

  useRemote((key) => {
    if (key === 'back') return back()
    if (key === 'ok') return activate(focus)
    if (focus.zone === 'tabs') {
      if (key === 'left') setFocus({ zone: 'tabs', i: clamp(focus.i - 1, 0, items.length - 1) })
      else if (key === 'right') setFocus({ zone: 'tabs', i: clamp(focus.i + 1, 0, items.length - 1) })
      else if (key === 'down') setFocus(hasDetails ? { zone: 'button' } : { zone: 'footer', i: 0 })
    } else if (focus.zone === 'button') {
      if (key === 'up' || key === 'right') setFocus({ zone: 'tabs', i: selected })
      else if (key === 'down') setFocus({ zone: 'footer', i: 0 })
    } else {
      if (key === 'left') setFocus({ zone: 'footer', i: 0 })
      else if (key === 'right') setFocus({ zone: 'footer', i: 1 })
      else if (key === 'up') setFocus(hasDetails ? { zone: 'button' } : { zone: 'tabs', i: selected })
    }
  }, !drawer)

  return (
    <div className={`screen section section--${section.kind}`}>
      <div className="bg-media section__bg" key={item.image}>
        <img className="panzoom" src={item.image} alt="" />
        {item.video && <Video className="section__video" src={item.video} />}
      </div>
      <div className="section__shade" />
      <AppBar variant="gradient" />

      <div className="section__tabs drag-x" {...tabSwipe}>
        <div className="section__tabtrack" style={{ transform: `translateX(${-tabOffset}px)` }}>
          {items.map((it, i) => (
            <button
              key={it.name}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              className={`section__tab ${i === selected ? 'is-selected' : ''} ${focus.zone === 'tabs' && focus.i === i ? 'is-focused' : ''}`}
              {...hover(() => setFocus({ zone: 'tabs', i }))}
              onClick={() => {
                setFocus({ zone: 'tabs', i })
                select(i)
              }}
            >
              {it.name}
            </button>
          ))}
        </div>
      </div>

      <div className="section__panel">
        <h1 className="section__title">{item.name}</h1>
        <Html className="section__desc" html={item.descriptionHtml} />
        {hasDetails && (
          <button
            className={`btn section__details ${focus.zone === 'button' && !drawer ? 'is-focused' : ''}`}
            {...hover(() => setFocus({ zone: 'button' }))}
            onClick={() => {
              setFocus({ zone: 'button' })
              setDrawer(true)
            }}
          >
            {item.detailsLabel}
          </button>
        )}
      </div>

      {item.qr && (
        <div className="section__qr">
          <Qr value={item.qr} size={300} />
          <p>{item.qrCaption}</p>
        </div>
      )}

      <QuickFooter
        focus={focus.zone === 'footer' ? focus.i : null}
        onHover={(i) => setFocus({ zone: 'footer', i })}
      />

      {drawer && <DetailsDrawer rows={item.details} onClose={() => setDrawer(false)} />}
    </div>
  )
}
