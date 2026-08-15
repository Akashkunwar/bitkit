import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useCopied } from '../../lib/useCopied'
import { formatLong, nextAnniversary, parseDate, span, toInput, WEEKDAY_NAMES } from '../../lib/dates'

export default function AgeTool() {
  const today = toInput(new Date())
  const [from, setFrom] = useState('2000-01-01')
  const [to, setTo] = useState(today)
  const { copied, copy } = useCopied()

  const result = useMemo(() => {
    const a = parseDate(from)
    const b = parseDate(to)
    if (!a || !b) return null
    return { a, b, span: span(a, b), anniversary: nextAnniversary(a, b) }
  }, [from, to])

  const summary = result
    ? `${result.span.parts.years} years, ${result.span.parts.months} months, ${result.span.parts.days} days ` +
      `(${result.span.totalDays.toLocaleString()} days) between ${from} and ${to}`
    : ''

  return (
    <ToolLayout
      title="Age & date difference"
      lede="Exact years, months, and days between two dates — plus every other way to say it."
    >
      <div className="split">
        <label className="field">
          <span>From — birthday or start</span>
          <input className="text-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input className="text-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={() => setTo(today)}>
          To today
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setFrom(to)
            setTo(from)
          }}
        >
          Swap
        </button>
      </div>

      {!result ? (
        <p className="status-bad">Pick two valid dates.</p>
      ) : (
        <>
          <div className="big-answer">
            <strong>{result.span.parts.years}</strong> <span>years</span>{' '}
            <strong>{result.span.parts.months}</strong> <span>months</span>{' '}
            <strong>{result.span.parts.days}</strong> <span>days</span>
          </div>

          <div className="pill-row">
            <span className="pill">{result.span.totalDays.toLocaleString()} days</span>
            <span className="pill">{result.span.totalWeeks.toLocaleString()} weeks</span>
            <span className="pill">{result.span.totalMonths.toLocaleString()} months</span>
            <span className="pill">{result.span.totalHours.toLocaleString()} hours</span>
            <span className="pill">{result.span.totalMinutes.toLocaleString()} minutes</span>
          </div>

          <div className="pill-row">
            <span className="pill">{result.span.weekdays.toLocaleString()} weekdays</span>
            <span className="pill">{result.span.weekendDays.toLocaleString()} weekend days</span>
          </div>

          <div className="panel" style={{ marginTop: '1rem' }}>
            <p className="field-label">Details</p>
            <ul className="plain-list">
              <li>
                Start fell on a <strong>{WEEKDAY_NAMES[result.a.getDay()]}</strong> — {formatLong(result.a)}
              </li>
              <li>
                End falls on a <strong>{WEEKDAY_NAMES[result.b.getDay()]}</strong> — {formatLong(result.b)}
              </li>
              <li>
                Next anniversary is <strong>{formatLong(result.anniversary.date)}</strong>,{' '}
                {result.anniversary.daysAway === 0
                  ? 'today'
                  : `in ${result.anniversary.daysAway} day${result.anniversary.daysAway === 1 ? '' : 's'}`}
                {result.anniversary.turning > 0 ? ` — turning ${result.anniversary.turning}` : ''}
              </li>
            </ul>
          </div>

          <div className="row" style={{ marginTop: '0.9rem' }}>
            <button type="button" className="btn btn-primary" onClick={() => void copy(summary, 'sum')}>
              {copied === 'sum' ? 'Copied' : 'Copy summary'}
            </button>
          </div>
        </>
      )}

      <SendTo from="age" text={summary} />
    </ToolLayout>
  )
}
