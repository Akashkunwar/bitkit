import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { WEEKDAYS, monthWeeks } from '../../lib/month'

export default function MonthTool() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const weeks = useMemo(() => {
    try {
      return { rows: monthWeeks(year, month), error: null as string | null }
    } catch (err) {
      return { rows: [] as (number | null)[][], error: err instanceof Error ? err.message : 'Pick a real month.' }
    }
  }, [year, month])
  const shift = (delta: number) => {
    const date = new Date(year, month + delta, 1)
    setYear(date.getFullYear())
    setMonth(date.getMonth())
  }
  const label = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })

  return (
    <ToolLayout title="Month" lede="A Sunday-first month. Nothing is saved.">
      <div className="row">
        <button type="button" className="btn" onClick={() => shift(-1)}>
          Previous
        </button>
        <strong>{label}</strong>
        <button type="button" className="btn" onClick={() => shift(1)}>
          Next
        </button>
      </div>
      {weeks.error ? <p className="status-bad">{weeks.error}</p> : null}
      <table className="data-table">
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.rows.map((week, index) => (
            <tr key={index}>
              {week.map((day, column) => (
                <td key={column}>{day ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ToolLayout>
  )
}
