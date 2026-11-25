import { useMemo, useState } from 'react'
import type { Formula } from '../lib/formula'
import { samplesOf } from '../lib/formula'

type Props = { formulas: Formula[] }

/** Shared calculator chrome: pick a formula, fill its fields, read the results. */
export function FormulaDesk({ formulas }: Props) {
  const [id, setId] = useState(formulas[0]?.id ?? '')
  const formula = formulas.find((item) => item.id === id) ?? formulas[0]
  const [raw, setRaw] = useState<Record<string, string>>(() => samplesOf(formula))

  const result = useMemo(() => {
    try {
      return { rows: formula.run(raw), error: null as string | null }
    } catch (err) {
      return { rows: [], error: err instanceof Error ? err.message : 'Could not calculate that.' }
    }
  }, [formula, raw])

  const choose = (nextId: string) => {
    const next = formulas.find((item) => item.id === nextId) ?? formulas[0]
    setId(next.id)
    setRaw(samplesOf(next))
  }

  return (
    <>
      <label className="field">
        <span>Calculator</span>
        <select className="text-input" value={formula.id} onChange={(event) => choose(event.target.value)}>
          {formulas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">{formula.hint}</p>
      <div className="split">
        {formula.fields.map((field) => (
          <label className="field" key={field.id}>
            <span>{field.label}</span>
            {field.options ? (
              <select
                className="text-input"
                value={raw[field.id] ?? field.options[0]?.value ?? ''}
                onChange={(event) => setRaw((prev) => ({ ...prev, [field.id]: event.target.value }))}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.area ? (
              <textarea
                className="text-input"
                rows={6}
                value={raw[field.id] ?? ''}
                onChange={(event) => setRaw((prev) => ({ ...prev, [field.id]: event.target.value }))}
              />
            ) : (
              <input
                className="text-input"
                type={field.date ? 'date' : 'text'}
                inputMode={field.date ? undefined : 'decimal'}
                value={raw[field.id] ?? ''}
                onChange={(event) => setRaw((prev) => ({ ...prev, [field.id]: event.target.value }))}
              />
            )}
          </label>
        ))}
      </div>
      {result.error ? (
        <p className="status-bad" role="alert">
          {result.error}
        </p>
      ) : (
        <div className="stat-grid">
          {result.rows.map((row, index) => (
            <div className="stat" key={`${row.label}-${index}`}>
              <span className="stat-label">{row.label}</span>
              <span
                className="stat-value"
                style={{ whiteSpace: 'pre-wrap', fontSize: row.value.includes('\n') ? '1rem' : undefined }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
