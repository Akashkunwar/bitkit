import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { diffLines, diffStats, unifiedPatch } from '../../lib/diff'
import { formatJson, validateJson } from '../../lib/json'

export default function DiffTool() {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [pretty, setPretty] = useState(false)

  useHandoff((payload) => {
    if (payload.files?.[0]) {
      void payload.files[0].text().then((t) => setLeft(t))
      if (payload.files[1]) void payload.files[1].text().then((t) => setRight(t))
      return
    }
    if (payload.text) setLeft((current) => current || payload.text || '')
  })

  const prepared = useMemo(() => {
    if (!pretty) return { a: left, b: right }
    const fmt = (input: string) => {
      if (!input.trim()) return input
      const result = validateJson(input)
      if (result.error) throw new Error(result.error.message)
      return formatJson(input, { indent: '2' })
    }
    try {
      return { a: fmt(left), b: fmt(right) }
    } catch (err) {
      return { a: left, b: right, fail: err instanceof Error ? err.message : 'JSON pretty-print failed.' }
    }
  }, [left, right, pretty])

  const ops = useMemo(() => diffLines(prepared.a, prepared.b), [prepared])
  const stats = useMemo(() => diffStats(ops), [ops])

  return (
    <ToolLayout
      title="Text diff"
      lede="Line-by-line comparison in this tab. Optional JSON pretty-print before diffing."
    >
      <DropZone
        accept=".txt,.md,.json,text/plain,application/json"
        multiple
        label="Drop one or two text files into the panes."
        onFiles={async (files) => {
          if (files[0]) setLeft(await files[0].text())
          if (files[1]) setRight(await files[1].text())
        }}
      />
      <div className="diff-panes">
        <label className="field">
          <span>Original</span>
          <textarea className="code-area editor" rows={14} spellCheck={false} value={left} onChange={(e) => setLeft(e.target.value)} />
        </label>
        <label className="field">
          <span>Changed</span>
          <textarea className="code-area editor" rows={14} spellCheck={false} value={right} onChange={(e) => setRight(e.target.value)} />
        </label>
      </div>
      <div className="row" style={{ margin: '0.75rem 0' }}>
        <label className="row">
          <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} />
          Pretty-print JSON first
        </label>
        <button
          type="button"
          className="btn"
          disabled={!left && !right}
          onClick={() =>
            triggerDownload(new Blob([unifiedPatch(prepared.a, prepared.b)], { type: 'text/plain' }), 'changes.diff')
          }
        >
          Download unified diff
        </button>
      </div>
      {'fail' in prepared && prepared.fail ? <p className="status-bad">{prepared.fail}</p> : null}
      <p className="hint">
        +{stats.added} −{stats.removed} · {stats.unchanged} unchanged
      </p>
      <pre className="diff-view" aria-label="Diff result">
        {ops.map((op, i) => (
          <span key={i} className={`diff-line diff-${op.type}`}>
            {op.type === 'add' ? '+' : op.type === 'del' ? '-' : ' '}
            {op.text}
            {'\n'}
          </span>
        ))}
      </pre>
      <SendTo from="diff" text={right || left} />
    </ToolLayout>
  )
}
