import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type React from 'react'
import { hover, useApp } from '../remote'

/** Renders a monochrome icon image in a given colour (the app tints CMS icons). */
export function TintIcon({ src, color, size, className }: { src: string; color: string; size: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMask: `url("${src}") center / contain no-repeat`,
        mask: `url("${src}") center / contain no-repeat`,
        flex: 'none',
      }}
    />
  )
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function AppBar({ variant = 'gradient' }: { variant?: 'gradient' | 'band' | 'none' }) {
  const { content } = useApp()
  const now = useNow()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
  return (
    <div className={`appbar appbar--${variant}`}>
      <img className="appbar__logo" src={content.logo} alt="" />
      <div className="appbar__status">
        <TintIcon src={content.appBar.roomIcon} color="var(--primary)" size={40} />
        <span>{content.roomNumber}</span>
        <i className="appbar__sep" />
        <TintIcon src={content.appBar.timeIcon} color="var(--primary)" size={38} />
        <span>{time}</span>
        <i className="appbar__sep" />
        <TintIcon src={content.appBar.dateIcon} color="var(--primary)" size={38} />
        <span>{date}</span>
      </div>
    </div>
  )
}

/** Bottom "QUICK PRESS" bar with Home and TV shortcuts. focus: 0 = home, 1 = tv. */
export function QuickFooter({ focus, onHover }: { focus: number | null; onHover?: (i: number) => void }) {
  const { content, home, go } = useApp()
  return (
    <div className="quickfooter">
      <span className="quickfooter__guide">{content.footer.guide}</span>
      <button
        className={`quickfooter__btn ${focus === 0 ? 'is-focused' : ''}`}
        {...hover(() => onHover?.(0))}
        onClick={() => {
          onHover?.(0)
          home()
        }}
      >
        <TintIcon src={content.footer.homeIcon} color="#fff" size={44} />
      </button>
      <button
        className={`quickfooter__btn ${focus === 1 ? 'is-focused' : ''}`}
        {...hover(() => onHover?.(1))}
        onClick={() => {
          onHover?.(1)
          go({ name: 'tv' })
        }}
      >
        <TintIcon src={content.footer.tvIcon} color="#fff" size={44} />
      </button>
    </div>
  )
}

/**
 * QR code drawn with round dots and circular finder patterns, matching the TV app's style.
 * Relative values (e.g. "assets/docs/menu.pdf") are resolved against the site's own address.
 */
export function Qr({ value, size }: { value: string; size: number }) {
  const qr = QRCode.create(new URL(value, window.location.href).href, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const data = qr.modules.data
  const pad = 2
  const dim = n + pad * 2
  const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  const dots: React.ReactNode[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (data[r * n + c] && !inFinder(r, c)) {
        dots.push(<circle key={`${r}-${c}`} cx={c + pad + 0.5} cy={r + pad + 0.5} r={0.42} />)
      }
    }
  }
  const finder = (r: number, c: number) => (
    <g key={`f${r}${c}`}>
      <circle cx={c + pad + 3.5} cy={r + pad + 3.5} r={3} fill="none" stroke="#000" strokeWidth={1} />
      <circle cx={c + pad + 3.5} cy={r + pad + 3.5} r={1.6} />
    </g>
  )
  return (
    <div className="qr" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${dim} ${dim}`} width={size} height={size} fill="#000">
        {dots}
        {finder(0, 0)}
        {finder(0, n - 7)}
        {finder(n - 7, 0)}
      </svg>
    </div>
  )
}

export function Html({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
