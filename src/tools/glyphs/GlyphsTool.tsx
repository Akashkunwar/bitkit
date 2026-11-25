import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import { useHandoff } from '../../lib/useHandoff'
import { GLYPH_OPS } from '../../lib/glyphs'

export default function GlyphsTool() {
  const [id, setId] = useState(GLYPH_OPS[0].id)
  const [input, setInput] = useState('Café — naïve résumé')
  const op = GLYPH_OPS.find((item) => item.id === id) ?? GLYPH_OPS[0]
  const { copied, copy } = useCopied()
  useHandoff((payload) => {
    if (payload.text) setInput(payload.text)
  })

  const result = useMemo(() => {
    try {
      return { text: op.run(input), error: null as string | null }
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : 'Could not transform that text.' }
    }
  }, [op, input])

  return (
    <ToolLayout
      title="Glyphs"
      lede="Accents, code points, invisible characters, pig Latin, leet, and addresses pulled out of a paste."
    >
      <label className="field">
        <span>Transform</span>
        <select className="text-input" value={op.id} onChange={(event) => setId(event.target.value)}>
          {GLYPH_OPS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">{op.hint}</p>
      <label className="field">
        <span>Text</span>
        <textarea className="text-input" rows={8} value={input} onChange={(event) => setInput(event.target.value)} />
      </label>
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
