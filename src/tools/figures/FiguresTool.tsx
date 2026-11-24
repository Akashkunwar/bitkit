import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { GRADE_POINTS, gpa, reduceRatio } from '../../lib/figures'

type Mode = 'gpa' | 'ratio'
type Row = { credits: string; grade: string }

const GRADES = Object.keys(GRADE_POINTS)

export default function FiguresTool() {
  const [mode, setMode] = useState<Mode>('gpa')
  const [rows, setRows] = useState<Row[]>([
    { credits: '3', grade: 'A' },
    { credits: '4', grade: 'B' },
  ])
  const [width, setWidth] = useState('1920')
  const [height, setHeight] = useState('1080')

  const score = useMemo(() => {
    try {
      return {
        value: gpa(
          rows.filter((row) => row.credits.trim()).map((row) => ({ credits: Number(row.credits), grade: row.grade })),
        ),
        error: null as string | null,
      }
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : 'Could not average those grades.' }
    }
  }, [rows])

  const ratio = useMemo(() => {
    try {
      return { value: reduceRatio(Number(width), Number(height)), error: null as string | null }
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : 'Use a width and a height.' }
    }
  }, [width, height])

  return (
    <ToolLayout
      title="GPA and ratio"
      lede="A credit-weighted grade average, and a width and height reduced to a ratio."
    >
      <Segmented
        label="Figure"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'gpa', label: 'GPA' },
          { value: 'ratio', label: 'Aspect ratio' },
        ]}
      />
      {mode === 'gpa' ? (
        <>
          {rows.map((row, index) => (
            <div className="row" key={index}>
              <label className="field">
                <span>Credits</span>
                <input
                  className="text-input"
                  inputMode="decimal"
                  value={row.credits}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, credits: e.target.value } : item)),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>Grade</span>
                <select
                  className="text-input"
                  value={row.grade}
                  onChange={(e) =>
                    setRows((prev) => prev.map((item, i) => (i === index ? { ...item, grade: e.target.value } : item)))
                  }
                >
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade} · {GRADE_POINTS[grade]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() => setRows((prev) => [...prev, { credits: '3', grade: 'A' }])}
          >
            Add a course
          </button>
          {score.error ? <p className="status-bad">{score.error}</p> : <p className="hint">GPA {score.value}</p>}
          <p className="hint">A is 4.0. A minus is 3.7. This is a weighted average of the points you enter.</p>
        </>
      ) : (
        <>
          <div className="row">
            <label className="field">
              <span>Width</span>
              <input
                className="text-input"
                inputMode="decimal"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Height</span>
              <input
                className="text-input"
                inputMode="decimal"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </label>
          </div>
          {ratio.error || !ratio.value ? (
            <p className="status-bad">{ratio.error}</p>
          ) : (
            <p className="hint">
              {ratio.value.width}:{ratio.value.height}
              {ratio.value.label === `${ratio.value.width}:${ratio.value.height}`
                ? ''
                : ` · nearest common ${ratio.value.label}`}
            </p>
          )}
        </>
      )}
    </ToolLayout>
  )
}
