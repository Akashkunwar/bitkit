import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { filesFromBlobs } from '../../lib/handoff'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { fillForm, listFormFields, type FormFieldView } from '../../lib/pdfForm'

export default function FormsTool() {
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [fields, setFields] = useState<FormFieldView[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filled, setFilled] = useState<Blob | null>(null)

  const load = async (next: File) => {
    setBusy(true)
    setError(null)
    setFilled(null)
    try {
      const raw = new Uint8Array(await next.arrayBuffer())
      const listed = await listFormFields(raw)
      setFile(next)
      setBytes(raw)
      setFields(listed)
      setValues(Object.fromEntries(listed.map((f) => [f.name, f.value])))
      if (!listed.length) setError('No AcroForm fields found. Scanned PDFs and flattened forms cannot be filled here.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that PDF.')
    } finally {
      setBusy(false)
    }
  }

  useHandoff((payload) => {
    const pdf = payload.files?.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (pdf) void load(pdf)
  })

  const save = async () => {
    if (!bytes) return
    setBusy(true)
    setError(null)
    try {
      const out = await fillForm(bytes, values)
      setFilled(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fill failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="PDF form fill"
      lede="Fill AcroForm fields in this tab, then download the result. Encrypted or flattened forms may not work."
    >
      <div className="split">
        <section className="panel">
          <DropZone accept="application/pdf,.pdf" label="Drop a fillable PDF." onFiles={(files) => files[0] && void load(files[0])} />
          {file ? <p className="hint" style={{ marginTop: '0.8rem' }}>{file.name} · {fields.length} field{fields.length === 1 ? '' : 's'}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
          {fields.length ? (
            <div style={{ marginTop: '1rem' }}>
              {fields.map((field) => (
                <label key={field.name} className="field">
                  <span>
                    {field.name} · {field.type}
                  </span>
                  {field.type === 'checkbox' ? (
                    <label className="row">
                      <input
                        type="checkbox"
                        checked={values[field.name] === 'true'}
                        onChange={(e) => setValues((cur) => ({ ...cur, [field.name]: e.target.checked ? 'true' : 'false' }))}
                      />
                      Checked
                    </label>
                  ) : field.options?.length ? (
                    <select
                      value={values[field.name] ?? ''}
                      onChange={(e) => setValues((cur) => ({ ...cur, [field.name]: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="text-input"
                      value={values[field.name] ?? ''}
                      onChange={(e) => setValues((cur) => ({ ...cur, [field.name]: e.target.value }))}
                    />
                  )}
                </label>
              ))}
            </div>
          ) : null}
        </section>
        <aside className="panel">
          <button type="button" className="btn btn-primary" disabled={!bytes || !fields.length || busy} onClick={() => void save()}>
            {busy ? 'Working…' : 'Fill and preview download'}
          </button>
          {filled ? (
            <button
              type="button"
              className="btn"
              style={{ marginTop: '0.8rem' }}
              onClick={() => triggerDownload(filled, file?.name.replace(/\.pdf$/i, '') + '-filled.pdf')}
            >
              Download filled PDF
            </button>
          ) : (
            <p className="hint" style={{ marginTop: '1rem' }}>
              Values stay in memory until you download. XFA and signed forms are out of scope.
            </p>
          )}
          <SendTo
            from="forms"
            files={
              filled
                ? filesFromBlobs([{ blob: filled, name: 'filled.pdf' }])
                : file
                  ? [file]
                  : undefined
            }
          />
        </aside>
      </div>
    </ToolLayout>
  )
}
