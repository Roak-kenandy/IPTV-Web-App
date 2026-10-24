import { useEffect, useRef, useState } from 'react'
import { clamp, hover, useApp, useRemote } from '../remote'
import { Html } from './common'
import type { DetailRow } from '../types'

export default function DetailsDrawer({ rows, onClose }: { rows: DetailRow[]; onClose: () => void }) {
  const { content } = useApp()
  const [focus, setFocus] = useState(0)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  useRemote((key) => {
    if (key === 'back') onClose()
    else if (key === 'up') setFocus(clamp(focus - 1, 0, rows.length - 1))
    else if (key === 'down') setFocus(clamp(focus + 1, 0, rows.length - 1))
  })

  useEffect(() => {
    const row = rowRefs.current[focus]
    const box = row?.parentElement
    if (!row || !box) return
    if (row.offsetTop < box.scrollTop) box.scrollTo({ top: row.offsetTop, behavior: 'smooth' })
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTo({ top: row.offsetTop + row.offsetHeight - box.clientHeight, behavior: 'smooth' })
  }, [focus])

  return (
    <div className="drawer" onClick={onClose}>
      <aside className="drawer__panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__rows">
          {rows.map((r, i) => (
            <div
              key={r.label + i}
              ref={(el) => {
                rowRefs.current[i] = el
              }}
              className={`drawer__row ${i === focus ? 'is-focused' : ''}`}
              {...hover(() => setFocus(i))}
              onClick={() => setFocus(i)}
            >
              <div className="drawer__label">{r.label}</div>
              <Html className="drawer__value" html={r.valueHtml} />
            </div>
          ))}
        </div>
        <div className="drawer__back" onClick={onClose}>
          {content.drawerBackText}
        </div>
      </aside>
    </div>
  )
}
