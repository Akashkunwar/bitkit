import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { jsonTreeRows } from '../../lib/jsonTree'

const SAMPLE = `{
  "name": "BitKit",
  "local": true,
  "tools": ["month", "tree"]
}`

export default function TreeTool() {
  const [text, setText] = useState(SAMPLE)
  const rows = useMemo(() => {
    try {
      return { rows: jsonTreeRows(JSON.parse(text) as unknown), error: null as string | null }
    } catch (err) {
      return { rows: [], error: err instanceof Error ? err.message : 'That is not JSON.' }
    }
  }, [text])

  return (
    <ToolLayout title="JSON tree" lede="Expand a JSON value into rows. It is parsed in this tab, not sent anywhere.">
      <div className="split">
        <section className="panel">
          <textarea
            className="code-area editor"
            rows={16}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          {rows.error ? <p className="status-bad">{rows.error}</p> : null}
        </section>
        <aside className="panel">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {rows.rows.map((row, index) => (
              <li
                key={`${row.label}-${index}`}
                style={{ paddingLeft: row.depth * 16, fontFamily: 'ui-monospace, monospace' }}
              >
                {row.label}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </ToolLayout>
  )
}
