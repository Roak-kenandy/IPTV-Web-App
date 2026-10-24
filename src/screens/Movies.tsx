import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type React from 'react'
import { clamp, hover, useApp, useRemote } from '../remote'
import { AppBar } from '../components/common'
import { useDragScroll } from '../drag'
import Video from '../components/Video'
import { seekBy, seekTo, setPaused, watchPlayer } from '../sound'
import type { Movie, Movies as MoviesContent } from '../types'

const TILE_W = 368
const TILE_GAP = 24
const ROW_H = 340
const LIST_VIEW_H = 1080 - 300 - 96
const ROW_VIEW_W = 1920 - 2 * 44
const SEEK_SEC = 10
const OSD_HIDE_MS = 4000

type Kind = 'trailer' | 'video'
type Selected = { movie: Movie; genre: string }

/* ------------------------------------------------------------ remote button icons */

function OkIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44">
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="3" />
      <text x="24" y="30.5" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor">
        OK
      </text>
    </svg>
  )
}

function ArrowsIcon({ vertical = true }: { vertical?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="currentColor">
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M8 24l7-6v12z M40 24l-7-6v12z" />
      {vertical && <path d="M24 8l-6 7h12z M24 40l-6-7h12z" />}
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="21" strokeWidth="3" />
      <path d="M19 15l-6 6 6 6" />
      <path d="M13 21h13a8 8 0 0 1 0 16h-6" />
    </svg>
  )
}

function PlayIcon({ paused = true, size = 44 }: { paused?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="currentColor">
      {paused ? <path d="M17 11l22 13-22 13z" /> : <path d="M14 11h7v26h-7z M27 11h7v26h-7z" />}
    </svg>
  )
}

function SkipIcon({ forward }: { forward: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
      <g transform={forward ? undefined : 'translate(48 0) scale(-1 1)'}>
        <path d="M37 24a13 13 0 1 1-4-9.4" />
        <path d="M34 7v8h-8" strokeLinejoin="round" />
      </g>
      <text x="24" y="29" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" stroke="none">
        {SEEK_SEC}
      </text>
    </svg>
  )
}

