import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'

const PAIRS = [
  { id: 'editorial', label: 'Editorial', heading: 'Georgia, "Times New Roman", serif', body: 'system-ui, sans-serif' },
  { id: 'news', label: 'News', heading: '"Palatino Linotype", Palatino, serif', body: 'Georgia, serif' },
  { id: 'product', label: 'Product', heading: 'system-ui, sans-serif', body: 'system-ui, sans-serif' },
  { id: 'mono', label: 'Studio', heading: 'ui-sans-serif, system-ui, sans-serif', body: 'ui-monospace, monospace' },
  { id: 'poster', label: 'Poster', heading: 'Impact, "Arial Narrow", sans-serif', body: 'Georgia, serif' },
  { id: 'soft', label: 'Soft', heading: '"Trebuchet MS", sans-serif', body: 'Verdana, sans-serif' },
]

export default function PairsTool() {
  const [pair, setPair] = useState(PAIRS[0].id)
  const [heading, setHeading] = useState('The quiet tools')
  const [body, setBody] = useState('A headline and a paragraph, set in fonts this browser already has.')
  const chosen = PAIRS.find((item) => item.id === pair) ?? PAIRS[0]
  const css = `h1 { font-family: ${chosen.heading}; }\np { font-family: ${chosen.body}; }`
  const { copied, copy } = useCopied()

  return (
    <ToolLayout title="Font pairs" lede="Heading and body stacks from fonts already on this machine.">
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>Pair</span>
            <select className="text-input" value={pair} onChange={(e) => setPair(e.target.value)}>
              {PAIRS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Heading</span>
            <input className="text-input" value={heading} onChange={(e) => setHeading(e.target.value)} />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea className="code-area editor" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <button type="button" className="btn" onClick={() => void copy(css, 'css')}>
            {copied === 'css' ? 'Copied ✓' : 'Copy CSS'}
          </button>
        </section>
        <aside className="panel">
          <h2 style={{ fontFamily: chosen.heading, fontSize: '2.4rem', lineHeight: 1.1 }}>{heading}</h2>
          <p style={{ fontFamily: chosen.body, fontSize: '1.05rem' }}>{body}</p>
        </aside>
      </div>
    </ToolLayout>
  )
}
