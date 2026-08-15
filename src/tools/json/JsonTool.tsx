import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { triggerDownload } from '../../lib/download'
import {
  formatJson,
  jsonStats,
  minifyJson,
  validateJson,
  escapeForString,
  unescapeString,
  type FormatOptions,
} from '../../lib/json'
import { useHandoff } from '../../lib/useHandoff'
import { SendTo } from '../../components/SendTo'

const SAMPLE = `{
  "name": "kit",
  "local": true,
  "tools": ["json", "qr", "pdf"],
  "nested": { "depth": 2 }
}`

export default function JsonTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState<FormatOptions['indent']>('2')
  const [sortKeys, setSortKeys] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useHandoff((payload) => {
    if (payload.text) setInput(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setInput)
  })

  const validation = useMemo(() => {
    if (!input.trim()) return null
    return validateJson(input)
  }, [input])

  const stats = useMemo(() => {
    if (!validation || validation.error) return null
    try {
      return jsonStats(input)
    } catch {
      return null
    }
  }, [validation, input])

  const run = (fn: () => string) => {
    try {
      setActionError(null)
      setOutput(fn())
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Operation failed.')
    }
  }

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <ToolLayout
      title="JSON formatter"
      lede="Format, validate, minify, and inspect JSON. Parsing happens in this tab — payloads never leave the browser."
    >
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>Input JSON</span>
            <textarea
              className="code-area editor"
              rows={16}
              spellCheck={false}
              placeholder='{"paste": "your JSON here"}'
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </label>
          {validation === null ? (
            <p className="hint">
              Waiting for input.{' '}
              <button type="button" className="btn-ghost" onClick={() => setInput(SAMPLE)}>
                Load a sample
              </button>
            </p>
          ) : validation.error ? (
            <p className="status-bad">
              Invalid JSON — line {validation.error.line}, column {validation.error.column}:{' '}
              {validation.error.message}
            </p>
          ) : (
            <p className="status-ok">
              Valid JSON (RFC 8259).
              {stats
                ? ` ${stats.bytes.toLocaleString()} bytes · ${stats.keys} keys · ${stats.objects} objects · ${stats.arrays} arrays · depth ${stats.depth}`
                : null}
            </p>
          )}
          {output ? (
            <label className="field" style={{ marginTop: '1rem' }}>
              <span>Output</span>
              <textarea className="code-area" rows={14} spellCheck={false} readOnly value={output} />
            </label>
          ) : null}
          {actionError ? <p className="status-bad">{actionError}</p> : null}
        </section>
        <aside className="panel">
          <Segmented
            label="Indent"
            value={indent}
            options={[
              { value: '2', label: '2 spaces' },
              { value: '4', label: '4 spaces' },
              { value: 'tab', label: 'Tabs' },
            ]}
            onChange={setIndent}
          />
          <label className="row" style={{ marginBottom: '1rem' }}>
            <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} />
            Sort keys alphabetically
          </label>
          <div className="row" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!input.trim()}
              onClick={() => run(() => formatJson(input, { indent, sortKeys }))}
            >
              Format
            </button>
            <button type="button" className="btn" disabled={!input.trim()} onClick={() => run(() => minifyJson(input))}>
              Minify
            </button>
          </div>
          <div className="row" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="btn"
              disabled={!input.trim()}
              onClick={() => run(() => escapeForString(input))}
              title="Wrap the document in a quoted, escaped JS string literal"
            >
              Escape as string
            </button>
            <button
              type="button"
              className="btn"
              disabled={!input.trim()}
              onClick={() => run(() => unescapeString(input))}
              title="Parse a quoted string literal back into raw text"
            >
              Unescape
            </button>
          </div>
          <div className="row">
            <button type="button" className="btn" disabled={!output} onClick={copyOutput}>
              {copied ? 'Copied ✓' : 'Copy output'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!output}
              onClick={() => triggerDownload(new Blob([output], { type: 'application/json' }), 'formatted.json')}
            >
              Download .json
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={!output}
              onClick={() => {
                setInput(output)
                setOutput('')
              }}
            >
              Use as input
            </button>
          </div>
          <p className="hint" style={{ marginTop: '1rem' }}>
            Validation runs live as you type. Errors report the exact line and column from the parser.
          </p>
          <SendTo from="json" text={output || input} />
        </aside>
      </div>
    </ToolLayout>
  )
}
