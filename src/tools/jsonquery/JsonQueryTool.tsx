import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { useI18n } from '../../lib/i18n'
import { formatQueryResult, queryJson } from '../../lib/jsonQuery'

const SAMPLE = `{
  "store": {
    "book": [
      { "title": "Local", "price": 8 },
      { "title": "Remote", "price": 12 }
    ]
  }
}`

export default function JsonQueryTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [input, setInput] = useState(SAMPLE)
  const [path, setPath] = useState('$.store.book[?(@.price<10)].title')
  const { copied: didCopy, copy: copyText } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setInput(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setInput)
  })

  const result = useMemo(() => {
    if (!input.trim() || !path.trim()) return { text: '', error: null as string | null, count: 0 }
    try {
      const data = JSON.parse(input) as unknown
      const matches = queryJson(data, path)
      return { text: formatQueryResult(matches), error: null, count: matches.length }
    } catch (err) {
      return {
        text: '',
        error:
          err instanceof Error ? err.message : language === 'hi' ? 'यह क्वेरी नहीं चली।' : 'Could not run that query.',
        count: 0,
      }
    }
  }, [input, path, language])

  return (
    <ToolLayout title="JSON query" lede="Pull fields out of a JSON value with a short path. Parsing stays in this tab.">
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>{L('JSON', 'JSON')}</span>
            <textarea
              className="code-area editor"
              rows={14}
              spellCheck={false}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </label>
        </section>
        <aside className="panel">
          <label className="field">
            <span>{L('Path', 'पथ')}</span>
            <input
              value={path}
              spellCheck={false}
              onChange={(e) => setPath(e.target.value)}
              placeholder="$.store.book[*].title"
            />
          </label>
          <p className="hint">
            {L(
              '$.a.b, $.items[0], $.items[*].name, or $.items[?(@.price<10)].name',
              '$.a.b, $.items[0], $.items[*].name, या $.items[?(@.price<10)].name',
            )}
          </p>
          {result.error ? (
            <p className="status-bad">{result.error}</p>
          ) : (
            <p className="status-ok">
              {L(`${result.count} match${result.count === 1 ? '' : 'es'}`, `${result.count} नतीजे`)}
            </p>
          )}
          <label className="field">
            <span>{L('Result', 'नतीजा')}</span>
            <textarea className="code-area editor" rows={10} readOnly spellCheck={false} value={result.text} />
          </label>
          <button type="button" className="btn" disabled={!result.text} onClick={() => void copyText(result.text)}>
            {didCopy ? L('Copied', 'कॉपी हो गया') : L('Copy result', 'नतीजा कॉपी करें')}
          </button>
        </aside>
      </div>
    </ToolLayout>
  )
}
