import { useRef } from 'react'
import type React from 'react'

const THRESHOLD = 10

/** Stage pixels per screen pixel for an element inside the scaled 1920×1080 stage. */
function stageScale(el: HTMLElement, axis: 'x' | 'y') {
  const r = el.getBoundingClientRect()
  return (axis === 'x' ? r.width / el.offsetWidth : r.height / el.offsetHeight) || 1
}

/**
 * Swipe / mouse-drag / wheel scrolling for a container. `scrollBy` receives deltas in stage pixels.
 * A drag past the threshold suppresses the click that would otherwise fire on the item under the finger.
 */
export function useDragScroll(axis: 'x' | 'y', scrollBy: (delta: number) => void) {
  const drag = useRef<{ id: number; start: number; last: number; scale: number; active: boolean } | null>(null)
  const dragged = useRef(false)
  const pos = (e: React.PointerEvent) => (axis === 'x' ? e.clientX : e.clientY)

  const end = (e: React.PointerEvent<HTMLElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    e.currentTarget.classList.remove('is-dragging')
  }

  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const p = pos(e)
      drag.current = { id: e.pointerId, start: p, last: p, scale: stageScale(e.currentTarget, axis), active: false }
      dragged.current = false
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const p = pos(e)
      if (!d.active) {
        if (Math.abs(p - d.start) < THRESHOLD) return
        d.active = true
        dragged.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        e.currentTarget.classList.add('is-dragging')
      }
      scrollBy((d.last - p) / d.scale)
      d.last = p
    },
    onPointerUp: end,
    onPointerCancel: end,
    onClickCapture(e: React.MouseEvent) {
      if (!dragged.current) return
      dragged.current = false
      e.stopPropagation()
      e.preventDefault()
    },
    onWheel(e: React.WheelEvent<HTMLElement>) {
      const raw = axis === 'x' ? e.deltaX || e.deltaY : e.deltaY
      const delta = e.deltaMode === 1 ? raw * 40 : raw
      scrollBy(delta / stageScale(e.currentTarget, axis))
    },
  }
}
