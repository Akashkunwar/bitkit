import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { useCopied } from '../../lib/useCopied'
import {
  addWorkingDays,
  countWorkingDays,
  formatLong,
  MON_TO_FRI,
  parseDate,
  parseHolidays,
  toInput,
  WEEKDAY_NAMES,
  type WorkWeek,
} from '../../lib/dates'

type Mode = 'add' | 'between'

const MODES: { value: Mode; label: string }[] = [
  { value: 'add', label: 'Add working days' },
  { value: 'between', label: 'Count between dates' },
]

export default function DeadlineTool() {
  const today = toInput(new Date())
  const [mode, setMode] = useState<Mode>('add')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [days, setDays] = useState(10)
  const [week, setWeek] = useState<WorkWeek>([...MON_TO_FRI])
  const [holidayText, setHolidayText] = useState('')
  const { copied, copy } = useCopied()

  const holidays = useMemo(() => parseHolidays(holidayText), [holidayText])
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  const workingDaysSet = week.some(Boolean)

  const added = useMemo(
    () => (startDate && workingDaysSet ? addWorkingDays(startDate, days, week, holidays) : null),
    [startDate, days, week, holidays, workingDaysSet],
  )

  const between = useMemo(
    () => (startDate && endDate ? countWorkingDays(startDate, endDate, week, holidays) : null),
    [startDate, endDate, week, holidays],
  )

  const summary =
    mode === 'add' && added
      ? `${days} working days from ${start} is ${toInput(added)} (${formatLong(added)})`
      : between
        ? `${between.working} working days between ${start} and ${end}`
        : ''

  return (
    <ToolLayout
      title="Deadline calculator"
      lede="Count in working days, skipping weekends and the holidays you actually observe."
    >
      <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} />

      <div className="split">
        <label className="field">
          <span>{mode === 'add' ? 'Start date' : 'From'}</span>
          <input className="text-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        {mode === 'add' ? (
          <label className="field">
            <span>Working days — negative counts backwards</span>
            <input
              className="text-input"
              type="number"
              value={days}
              onChange={(e) => setDays(Math.trunc(Number(e.target.value) || 0))}
            />
          </label>
        ) : (
          <label className="field">
            <span>To</span>
            <input className="text-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        )}
      </div>

      <div className="field">
        <span>Working week</span>
        <div className="chip-row">
          {WEEKDAY_NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              className={week[i] ? 'chip chip-on' : 'chip'}
              aria-pressed={week[i]}
              onClick={() => setWeek(week.map((on, j) => (i === j ? !on : on)))}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Holidays — one date per line, YYYY-MM-DD</span>
        <textarea
          className="code-area"
          rows={4}
          spellCheck={false}
          placeholder={'2026-01-26\n2026-08-15\n2026-10-02'}
          value={holidayText}
          onChange={(e) => setHolidayText(e.target.value)}
        />
      </label>

      {!workingDaysSet ? (
        <p className="status-bad">Pick at least one working day.</p>
      ) : mode === 'add' && added ? (
        <>
          <div className="big-answer">
            <strong>{formatLong(added)}</strong>
          </div>
          <div className="pill-row">
            <span className="pill">{toInput(added)}</span>
            <span className="pill">{days >= 0 ? 'after' : 'before'} {start}</span>
            <span className="pill">{holidays.size} holidays applied</span>
          </div>
        </>
      ) : between ? (
        <>
          <div className="big-answer">
            <strong>{between.working}</strong> <span>working days</span>
          </div>
          <div className="pill-row">
            <span className="pill">{between.off} non-working days</span>
            <span className="pill">{between.working + between.off} days total</span>
            {between.holidaysHit ? <span className="pill">{between.holidaysHit} holidays fell on a work day</span> : null}
          </div>
          <p className="hint">Both the start and end dates are counted.</p>
        </>
      ) : (
        <p className="status-bad">Pick valid dates.</p>
      )}

      {summary ? (
        <div className="row" style={{ marginTop: '0.9rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => void copy(summary, 'sum')}>
            {copied === 'sum' ? 'Copied' : 'Copy result'}
          </button>
        </div>
      ) : null}

      <SendTo from="deadline" text={summary} />
    </ToolLayout>
  )
}
