import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import { useHandoff } from '../../lib/useHandoff'
import { LIST_OPS } from '../../lib/lists'

const SAMPLE = 'red\nblue\ngreen\nblue'

export default function ListsTool() {
  const [id, setId] = useState(LIST_OPS[0].id)
  const [input, setInput] = useState(SAMPLE)
  const [extra, setExtra] = useState('blue\nyellow')
  const op = LIST_OPS.find((item) => item.id === id) ?? LIST_OPS[0]
  const { copied, copy } = useCopied()
  useHandoff((payload) => {
    if (payload.text) setInput(payload.text)
  })

  const result = useMemo(() => {
    try {
      return { text: op.run(input, extra), error: null as string | null }
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : 'Could not change that list.' }
    }
  }, [op, input, extra])

  const choose = (nextId: string) => {
    const next = LIST_OPS.find((item) => item.id === nextId) ?? LIST_OPS[0]
    setId(next.id)
    setExtra(next.extra?.sample ?? (next.second ? 'blue\nyellow' : ''))
  }

  return (
    <ToolLayout title="Lists" lede="Difference, overlap, duplicates, columns, and a prefix on every line.">
      <label className="field">
        <span>Operation</span>
        <select className="text-input" value={op.id} onChange={(event) => choose(event.target.value)}>
          {LIST_OPS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">{op.hint}</p>
      <div className="split">
        <label className="field">
          <span>{op.second ? 'List A' : 'List'}</span>
          <textarea className="text-input" rows={10} value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        {op.second || op.extra ? (
          <label className="field">
            <span>{op.second ?? op.extra?.label}</span>
            <textarea
              className="text-input"
              rows={10}
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
            />
          </label>
        ) : null}
      </div>
      {result.error ? (
        <p className="status-bad" role="alert">
          {result.error}
        </p>
      ) : (
        <>
          <label className="field">
            <span>Result</span>
            <textarea className="text-input" rows={8} readOnly value={result.text} />
          </label>
          <button type="button" className="btn" disabled={!result.text} onClick={() => void copy(result.text)}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </>
      )}
    </ToolLayout>
  )
}
