import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useCopied } from '../../lib/useCopied'
import { parseHar, sanitizeHar } from '../../lib/har'

type Mode = 'view' | 'clean'

const SAMPLE = `{
  "log": {
    "entries": [
      {
        "time": 42,
        "request": {
          "method": "GET",
          "url": "https://example.com/a?token=secret",
          "headers": [{ "name": "Cookie", "value": "session=abc" }],
          "queryString": [{ "name": "token", "value": "secret" }]
        },
        "response": { "status": 200, "headers": [{ "name": "Set-Cookie", "value": "id=1" }] }
      }
    ]
  }
}`

export default function HarTool() {
  const [mode, setMode] = useState<Mode>('view')
  const [text, setText] = useState(SAMPLE)
  const { copied, copy } = useCopied()
  const parsed = useMemo(() => {
    try {
      return { rows: parseHar(text), clean: mode === 'clean' ? sanitizeHar(text) : '', error: null as string | null }
    } catch (err) {
      return { rows: [], clean: '', error: err instanceof Error ? err.message : 'Could not read that HAR.' }
    }
  }, [text, mode])

  return (
    <ToolLayout
      title="HAR"
      lede="Open a HAR file in this tab. Cleaning blanks cookies, authorization headers, and token query values."
    >
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'view', label: 'View' },
          { value: 'clean', label: 'Clean' },
        ]}
        onChange={setMode}
      />
      <div className="split">
        <section className="panel">
          <textarea
            className="code-area editor"
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          {parsed.error ? <p className="status-bad">{parsed.error}</p> : null}
        </section>
        <aside className="panel">
          {mode === 'view' ? (
            <ul>
              {parsed.rows.map((row, index) => (
                <li key={`${row.url}-${index}`}>
                  {row.method} {row.status} · {row.timeMs} ms · {row.url}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <textarea className="code-area" rows={14} readOnly value={parsed.clean} />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!parsed.clean}
                onClick={() => void copy(parsed.clean, 'har')}
              >
                {copied === 'har' ? 'Copied ✓' : 'Copy cleaned HAR'}
              </button>
            </>
          )}
        </aside>
      </div>
    </ToolLayout>
  )
}
