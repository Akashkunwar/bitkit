import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { extractPages, mergePdfs, parsePageRange, pdfPageCount, splitPdf } from '../../lib/pdfPages'
import { zipStore } from '../../lib/zip'

type Item = { id: string; file: File; bytes: Uint8Array; pages: number }

export default function PagesTool() {
  const [items, setItems] = useState<Item[]>([])
  const [range, setRange] = useState('1-')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [merged, setMerged] = useState<File | null>(null)

  const addFiles = async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    const next: Item[] = []
    for (const file of pdfs) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const pages = await pdfPageCount(bytes)
      next.push({ id: crypto.randomUUID(), file, bytes, pages })
    }
    setItems((prev) => [...prev, ...next])
    setMerged(null)
  }

  useHandoff((payload) => {
    if (payload.files?.length) void addFiles(payload.files)
  })

  const totalPages = useMemo(() => items.reduce((n, item) => n + item.pages, 0), [items])

  const run = async (kind: 'merge' | 'extract' | 'split') => {
    if (!items.length) return
    setBusy(true)
    setError(null)
    try {
      if (kind === 'merge') {
        const bytes = await mergePdfs(items.map((item) => item.bytes))
        const file = new File([bytes.slice().buffer as ArrayBuffer], 'merged.pdf', { type: 'application/pdf' })
        setMerged(file)
        triggerDownload(file, file.name)
        return
      }
      if (kind === 'extract') {
        const source = items[0]
        const spec = range.replace(/-$/, `-${source.pages}`)
        const indices = parsePageRange(spec, source.pages)
        const bytes = await extractPages(source.bytes, indices)
        triggerDownload(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }), 'extracted.pdf')
        return
      }
      const parts = await splitPdf(items[0].bytes)
      const zip = zipStore(
        parts.map((part) => ({
          name: `page-${String(part.index + 1).padStart(2, '0')}.pdf`,
          data: part.bytes,
        })),
      )
      triggerDownload(new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }), 'pages.zip')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF operation failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="PDF merge & split"
      lede="Combine PDFs, extract a page range, or split into one file per page. Nothing is uploaded."
    >
      <DropZone
        accept="application/pdf,.pdf"
        multiple
        label="Drop one or more PDFs."
        hint="Merge uses every file in order. Extract and split use the first file."
        onFiles={(files) => void addFiles(files)}
      />
      <div className="split">
        <section className="panel">
          {!items.length ? <p className="muted">No PDFs queued.</p> : null}
          {items.map((item, index) => (
            <div key={item.id} className="result-row">
              <code>
                {index + 1}. {item.file.name} · {item.pages} page{item.pages === 1 ? '' : 's'}
              </code>
              <button type="button" className="btn-ghost" onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}>
                Remove
              </button>
            </div>
          ))}
          {items.length ? <p className="hint">{items.length} file{items.length === 1 ? '' : 's'} · {totalPages} pages</p> : null}
        </section>
        <aside className="panel">
          <label className="field">
            <span>Extract range (first file)</span>
            <input value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-3,5" />
          </label>
          <div className="row" style={{ marginBottom: '0.75rem' }}>
            <button type="button" className="btn btn-primary" disabled={!items.length || busy} onClick={() => void run('merge')}>
              Merge
            </button>
            <button type="button" className="btn" disabled={items.length !== 1 || busy} onClick={() => void run('extract')}>
              Extract
            </button>
            <button type="button" className="btn" disabled={items.length !== 1 || busy} onClick={() => void run('split')}>
              Split to ZIP
            </button>
          </div>
          {error ? <p className="status-bad">{error}</p> : null}
          <p className="hint">Encrypted PDFs open when the browser can ignore the flag; passwords are not cracked.</p>
          <SendTo from="pages" files={merged ? [merged] : items.map((item) => item.file)} />
        </aside>
      </div>
    </ToolLayout>
  )
}
