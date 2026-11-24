import { useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { downloadNamed } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { cropPdf, extractPages, inspectPdf, mergePdfs, parsePageRange, splitPdf } from '../../lib/pdfPages'
import { encryptionWarning } from '../../lib/pdfLoad'
import { zipStore } from '../../lib/zip'

type Item = { id: string; file: File; bytes: Uint8Array; pages: number; encrypted: boolean }

export default function PagesTool() {
  const [items, setItems] = useState<Item[]>([])
  const [range, setRange] = useState('1-')
  const [top, setTop] = useState(36)
  const [right, setRight] = useState(36)
  const [bottom, setBottom] = useState(36)
  const [left, setLeft] = useState(36)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [merged, setMerged] = useState<File | null>(null)
  const runId = useRef(0)

  const addFiles = async (files: File[]) => {
    const token = ++runId.current
    setBusy(false)
    const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    const next: Item[] = []
    for (const file of pdfs) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { pages, encrypted } = await inspectPdf(bytes)
      next.push({ id: crypto.randomUUID(), file, bytes, pages, encrypted })
    }
    setItems((prev) => [...prev, ...next])
    if (runId.current === token) setMerged(null)
  }

  useHandoff((payload) => {
    if (payload.files?.length) void addFiles(payload.files)
  })

  const totalPages = useMemo(() => items.reduce((n, item) => n + item.pages, 0), [items])
  const anyEncrypted = items.some((item) => item.encrypted)
  const encryptNote = encryptionWarning(anyEncrypted)

  const run = async (kind: 'merge' | 'extract' | 'split' | 'crop') => {
    if (!items.length) return
    const token = ++runId.current
    setBusy(true)
    setError(null)
    try {
      if (kind === 'merge') {
        const bytes = await mergePdfs(items.map((item) => item.bytes))
        if (runId.current !== token) return
        const bytesBlob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
        const name = await downloadNamed(bytesBlob, 'merged.pdf')
        if (runId.current !== token) return
        if (name) setMerged(new File([bytesBlob], name, { type: 'application/pdf' }))
        return
      }
      if (kind === 'extract') {
        const source = items[0]
        const spec = range.replace(/-$/, `-${source.pages}`)
        const indices = parsePageRange(spec, source.pages)
        const bytes = await extractPages(source.bytes, indices)
        if (runId.current !== token) return
        await downloadNamed(
          new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }),
          'extracted.pdf',
        )
        return
      }
      if (kind === 'crop') {
        const bytes = await cropPdf(items[0].bytes, { top, right, bottom, left })
        if (runId.current !== token) return
        await downloadNamed(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }), 'cropped.pdf')
        return
      }
      const parts = await splitPdf(items[0].bytes)
      if (runId.current !== token) return
      const zip = zipStore(
        parts.map((part) => ({
          name: `page-${String(part.index + 1).padStart(2, '0')}.pdf`,
          data: part.bytes,
        })),
      )
      await downloadNamed(new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }), 'pages.zip')
    } catch (err) {
      if (runId.current !== token) return
      setError(err instanceof Error ? err.message : 'PDF operation failed.')
    } finally {
      if (runId.current === token) setBusy(false)
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
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  runId.current += 1
                  setBusy(false)
                  setItems((prev) => prev.filter((p) => p.id !== item.id))
                }}
              >
                Remove
              </button>
            </div>
          ))}
          {items.length ? (
            <p className="hint">
              {items.length} file{items.length === 1 ? '' : 's'} · {totalPages} pages
            </p>
          ) : null}
        </section>
        <aside className="panel">
          <label className="field">
            <span>Extract range (first file)</span>
            <input value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-3,5" />
          </label>
          <div className="row" style={{ marginBottom: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!items.length || busy}
              onClick={() => void run('merge')}
            >
              Merge
            </button>
            <button
              type="button"
              className="btn"
              disabled={items.length !== 1 || busy}
              onClick={() => void run('extract')}
            >
              Extract
            </button>
            <button
              type="button"
              className="btn"
              disabled={items.length !== 1 || busy}
              onClick={() => void run('split')}
            >
              Split to ZIP
            </button>
          </div>
          <p className="hint">Crop margins are in points, measured inward from each edge. 72 points is one inch.</p>
          <div className="row">
            {(
              [
                ['Top', top, setTop],
                ['Right', right, setRight],
                ['Bottom', bottom, setBottom],
                ['Left', left, setLeft],
              ] as const
            ).map(([label, value, set]) => (
              <label className="field" key={label}>
                <span>{label}</span>
                <input
                  className="text-input"
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          <button type="button" className="btn" disabled={items.length !== 1 || busy} onClick={() => void run('crop')}>
            Crop pages
          </button>
          {error ? <p className="status-bad">{error}</p> : null}
          {encryptNote ? (
            <p className="banner warn">{encryptNote}</p>
          ) : (
            <p className="hint">
              Encrypted PDFs are not decrypted here. Unlock them in a reader first if pages come out blank.
            </p>
          )}
          <SendTo from="pages" files={merged ? [merged] : items.map((item) => item.file)} />
        </aside>
      </div>
    </ToolLayout>
  )
}
