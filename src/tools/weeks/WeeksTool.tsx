import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { LIFE_YEARS, WEEKS_PER_YEAR, lifeGrid, weeksLived } from '../../lib/weeks'

export default function WeeksTool() {
  const [birth, setBirth] = useState('1995-06-15')
  const lived = useMemo(() => {
    const born = new Date(`${birth}T00:00:00`)
    return Number.isNaN(born.getTime()) ? 0 : weeksLived(born, new Date())
  }, [birth])
  const cells = useMemo(() => lifeGrid(lived), [lived])
  const years = Math.floor(lived / WEEKS_PER_YEAR)
  const extra = lived % WEEKS_PER_YEAR

  return (
    <ToolLayout
      title="Life in weeks"
      lede={`A ${LIFE_YEARS}-year grid, one square per week. The count is computed in this tab.`}
    >
      <label className="field">
        <span>Birth date</span>
        <input className="text-input" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
      </label>
      <p className="lede">
        {lived.toLocaleString()} weeks · {years} years and {extra} weeks
      </p>
      <div
        className="week-grid"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${WEEKS_PER_YEAR}, 1fr)`, gap: 1, maxWidth: 780 }}
      >
        {cells.map((cell) => (
          <span
            key={`${cell.year}-${cell.week}`}
            title={`Year ${cell.year}, week ${cell.week + 1}`}
            style={{
              aspectRatio: '1',
              background: cell.lived ? 'var(--accent, #c45b2d)' : 'var(--bg-mute, #e7e2da)',
            }}
          />
        ))}
      </div>
    </ToolLayout>
  )
}
