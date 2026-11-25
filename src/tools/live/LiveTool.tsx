import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Maximize2, Minimize2, Sun } from 'lucide-react'
import { COMMON_ZONES, zoneOffset } from '../../lib/time'
import { useI18n } from '../../lib/i18n'
import {
  CLOCK_FACES,
  CLOCK_THEMES,
  FACE_LABELS,
  THEME_LABELS,
  cityName,
  clockParts,
  dragOffsetMs,
  filterZones,
  formatOffset,
  handAngles,
  listZones,
  mergePrefs,
  prefsToParams,
  readLivePrefs,
  samePrefs,
  writeLivePrefs,
  type ClockParts,
  type DragStep,
  type LivePrefs,
} from '../../lib/liveClock'

const PINNED = ['auto', ...COMMON_ZONES] as const

/**
 * A clock you can leave on a spare screen.
 *
 * The face fills the page, the controls fade until the pointer comes back,
 * and dragging sideways shifts the displayed time without stopping the tick.
 */
export default function LiveTool() {
  const { language } = useI18n()
  const locale = language === 'hi' ? 'hi-IN' : undefined
  const [params, setParams] = useSearchParams()
  const paramsKey = params.toString()
  const [prefs, setPrefs] = useState<LivePrefs>(() => mergePrefs(readLivePrefs(), params))
  const [now, setNow] = useState(() => Date.now())
  const [offset, setOffset] = useState(0)
  const [menu, setMenu] = useState<'zone' | 'theme' | null>(null)
  const [query, setQuery] = useState('')
  const [full, setFull] = useState(false)
  const [quiet, setQuiet] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const stageRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const prefsRef = useRef(prefs)
  const dragRef = useRef<{ x: number; origin: number } | null>(null)
  const armRef = useRef<() => void>(() => {})
  prefsRef.current = prefs

  const update = useCallback(
    (patch: Partial<LivePrefs>) => {
      const next = { ...prefsRef.current, ...patch }
      prefsRef.current = next
      writeLivePrefs(next)
      setPrefs(next)
      setParams(prefsToParams(next), { replace: true })
    },
    [setParams],
  )

  useEffect(() => {
    const next = mergePrefs(readLivePrefs(), new URLSearchParams(paramsKey))
    setPrefs((current) => (samePrefs(current, next) ? current : next))
  }, [paramsKey])

  useEffect(() => {
    const delay = prefs.face === 'analog' && prefs.seconds ? 50 : 100
    const id = window.setInterval(() => setNow(Date.now()), delay)
    return () => window.clearInterval(id)
  }, [prefs.face, prefs.seconds])

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(id)
  }, [notice])

  useEffect(() => {
    if (!prefs.awake) return
    let cancelled = false
    let sentinel: WakeLockSentinel | null = null
    const fail = () => {
      if (cancelled) return
      setNotice('This browser did not keep the screen awake.')
      update({ awake: false })
    }
    const request = () => {
      if (!('wakeLock' in navigator)) {
        fail()
        return
      }
      void navigator.wakeLock
        .request('screen')
        .then((lock) => {
          if (cancelled) void lock.release()
          else sentinel = lock
        })
        .catch(fail)
    }
    request()
    const onVis = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      void sentinel?.release()
    }
  }, [prefs.awake, update])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    let timer = 0
    const arm = () => {
      window.clearTimeout(timer)
      if (menu || dragging) {
        setQuiet(false)
        return
      }
      timer = window.setTimeout(() => setQuiet(true), 3200)
    }
    armRef.current = arm
    const wake = () => {
      setQuiet(false)
      arm()
    }
    wake()
    node.addEventListener('pointermove', wake)
    return () => {
      node.removeEventListener('pointermove', wake)
      window.clearTimeout(timer)
    }
  }, [menu, dragging])

  useEffect(() => {
    if (menu === 'zone') searchRef.current?.focus()
  }, [menu])

  useEffect(() => {
    stageRef.current?.focus({ preventScroll: true })
  }, [])

  const zones = useMemo(() => listZones(), [])
  const shownAt = new Date(now + offset)
  const parts = clockParts(shownAt, prefs.zone, prefs.hour12, locale)
  const shift = formatOffset(offset)
  const matches = query.trim() ? filterZones(query, zones) : []
  const zoneChoices = query.trim() ? matches : [...PINNED]
  const spoken = [
    `${parts.hourText}:${parts.minuteText}${prefs.seconds ? `:${parts.secondText}` : ''}`,
    parts.ampm,
    prefs.showDate ? parts.dateLine : '',
    parts.city,
    prefs.showDate ? parts.offsetLabel : '',
    shift,
  ]
    .filter(Boolean)
    .join(', ')

  useEffect(() => {
    const previous = document.title
    const stamp = `${parts.hourText}:${parts.minuteText}${prefs.seconds ? `:${parts.secondText}` : ''}`
    document.title = `${stamp}${shift ? ` (${shift})` : ''} — Live clock`
    return () => {
      document.title = previous
    }
  }, [parts.hourText, parts.minuteText, parts.secondText, prefs.seconds, shift])

  const toggleFull = async () => {
    const node = stageRef.current
    if (!node) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await node.requestFullscreen()
    } catch {
      setNotice('Full screen was blocked. The clock still fills this page.')
    }
  }

  const chooseZone = (zone: string) => {
    update({ zone })
    setMenu(null)
    setQuery('')
  }

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button, input, a, .live-menu')) return
    dragRef.current = { x: event.clientX, origin: offset }
    setDragging(true)
    setQuiet(false)
    event.currentTarget.setPointerCapture(event.pointerId)
    stageRef.current?.focus({ preventScroll: true })
  }

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return
    const step: DragStep = event.altKey ? 'hour' : event.shiftKey ? 'quarter' : 'minute'
    setOffset(dragOffsetMs(dragRef.current.origin, event.clientX - dragRef.current.x, step))
  }

  const onPointerUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
  }

  const onDoubleClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button, input, a, .live-menu')) return
    setOffset(0)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && menu) {
      event.stopPropagation()
      setMenu(null)
      return
    }
    if (event.target !== event.currentTarget) return
    setQuiet(false)
    armRef.current()
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const dir = event.key === 'ArrowRight' ? 1 : -1
      const minutes = event.altKey ? 60 : event.shiftKey ? 15 : 1
      setOffset((current) => current + dir * minutes * 60_000)
    } else if (event.key === 'Home' || event.key === '0') {
      setOffset(0)
    } else if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      void toggleFull()
    }
  }

  const zoneLabel = prefs.zone === 'auto' ? `Auto · ${parts.city}` : parts.city

  return (
    <section
      ref={stageRef}
      className="live-stage"
      data-theme={prefs.theme}
      data-face={prefs.face}
      data-quiet={quiet ? 'true' : 'false'}
      data-dragging={dragging ? 'true' : 'false'}
      data-full={full ? 'true' : 'false'}
      tabIndex={0}
      aria-label={spoken}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    >
      <h1 className="visually-hidden">Live clock</h1>

      <div className="live-top live-chrome">
        <div className="live-top-side">
          <Link className="live-home" to="/">
            BitKit
          </Link>
        </div>
        <div className="live-pop" data-align="center">
          <button
            type="button"
            className="live-btn"
            aria-expanded={menu === 'zone'}
            aria-haspopup="listbox"
            onClick={() => setMenu(menu === 'zone' ? null : 'zone')}
          >
            {zoneLabel}
          </button>
          {menu === 'zone' ? (
            <div className="live-menu" role="listbox" aria-label="Time zone">
              <input
                ref={searchRef}
                className="live-search"
                value={query}
                placeholder="City, region, or IST"
                aria-label="Search time zones"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  const pick = zoneChoices[0]
                  if (pick) chooseZone(pick)
                }}
              />
              {zoneChoices.length ? (
                zoneChoices.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    className="live-option"
                    role="option"
                    aria-selected={prefs.zone === zone}
                    onClick={() => chooseZone(zone)}
                  >
                    <span>{zone === 'auto' ? 'Auto' : cityName(zone)}</span>
                    <small>
                      {zone === 'auto'
                        ? 'This device'
                        : zone.includes('/')
                          ? `${zone.split('/')[0]} · ${zoneOffset(shownAt, zone)}`
                          : zoneOffset(shownAt, zone)}
                    </small>
                  </button>
                ))
              ) : (
                <p className="live-empty">No zone matches.</p>
              )}
            </div>
          ) : null}
        </div>
        <div className="live-top-side live-top-icons">
          <div className="live-pop" data-align="end">
            <button
              type="button"
              className="live-icon"
              aria-label="Theme"
              aria-expanded={menu === 'theme'}
              aria-haspopup="listbox"
              onClick={() => setMenu(menu === 'theme' ? null : 'theme')}
            >
              <i className="live-dot" data-theme={prefs.theme} />
            </button>
            {menu === 'theme' ? (
              <div className="live-menu live-themes" role="listbox" aria-label="Theme">
                {CLOCK_THEMES.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    className="live-option"
                    role="option"
                    aria-selected={prefs.theme === theme}
                    onClick={() => {
                      update({ theme })
                      setMenu(null)
                    }}
                  >
                    <span className="live-option-name">
                      <i className="live-dot" data-theme={theme} />
                      {THEME_LABELS[theme]}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="live-icon"
            aria-pressed={prefs.awake}
            aria-label="Keep screen awake"
            title="Keep screen awake"
            onClick={() => update({ awake: !prefs.awake })}
          >
            <Sun size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="live-icon"
            aria-pressed={full}
            aria-label={full ? 'Exit full screen' : 'Full screen'}
            title={full ? 'Exit full screen' : 'Full screen (F)'}
            onClick={() => void toggleFull()}
          >
            {full ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="live-center">
        {prefs.face === 'analog' ? (
          <Analog parts={parts} seconds={prefs.seconds} />
        ) : prefs.face === 'flip' ? (
          <FlipReadout parts={parts} seconds={prefs.seconds} />
        ) : (
          <DigitalReadout parts={parts} seconds={prefs.seconds} mono={prefs.face === 'mono'} />
        )}
        {prefs.showDate ? <p className="live-date">{parts.dateLine}</p> : null}
        {prefs.showDate ? (
          <p className="live-where">
            {parts.city} · {parts.offsetLabel}
          </p>
        ) : null}
        <p id="live-hint" className="live-note" data-offset={shift ? 'true' : 'false'}>
          {shift ? (
            <>
              <span>{shift}</span>
              <button type="button" className="live-btn" onClick={() => setOffset(0)}>
                Back to now
              </button>
            </>
          ) : (
            'Drag sideways to shift the time. Double-click to come back to now.'
          )}
        </p>
      </div>

      <div className="live-bottom live-chrome">
        <div className="live-toggles">
          <button type="button" className="live-btn" aria-pressed={full} onClick={() => void toggleFull()}>
            {full ? 'Exit' : 'Full screen'}
          </button>
          <button
            type="button"
            className="live-btn"
            aria-pressed={prefs.seconds}
            onClick={() => update({ seconds: !prefs.seconds })}
          >
            Seconds
          </button>
          <button
            type="button"
            className="live-btn"
            aria-pressed={prefs.showDate}
            onClick={() => update({ showDate: !prefs.showDate })}
          >
            Date
          </button>
          <button
            type="button"
            className="live-btn"
            aria-pressed={!prefs.hour12}
            aria-label="24-hour time"
            onClick={() => update({ hour12: !prefs.hour12 })}
          >
            {prefs.hour12 ? '12h' : '24h'}
          </button>
        </div>
        <div className="live-faces" role="radiogroup" aria-label="Clock face">
          {CLOCK_FACES.map((face) => (
            <button
              key={face}
              type="button"
              className="live-btn"
              role="radio"
              aria-checked={prefs.face === face}
              onClick={() => update({ face })}
            >
              {FACE_LABELS[face]}
            </button>
          ))}
        </div>
        {notice ? (
          <p className="live-notice" role="status">
            {notice}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function DigitalReadout({ parts, seconds, mono }: { parts: ClockParts; seconds: boolean; mono: boolean }) {
  return (
    <p
      className="live-readout"
      data-face={mono ? 'mono' : 'digital'}
      data-tick={parts.second % 2 === 0 ? 'on' : 'off'}
      aria-hidden="true"
    >
      <span>{parts.hourText}</span>
      <span className="live-colon-char">:</span>
      <span>{parts.minuteText}</span>
      {seconds ? (
        <>
          <span className="live-colon-char">:</span>
          <span>{parts.secondText}</span>
        </>
      ) : null}
      {parts.ampm ? <span className="live-ampm">{parts.ampm}</span> : null}
    </p>
  )
}

function FlipReadout({ parts, seconds }: { parts: ClockParts; seconds: boolean }) {
  const groups = [parts.hourText, parts.minuteText, ...(seconds ? [parts.secondText] : [])]
  return (
    <div className="live-flip-row" aria-hidden="true">
      {groups.map((group, index) => (
        <span className="live-flip-cluster" key={group.length + index}>
          {index > 0 ? (
            <span className="live-colon">
              <i />
              <i />
            </span>
          ) : null}
          {group.split('').map((digit, place) => (
            <FlipDigit key={`${index}-${place}`} value={digit} />
          ))}
        </span>
      ))}
      {parts.ampm ? <span className="live-ampm">{parts.ampm}</span> : null}
    </div>
  )
}

function FlipDigit({ value }: { value: string }) {
  const shown = useRef(value)
  const [current, setCurrent] = useState(value)
  const [previous, setPrevious] = useState(value)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (value === shown.current) return
    setPrevious(shown.current)
    setOn(true)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(
      () => {
        shown.current = value
        setCurrent(value)
        setOn(false)
      },
      reduce ? 0 : 360,
    )
    return () => window.clearTimeout(id)
  }, [value])

  return (
    <span className="live-flip">
      <span className="live-flip-upper">
        <span>{on ? value : current}</span>
      </span>
      <span className="live-flip-lower">
        <span>{on ? previous : current}</span>
      </span>
      <span className="live-flip-flap" data-on={on ? 'true' : 'false'}>
        <span>{previous}</span>
      </span>
    </span>
  )
}

function Analog({ parts, seconds }: { parts: ClockParts; seconds: boolean }) {
  const angles = handAngles(parts)
  return (
    <svg className="live-analog" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="96" className="live-dial" />
      {Array.from({ length: 60 }, (_, index) => {
        const major = index % 5 === 0
        const rad = ((index * 6 - 90) * Math.PI) / 180
        const inner = major ? 76 : 86
        const outer = 92
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        return (
          <line
            key={index}
            x1={100 + cos * inner}
            y1={100 + sin * inner}
            x2={100 + cos * outer}
            y2={100 + sin * outer}
            stroke="currentColor"
            strokeWidth={major ? 2.6 : 1}
            strokeLinecap="round"
            opacity={major ? 0.9 : 0.35}
          />
        )
      })}
      <line
        className="live-hand"
        x1="100"
        y1="108"
        x2="100"
        y2="50"
        strokeWidth="4.5"
        transform={`rotate(${angles.hour} 100 100)`}
      />
      <line
        className="live-hand"
        x1="100"
        y1="114"
        x2="100"
        y2="28"
        strokeWidth="3"
        transform={`rotate(${angles.minute} 100 100)`}
      />
      {seconds ? (
        <line
          className="live-second"
          x1="100"
          y1="120"
          x2="100"
          y2="22"
          transform={`rotate(${angles.second} 100 100)`}
        />
      ) : null}
      <circle cx="100" cy="100" r="3.5" className="live-cap" />
    </svg>
  )
}
