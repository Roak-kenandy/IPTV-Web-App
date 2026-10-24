import { useState } from 'react'
import { clamp, hover, useApp, useRemote } from '../remote'
import { TintIcon } from '../components/common'
import Video from '../components/Video'
import PhonePair from '../components/PhonePair'

// 0 = Home icon, 1 = TV icon
export default function Welcome() {
  const { content, go } = useApp()
  const w = content.welcome
  const [focus, setFocus] = useState(0)

  const activate = (i: number) => {
    setFocus(i)
    if (i === 1) go({ name: 'tv' })
    else go({ name: 'home' })
  }

  useRemote((key) => {
    if (key === 'left') setFocus(clamp(focus - 1, 0, 1))
    else if (key === 'right') setFocus(clamp(focus + 1, 0, 1))
    else if (key === 'ok') activate(focus)
  })

  return (
    <div className="screen welcome">
      <Video className="bg-media" src={w.video} />
      <img className="welcome__logo" src={content.logo} alt="" />
      <PhonePair />
      <div className="welcome__body">
        <h1 className="welcome__title">{w.title}</h1>
        <div className="welcome__divider" />
        <div className="welcome__icons">
          {[content.footer.homeIcon, content.footer.tvIcon].map((src, i) => (
            <button
              key={src}
              className={`welcome__icon ${focus === i ? 'is-focused' : ''}`}
              {...hover(() => setFocus(i))}
              onClick={() => activate(i)}
            >
              <TintIcon src={src} color={focus === i ? 'var(--primary)' : '#fff'} size={78} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
