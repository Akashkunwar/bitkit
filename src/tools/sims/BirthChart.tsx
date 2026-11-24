import { useState } from 'react'
import { sunSign } from '../../lib/sims'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function BirthChart() {
  const [month, setMonth] = useState(3)
  const [day, setDay] = useState(21)
  const sign = sunSign(month, day)

  return (
    <div className="stack">
      <p>Sun sign only.</p>
      <p className="muted">No houses and no ephemeris. The sign comes from the calendar date.</p>
      <div className="row">
        <label className="field">
          <span>Month</span>
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Day</span>
          <input type="number" min={1} max={31} value={day} onChange={(event) => setDay(Number(event.target.value))} />
        </label>
      </div>
      <p>
        <strong>{sign}</strong>
      </p>
    </div>
  )
}
