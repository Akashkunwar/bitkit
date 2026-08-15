import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { CRON_FIELDS, describeCron, nextRuns, parseCron, PRESETS } from '../../lib/cron'

export default function CronTool() {
  const [expr, setExpr] = useState('0 9 * * 1-5')
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text && payload.text.trim().split(/\s+/).length === 5) setExpr(payload.text.trim())
  })

  const parsed = useMemo(() => {
    try {
      return { parts: parseCron(expr), description: describeCron(expr), error: null as string | null }
    } catch (err) {
      return {
        parts: null,
        description: '',
        error: err instanceof Error ? err.message : 'Could not read that expression.',
      }
    }
  }, [expr])

  const runs = useMemo(() => {
    if (parsed.error) return []
    try {
      return nextRuns(expr, 6)
    } catch {
      return []
    }
  }, [expr, parsed.error])

  const setField = (index: number, value: string) => {
    const parts = expr.trim().split(/\s+/)
    while (parts.length < 5) parts.push('*')
    parts[index] = value.trim() || '*'
    setExpr(parts.slice(0, 5).join(' '))
  }

  const fields = expr.trim().split(/\s+/)

  return (
    <ToolLayout title="Cron builder" lede="Write a schedule, read it back in plain English, and check the next runs.">
      <label className="field">
        <span>Expression</span>
        <input
          className="text-input mono-val"
          spellCheck={false}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
        />
      </label>

      {parsed.error ? (
        <p className="status-bad">{parsed.error}</p>
      ) : (
        <p className="status-ok">{parsed.description}</p>
      )}

      <div className="cron-grid">
        {CRON_FIELDS.map((field, i) => (
          <label key={field.key} className="field">
            <span>
              {field.label} <span className="hint">({field.min}–{field.max})</span>
            </span>
            <input
              className="text-input mono-val"
              spellCheck={false}
              value={fields[i] ?? '*'}
              onChange={(e) => setField(i, e.target.value)}
            />
          </label>
        ))}
      </div>

      <p className="field-label" style={{ marginTop: '1rem' }}>
        Common schedules
      </p>
      <div className="chip-row">
        {PRESETS.map((preset) => (
          <button
            key={preset.expr}
            type="button"
            className={expr === preset.expr ? 'chip chip-on' : 'chip'}
            onClick={() => setExpr(preset.expr)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {runs.length ? (
        <>
          <p className="field-label" style={{ marginTop: '1rem' }}>
            Next runs — your local time
          </p>
          <ul className="result-list">
            {runs.map((run) => (
              <li key={run.toISOString()} className="result-row">
                <span className="mono-val">
                  {run.toLocaleString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="row" style={{ marginTop: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={() => void copy(expr, 'expr')}>
          {copied === 'expr' ? 'Copied' : 'Copy expression'}
        </button>
      </div>

      <p className="hint" style={{ marginTop: '0.8rem' }}>
        Five fields: minute, hour, day of month, month, weekday. When both day-of-month and weekday are restricted,
        cron runs when <em>either</em> matches — that is standard behaviour, not a bug.
      </p>

      <SendTo from="cron" text={expr} />
    </ToolLayout>
  )
}
