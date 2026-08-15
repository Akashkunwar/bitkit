import { useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { emptyRegexResult, type RegexResult } from '../../lib/regex'
import { disposeRegexWorker, runRegexSafely } from '../../lib/regexClient'

const SAMPLE = `BitKit keeps files on this device.
Contact: asha@example.com and rohan@kit.local
UTC unix 1710000000`

export default function RegexTool() {
  const [pattern, setPattern] = useState('[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}')
  const [flags, setFlags] = useState('gi')
  const [text, setText] = useState(SAMPLE)
  const [replace, setReplace] = useState('[$1]')
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setText(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setText)
  })

  const [result, setResult] = useState<RegexResult>(() => emptyRegexResult(flags, text))
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let live = true
    setRunning(true)
    void runRegexSafely(pattern, flags, text, replace).then((next) => {
      if (!live) return
      setResult(next)
      setRunning(false)
    })
    return () => {
      live = false
    }
  }, [pattern, flags, text, replace])

  useEffect(() => disposeRegexWorker, [])

  const highlighted = useMemo(() => {
    if (!text || result.error || !result.hits.length) return null
    const parts: { text: string; hit: boolean }[] = []
    let cursor = 0
    for (const hit of result.hits) {
      if (hit.index < cursor) continue
      if (hit.index > cursor) parts.push({ text: text.slice(cursor, hit.index), hit: false })
      parts.push({ text: hit.text, hit: true })
      cursor = hit.index + hit.text.length
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })
    return parts
  }, [text, result])

  return (
    <ToolLayout
      title="Regex tester"
      lede="Match, capture groups, and replace. The engine is this browser’s RegExp — no server, 2,000-match cap."
    >
      <div className="split">
        <section className="panel">
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Pattern</span>
              <input className="text-input" value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false} />
            </label>
            <label className="field" style={{ width: '6rem' }}>
              <span>Flags</span>
              <input className="text-input" value={flags} onChange={(e) => setFlags(e.target.value)} spellCheck={false} />
            </label>
          </div>
          <label className="field">
            <span>Haystack</span>
            <textarea className="code-area editor" rows={10} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          </label>
          <label className="field">
            <span>Replace with</span>
            <input className="text-input" value={replace} onChange={(e) => setReplace(e.target.value)} spellCheck={false} />
          </label>
          {running ? (
            <p className="hint">Matching…</p>
          ) : result.error ? (
            <p className="status-bad">{result.error}</p>
          ) : (
            <p className="status-ok">
              {result.hits.length} match{result.hits.length === 1 ? '' : 'es'} · flags {result.flags}
            </p>
          )}
          {highlighted ? (
            <pre className="regex-preview" aria-label="Highlighted matches">
              {highlighted.map((part, i) => (
                <span key={i} className={part.hit ? 'regex-hit' : undefined}>
                  {part.text}
                </span>
              ))}
            </pre>
          ) : null}
        </section>
        <aside className="panel">
          <h3>Groups</h3>
          {result.hits.length ? (
            <table className="zone-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Index</th>
                  <th>Match</th>
                  <th>Groups</th>
                </tr>
              </thead>
              <tbody>
                {result.hits.slice(0, 80).map((hit, i) => (
                  <tr key={`${hit.index}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{hit.index}</td>
                    <td>{hit.text}</td>
                    <td>{hit.groups.join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="hint">No matches yet.</p>
          )}
          <label className="field" style={{ marginTop: '1rem' }}>
            <span>Replaced text</span>
            <textarea className="code-area" rows={8} readOnly value={result.replaced} />
          </label>
          <div className="row">
            <button type="button" className="btn" disabled={!result.replaced} onClick={() => void copy(result.replaced, 'rep')}>
              {copied === 'rep' ? 'Copied ✓' : 'Copy replaced'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => triggerDownload(new Blob([result.replaced], { type: 'text/plain' }), 'replaced.txt')}
            >
              Download
            </button>
          </div>
          <SendTo from="regex" text={result.replaced || text} />
        </aside>
      </div>
    </ToolLayout>
  )
}
