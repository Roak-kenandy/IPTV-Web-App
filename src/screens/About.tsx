import { useState } from 'react'
import { hover, useApp, useRemote } from '../remote'
import { AppBar, Html, QuickFooter, Qr } from '../components/common'
import LinkDialog from '../components/LinkDialog'

type Focus = { zone: 'social'; i: number } | { zone: 'website' } | { zone: 'footer'; i: number }

export default function About() {
  const { content, back, home, go } = useApp()
  const a = content.about
  const [focus, setFocus] = useState<Focus>({ zone: 'website' })
  const [link, setLink] = useState<{ title: string; url: string } | null>(null)

  const activate = (f: Focus) => {
    setFocus(f)
    if (f.zone === 'social') setLink({ title: a.socials[f.i].name.replace(/ Link$/, ''), url: a.socials[f.i].url })
    else if (f.zone === 'website') setLink({ title: a.websiteLabel, url: a.website })
    else if (f.i === 0) home()
    else go({ name: 'tv' })
  }

  useRemote((key) => {
    if (key === 'back') return back()
    if (key === 'ok') return activate(focus)
    const n = a.socials.length
    if (focus.zone === 'social') {
      if (key === 'left' && focus.i > 0) setFocus({ zone: 'social', i: focus.i - 1 })
      else if (key === 'right' && focus.i < n - 1) setFocus({ zone: 'social', i: focus.i + 1 })
      else if (key === 'down') setFocus({ zone: 'website' })
    } else if (focus.zone === 'website') {
      if (key === 'up' && n) setFocus({ zone: 'social', i: 0 })
      else if (key === 'down') setFocus({ zone: 'footer', i: 0 })
    } else {
      if (key === 'left') setFocus({ zone: 'footer', i: 0 })
      else if (key === 'right') setFocus({ zone: 'footer', i: 1 })
      else if (key === 'up') setFocus({ zone: 'website' })
    }
  }, !link)

  return (
    <div className="screen about">
      <img className="about__bg" src={a.image} alt="" />
      <div className="about__shade" />
      <AppBar variant="band" />
      <div className="about__main">
        <h1 className="about__title">{a.name}</h1>
        <Html className="about__desc" html={a.descriptionHtml} />
        <div className="about__socials">
          {a.socials.map((s, i) => (
            <button
              key={s.name}
              className={`about__social ${focus.zone === 'social' && focus.i === i ? 'is-focused' : ''}`}
              {...hover(() => setFocus({ zone: 'social', i }))}
              onClick={() => activate({ zone: 'social', i })}
            >
              <img src={s.icon} alt={s.name} />
            </button>
          ))}
        </div>
        <button
          className={`btn about__website ${focus.zone === 'website' ? 'is-focused' : ''}`}
          {...hover(() => setFocus({ zone: 'website' }))}
          onClick={() => activate({ zone: 'website' })}
        >
          {a.websiteLabel}
        </button>
      </div>
      <div className="about__qr">
        <Qr value={a.website} size={300} />
        <p>{a.qrCaption}</p>
      </div>
      <QuickFooter
        focus={focus.zone === 'footer' ? focus.i : null}
        onHover={(i) => setFocus({ zone: 'footer', i })}
      />
      {link && <LinkDialog title={link.title} url={link.url} onClose={() => setLink(null)} />}
    </div>
  )
}
