import { useLayoutEffect, useRef } from 'react'
import { attachPlayer } from '../sound'

/** Video with sound (looping unless `loop` is false), shown over its poster (the matching .jpg) until playback starts. */
export default function Video({ src, className, loop = true }: { src: string; className?: string; loop?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => attachPlayer(box.current!, src, loop), [src, loop])
  return (
    <div
      ref={box}
      className={`video ${className ?? ''}`}
      style={{ backgroundImage: `url("${src.replace(/\.mp4$/, '.jpg')}")` }}
    />
  )
}
