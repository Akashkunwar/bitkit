import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useCopied } from '../../lib/useCopied'

type Mode = 'graph' | 'privacy' | 'terms'

function escapeAttr(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  )
}

export default function SiteCopyTool() {
  const [mode, setMode] = useState<Mode>('graph')
  const [title, setTitle] = useState('BitKit')
  const [site, setSite] = useState('https://example.com')
  const [description, setDescription] = useState('Tools that run in the browser.')
  const [image, setImage] = useState('https://example.com/og.png')
  const [name, setName] = useState('Northwind Studio')
  const [email, setEmail] = useState('hello@example.com')
  const { copied, copy } = useCopied()

  const output = useMemo(() => {
    if (mode === 'graph') {
      const t = escapeAttr(title)
      const d = escapeAttr(description)
      const u = escapeAttr(site)
      const img = escapeAttr(image)
      return [
        `<meta property="og:title" content="${t}">`,
        `<meta property="og:description" content="${d}">`,
        `<meta property="og:url" content="${u}">`,
        `<meta property="og:image" content="${img}">`,
        `<meta name="twitter:card" content="summary_large_image">`,
      ].join('\n')
    }
    if (mode === 'privacy') {
      return `${name} privacy note\n\n${name} runs this site in your browser. Files and text you use here stay on your device. We do not ask for an account.\n\nContact ${email} if you have a question about this note.\n\nThis is a starting draft. Read it before you publish it.`
    }
    return `${name} terms\n\nYou may use this site for your own work. You keep what you make. ${name} provides the tools as they are, without a promise that a particular file or result will suit a legal, medical, or financial decision.\n\nQuestions: ${email}.\n\nThis is a starting draft. Have someone who knows your situation read it before you publish it.`
  }, [mode, title, site, description, image, name, email])

  return (
    <ToolLayout
      title="Site copy"
      lede="Open Graph tags, plus a privacy note and terms draft filled from a name and an email."
    >
      <Segmented
        label="Draft"
        value={mode}
        options={[
          { value: 'graph', label: 'Open Graph' },
          { value: 'privacy', label: 'Privacy' },
          { value: 'terms', label: 'Terms' },
        ]}
        onChange={setMode}
      />
      <div className="split">
        <section className="panel">
          {mode === 'graph' ? (
            <>
              <Field label="Title" value={title} onChange={setTitle} />
              <Field label="Description" value={description} onChange={setDescription} />
              <Field label="URL" value={site} onChange={setSite} />
              <Field label="Image URL" value={image} onChange={setImage} />
            </>
          ) : (
            <>
              <Field label="Name" value={name} onChange={setName} />
              <Field label="Email" value={email} onChange={setEmail} />
            </>
          )}
        </section>
        <aside className="panel">
          <textarea className="code-area" rows={14} readOnly value={output} />
          <button type="button" className="btn btn-primary" onClick={() => void copy(output, 'copy')}>
            {copied === 'copy' ? 'Copied ✓' : 'Copy'}
          </button>
        </aside>
      </div>
    </ToolLayout>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="text-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