function Hints({ items }: { items: { icon: React.ReactNode; label: string }[] }) {
  return (
    <div className="movies__hints">
      {items.map((h) => (
        <span key={h.label} className="movies__hint">
          {h.icon}
          {h.label}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ full-screen player */

function formatTime(sec: number) {
  if (!Number.isFinite(sec)) return '0:00'
  const s = Math.floor(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function MoviePlayer({ movie, kind, labels, onClose }: { movie: Movie; kind: Kind; labels: MoviesContent; onClose: () => void }) {
  const [progress, setProgress] = useState({ time: 0, duration: 0, paused: false })
  const [osd, setOsd] = useState(true)
  const hideTimer = useRef<number | undefined>(undefined)
  const pausedRef = useRef(false)

  const showOsd = () => {
    setOsd(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      if (!pausedRef.current) setOsd(false)
    }, OSD_HIDE_MS)
  }

  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setOsd(false), OSD_HIDE_MS)
    const stop = watchPlayer(
      (time, duration, paused) => setProgress({ time, duration, paused }),
      () => closeRef.current(),
    )
    return () => {
      stop()
      clearTimeout(hideTimer.current)
    }
  }, [])

  const togglePause = () => {
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
    showOsd()
  }
  const seek = (dir: number) => {
    seekBy(dir * SEEK_SEC)
    showOsd()
  }

  useRemote((key) => {
    if (key === 'back') onClose()
    else if (key === 'ok') togglePause()
    else if (key === 'left') seek(-1)
    else if (key === 'right') seek(1)
    else showOsd()
  })

  const pct = progress.duration ? (progress.time / progress.duration) * 100 : 0
  const h = labels.hints

  return (
    <div
      className={`movies__player ${osd ? 'is-osd' : ''}`}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        if (osd) setOsd(false)
        else showOsd()
      }}
    >
      <Video src={kind === 'trailer' ? movie.trailer : movie.video} loop={false} />

      <div className="movies__osd movies__osd--top">
        <img src={movie.poster} alt="" />
        <div>
          <h2>{movie.title}</h2>
          <p>
            {kind === 'trailer' ? labels.trailerLabel : labels.watchLabel}
            <i>·</i>
            {movie.year}
            <i>·</i>
            <b>{movie.rating}</b>
          </p>
        </div>
      </div>

      <div className="movies__osd movies__osd--bottom">
        <div className="movies__controls">
          <button onClick={() => seek(-1)} aria-label="Rewind">
            <SkipIcon forward={false} />
          </button>
          <button className="movies__playbtn" onClick={togglePause} aria-label="Play or pause">
            <PlayIcon paused={progress.paused} size={60} />
          </button>
          <button onClick={() => seek(1)} aria-label="Forward">
            <SkipIcon forward />
          </button>
        </div>
        <div className="movies__progress">
          <span>{formatTime(progress.time)}</span>
          <div
            className="movies__bar"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              seekTo(clamp((e.clientX - r.left) / r.width, 0, 1))
              showOsd()
            }}
          >
            <i style={{ width: `${pct}%` }} />
            <b style={{ left: `${pct}%` }} />
          </div>
          <span>{formatTime(progress.duration)}</span>
        </div>
        <Hints
          items={[
            { icon: <OkIcon />, label: h.pause },
            { icon: <ArrowsIcon vertical={false} />, label: h.seek },
            { icon: <BackIcon />, label: h.stop },
          ]}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ screen */

export default function Movies() {
  const { content, back } = useApp()
  const m = content.movies
  const rows = m.categories.filter((c) => c.movies.length > 0)
  const h = m.hints

  const [pos, setPos] = useState({ row: 0, col: 0 })
  const [scroll, setScroll] = useState(0)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [button, setButton] = useState(0)
  const [playing, setPlaying] = useState<Kind | null>(null)

  const maxScroll = Math.max(0, rows.length * ROW_H - LIST_VIEW_H)
  const listSwipe = useDragScroll('y', (d) => setScroll((s) => clamp(s + d, 0, maxScroll)))

  const moveTo = (row: number, col: number) => {
    setPos({ row, col })
    setScroll((s) => {
      const top = row * ROW_H
      if (top < s) return top
      if (top + ROW_H > s + LIST_VIEW_H) return clamp(top + ROW_H - LIST_VIEW_H, 0, maxScroll)
      return s
    })
  }

  const rowOffset = (row: number) => {
    if (row !== pos.row) return 0
    return Math.max(0, (pos.col + 1) * (TILE_W + TILE_GAP) - TILE_GAP - ROW_VIEW_W)
  }

  const openDetails = (row: number, col: number) => {
    setSelected({ movie: rows[row].movies[col], genre: rows[row].name })
    setButton(0)
  }

  useRemote(
    (key) => {
      if (selected) {
        if (key === 'back') setSelected(null)
        else if (key === 'left') setButton(0)
        else if (key === 'right') setButton(1)
        else if (key === 'ok') setPlaying(button === 0 ? 'trailer' : 'video')
        return
      }
      const { row, col } = pos
      if (key === 'back') back()
      else if (key === 'left' && col > 0) moveTo(row, col - 1)
      else if (key === 'right' && col < rows[row].movies.length - 1) moveTo(row, col + 1)
      else if (key === 'up' && row > 0) moveTo(row - 1, Math.min(col, rows[row - 1].movies.length - 1))
      else if (key === 'down' && row < rows.length - 1) moveTo(row + 1, Math.min(col, rows[row + 1].movies.length - 1))
      else if (key === 'ok') openDetails(row, col)
    },
    !playing,
  )

  return (
    <div className="screen movies">
      <AppBar variant="none" />
      <h1 className="movies__title">{m.title}</h1>

      {selected ? (
        <div className="movies__details">
          <p className="movies__subtitle">{m.detailsSubtitle}</p>
          <div className="movies__cast">
            <span>{m.castLabel}</span>
            <p>{selected.movie.cast}</p>
          </div>
          <div className="movies__info">
            <h2>{selected.movie.title}</h2>
            <div className="movies__meta">
              <span>{selected.movie.year}</span>
              <span>{selected.movie.duration}</span>
              <b>{selected.movie.rating}</b>
              <span>{selected.genre}</span>
            </div>
            <p>{selected.movie.description}</p>
            <div className="movies__buttons">
              {[m.trailerLabel, m.watchLabel].map((label, i) => (
                <button
                  key={label}
                  className={`btn movies__btn ${button === i ? 'is-focused' : ''}`}
                  {...hover(() => setButton(i))}
                  onClick={() => {
                    setButton(i)
                    setPlaying(i === 0 ? 'trailer' : 'video')
                  }}
                >
                  <PlayIcon size={34} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <img className="movies__poster" src={selected.movie.poster} alt="" />
          <Hints
            items={[
              { icon: <OkIcon />, label: h.play },
              { icon: <ArrowsIcon vertical={false} />, label: h.choose },
              { icon: <BackIcon />, label: h.back },
            ]}
          />
        </div>
      ) : (
        <>
          <p className="movies__subtitle">{m.subtitle}</p>
          <div className="movies__listwrap drag-y" {...listSwipe}>
            <div className="movies__list" style={{ transform: `translateY(${-scroll}px)` }}>
              {rows.map((cat, r) => (
                <section key={cat.name} className="movies__row">
                  <h3>{cat.name}</h3>
                  <div className="movies__tiles" style={{ transform: `translateX(${-rowOffset(r)}px)` }}>
                    {cat.movies.map((movie, c) => (
                      <button
                        key={movie.id}
                        className={`movies__tile ${pos.row === r && pos.col === c ? 'is-focused' : ''}`}
                        {...hover(() => setPos({ row: r, col: c }))}
                        onClick={() => {
                          setPos({ row: r, col: c })
                          openDetails(r, c)
                        }}
                      >
                        <img src={movie.thumbnail} alt="" />
                        <span>{movie.title}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
          <Hints
            items={[
              { icon: <OkIcon />, label: h.select },
              { icon: <ArrowsIcon />, label: h.navigate },
              { icon: <BackIcon />, label: h.back },
            ]}
          />
        </>
      )}

      {selected && playing && (
        <MoviePlayer
          key={selected.movie.id + playing}
          movie={selected.movie}
          kind={playing}
          labels={m}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  )
}
