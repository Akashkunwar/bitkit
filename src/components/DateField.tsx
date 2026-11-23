import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { calendarCells, parseDate, toInput, WEEKDAY_NAMES } from '../lib/dates'

type Props = {
  value: string
  onChange: (value: string) => void
  /** `YYYY-MM-DDTHH:mm`, for event start and end fields. */
  withTime?: boolean
  labelId?: string
}

const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Date(2026, month, 1).toLocaleDateString(undefined, { month: 'short' }),
)

function datePart(value: string): string {
  return parseDate(value.slice(0, 10)) ? value.slice(0, 10) : ''
}

function timePart(value: string): string {
  const time = value.slice(11, 16)
  return /^\d{2}:\d{2}$/.test(time) ? time : ''
}

function display(value: string, withTime: boolean): string {
  const iso = datePart(value)
  const date = iso ? parseDate(iso) : null
  if (!date) return ''
  const written = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const time = timePart(value)
  return withTime && time ? `${written}, ${time}` : written
}

export function DateField({ value, onChange, withTime = false, labelId }: Props) {
  const popId = useId()
  const anchor = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<'days' | 'months'>('days')
  const [cursor, setCursor] = useState(() => parseDate(datePart(value)) ?? new Date())
  const [box, setBox] = useState({ top: 0, left: 0 })
  const valueRef = useRef(value)
  valueRef.current = value

  const selected = datePart(value)
  const time = timePart(value)
  const today = toInput(new Date())

  useEffect(() => {
    if (!open) return
    const parsed = parseDate(datePart(valueRef.current))
    if (parsed) setCursor(parsed)
    setPanel('days')
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect()
      const height = pop.current?.offsetHeight ?? 320
      if (!rect) return
      const width = 280
      const below = window.innerHeight - rect.bottom
      const top = below < height + 12 && rect.top > height + 12 ? rect.top - height - 6 : rect.bottom + 6
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
      setBox({ top, left })
    }
    place()
    const outside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (anchor.current?.contains(target) || pop.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, panel])

  const commit = (iso: string, close: boolean) => {
    onChange(withTime ? `${iso}T${time || '09:00'}` : iso)
    const parsed = parseDate(iso)
    if (parsed) setCursor(parsed)
    if (close) setOpen(false)
  }

  const shiftMonth = (amount: number) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1))
  }

  const cells = calendarCells(cursor.getFullYear(), cursor.getMonth())
  const heading =
    panel === 'days'
      ? cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : String(cursor.getFullYear())
  const written = display(value, withTime)

  return (
    <div className="date-field" ref={anchor}>
      <button
        type="button"
        className="text-input date-trigger"
        data-empty={!written || undefined}
        data-open={open || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        aria-labelledby={labelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{written || (withTime ? 'Choose a date and time' : 'Choose a date')}</span>
        <CalendarIcon />
      </button>
      {open
        ? createPortal(
            <div
              ref={pop}
              id={popId}
              className="date-pop"
              role="dialog"
              aria-label={heading}
              style={{ top: box.top, left: box.left }}
            >
              <div className="date-head">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={panel === 'days' ? 'Previous month' : 'Previous year'}
                  onClick={() =>
                    panel === 'days'
                      ? shiftMonth(-1)
                      : setCursor(new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1))
                  }
                >
                  <Chevron />
                </button>
                <button
                  type="button"
                  className="date-title"
                  onClick={() => setPanel((current) => (current === 'days' ? 'months' : 'days'))}
                >
                  {heading}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={panel === 'days' ? 'Next month' : 'Next year'}
                  onClick={() =>
                    panel === 'days'
                      ? shiftMonth(1)
                      : setCursor(new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1))
                  }
                >
                  <Chevron flip />
                </button>
              </div>
              {panel === 'months' ? (
                <div className="date-months">
                  {MONTHS.map((name, month) => (
                    <button
                      key={name}
                      type="button"
                      className="date-month"
                      aria-pressed={month === cursor.getMonth()}
                      onClick={() => {
                        setCursor(new Date(cursor.getFullYear(), month, 1))
                        setPanel('days')
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="date-grid" role="grid">
                  {WEEKDAY_NAMES.map((name) => (
                    <span key={name} className="date-dow" aria-hidden="true">
                      {name.slice(0, 1)}
                    </span>
                  ))}
                  {cells.map((cell) => {
                    const day = Number(cell.iso.slice(8))
                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        className="date-day"
                        data-out={!cell.inMonth || undefined}
                        data-today={cell.iso === today || undefined}
                        aria-pressed={cell.iso === selected}
                        aria-label={parseDate(cell.iso)?.toLocaleDateString(undefined, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        onClick={() => commit(cell.iso, !withTime)}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              )}
              {withTime ? (
                <label className="date-time">
                  <span>Time</span>
                  <input
                    className="text-input"
                    type="time"
                    value={time || '09:00'}
                    onChange={(event) => {
                      const iso = selected || today
                      onChange(`${iso}T${event.target.value}`)
                    }}
                  />
                </label>
              ) : null}
              <div className="date-foot">
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  Clear
                </button>
                <button type="button" onClick={() => commit(today, !withTime)}>
                  Today
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M8.5 2.5 4 7l4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="date-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M1.5 6.5h13M5 1.5v2.5M11 1.5v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
