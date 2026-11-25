import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import { apaCitation, chicagoCitation, mlaCitation, type Citation } from '../../lib/cite'

const SAMPLE: Citation = {
  authors: 'Ada Lovelace',
  year: '1843',
  title: 'Notes on the Analytical Engine',
  container: '',
  publisher: 'Taylor and Francis',
  url: '',
  accessed: '',
}

export default function CiteTool() {
  const [source, setSource] = useState<Citation>(SAMPLE)
  const { copied, copy } = useCopied()
  const set = (key: keyof Citation) => (value: string) => setSource((prev) => ({ ...prev, [key]: value }))
  const lines = useMemo(
    () => [
      ['APA', apaCitation(source)],
      ['MLA', mlaCitation(source)],
      ['Chicago', chicagoCitation(source)],
    ],
    [source],
  )

  return (
    <ToolLayout
      title="Citations"
      lede="A reference in APA, MLA, and Chicago from the same source. Names are written as First Last."
    >
      <div className="split">
        <Field label="Authors" value={source.authors} onChange={set('authors')} />
        <Field label="Year" value={source.year} onChange={set('year')} />
        <Field label="Title" value={source.title} onChange={set('title')} />
        <Field label="Site or journal" value={source.container} onChange={set('container')} />
        <Field label="Publisher" value={source.publisher} onChange={set('publisher')} />
        <Field label="URL" value={source.url} onChange={set('url')} />
        <Field label="Accessed" value={source.accessed} onChange={set('accessed')} />
      </div>
      {lines.map(([label, text]) => (
        <section className="panel" key={label}>
          <div className="row">
            <strong>{label}</strong>
            <button type="button" className="btn" onClick={() => void copy(text, label)}>
              {copied === label ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
        </section>
      ))}
    </ToolLayout>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="text-input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
