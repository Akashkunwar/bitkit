import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { saveAs } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { formatBytes, parseByteLimit } from '../../lib/format'
import { repackPdf, shrinkPdf, stripPdfMetadata, type ShrinkPreset } from '../../lib/pdfShrink'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const PRESETS: { value: ShrinkPreset; label: string }[] = [
  { value: 'screen', label: 'Screen · 100 dpi' },
  { value: 'ebook', label: 'Reading · 150 dpi' },
  { value: 'print', label: 'Print · 220 dpi' },
]

type Output = { blob: Blob; name: string; withinLimit: boolean; pages: number }

export default function ShrinkTool() {
  const [file, setFile] = useState<File | null>(null)
  const [preset, setPreset] = useState<ShrinkPreset>('ebook')
  const [limit, setLimit] = useState('2mb')
  const [grayscale, setGrayscale] = useState(false)
  const [lossless, setLossless] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<Output | null>(null)
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null)

  const take = (next: File) => {
    setFile(next)
    setOutput(null)
    setError(null)
    setStatus(null)
  }

  useHandoff((payload) => {
    const pdf = payload.files?.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (pdf) take(pdf)
  })

  useEffect(() => {
    return () => {
      void taskRef.current?.destroy()
      taskRef.current = null
    }
  }, [])

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    setOutput(null)
    try {
      const source = new Uint8Array(await file.arrayBuffer())
      const maxBytes = parseByteLimit(limit)
      const name = `${file.name.replace(/\.pdf$/i, '')}-smaller.pdf`

      if (lossless) {
        setStatus('Rewriting the document…')
        const stripped = await stripPdfMetadata(await repackPdf(source))
        const blob = new Blob([stripped.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
        setOutput({ blob, name, withinLimit: !maxBytes || blob.size <= maxBytes, pages: 0 })
        return
      }

      // pdf.js transfers and detaches the buffer it is handed, so pass a copy.
      const task = pdfjs.getDocument({ data: source.slice() })
      taskRef.current = task
      const doc = await task.promise
      const result = await shrinkPdf(doc, { preset, maxBytes, grayscale }, ({ page, pages, pass }) =>
        setStatus(`Pass ${pass} · page ${page} of ${pages}`),
      )
      const blob = new Blob([result.bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
      setOutput({ blob, name, withinLimit: result.withinLimit, pages: result.pages })
      await task.destroy()
      taskRef.current = null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not shrink this PDF.')
    } finally {
      setBusy(false)
      setStatus(null)
    }
  }

  const saved = file && output ? file.size - output.blob.size : 0
  const percent = file && output && file.size ? Math.round((saved / file.size) * 100) : 0

  return (
    <ToolLayout
      title="PDF shrink"
      lede="Get a scan or export under an upload limit. Pages are re-rendered in this tab; nothing is sent anywhere."
    >
      <DropZone
        accept="application/pdf,.pdf"
        label="Drop a PDF to shrink."
        hint="Large scans benefit most. Text stops being selectable unless you pick lossless."
        onFiles={(files) => {
          const pdf = files.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
          if (pdf) take(pdf)
          else setError('That is not a PDF.')
        }}
      />

      {file ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <p className="hint">
            {file.name} · {formatBytes(file.size)}
          </p>

          <label className="row" style={{ marginTop: '0.6rem' }}>
            <input type="checkbox" checked={lossless} onChange={(e) => setLossless(e.target.checked)} />
            Lossless only — rewrite and strip metadata, keep text selectable
          </label>

          {!lossless ? (
            <>
              <Segmented label="Quality preset" value={preset} options={PRESETS} onChange={setPreset} />
              <label className="field">
                <span>Target size — blank for no ceiling</span>
                <input className="text-input" value={limit} placeholder="2mb" onChange={(e) => setLimit(e.target.value)} />
              </label>
              <label className="row">
                <input type="checkbox" checked={grayscale} onChange={(e) => setGrayscale(e.target.checked)} />
                Convert to grayscale — usually a large extra saving on scans
              </label>
            </>
          ) : null}

          <div className="row" style={{ marginTop: '0.9rem' }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void run()}>
              {busy ? 'Working…' : 'Shrink PDF'}
            </button>
            {output ? (
              <button type="button" className="btn" onClick={() => void saveAs(output.blob, output.name)}>
                Save PDF
              </button>
            ) : null}
          </div>

          {status ? <p className="hint">{status}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}

          {output ? (
            <>
              <div className="pill-row" style={{ marginTop: '0.9rem' }}>
                <span className="pill">Was {formatBytes(file.size)}</span>
                <span className="pill">Now {formatBytes(output.blob.size)}</span>
                <span className="pill">{saved > 0 ? `−${percent}%` : 'No saving'}</span>
                {output.pages ? <span className="pill">{output.pages} pages</span> : null}
              </div>
              {saved <= 0 ? (
                <p className="hint">
                  This PDF is already well compressed — re-rendering made it larger, so keep the original.
                </p>
              ) : !output.withinLimit ? (
                <p className="status-bad">
                  Could not reach {limit} even at the lowest setting. Try grayscale, the screen preset, or split the
                  file first.
                </p>
              ) : (
                <p className="status-ok">Ready to download.</p>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      {output ? (
        <SendTo from="shrink" files={[new File([output.blob], output.name, { type: 'application/pdf' })]} />
      ) : null}
    </ToolLayout>
  )
}
