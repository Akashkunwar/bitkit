import { useCallback, useRef, useState } from 'react'
import { pdfjs } from '../../lib/pdfjsRuntime'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { downloadNamed, triggerDownload } from '../../lib/download'
import { zipStore } from '../../lib/zip'
import { useToolPreset } from '../../lib/actions'
import { formatBytes, parseByteLimit } from '../../lib/format'
import { encryptionWarning, loadPdf } from '../../lib/pdfLoad'
import { destroyPdfJs, isPdfPasswordError, openPdfJs } from '../../lib/pdfJs'
import { PdfPassword } from '../../components/PdfPassword'
import { repackPdf, shrinkPdf, stripPdfMetadata, type ShrinkPreset } from '../../lib/pdfShrink'
import { shrinkStateFromPreset } from '../../lib/toolPresets'
import { useHandoff } from '../../lib/useHandoff'

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
  const [encrypted, setEncrypted] = useState(false)
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [queue, setQueue] = useState<File[]>([])
  const runId = useRef(0)
  const loadId = useRef(0)

  const take = (next: File) => {
    const load = ++loadId.current
    runId.current += 1
    setBusy(false)
    setFile(next)
    setOutput(null)
    setError(null)
    setStatus(null)
    setEncrypted(false)
    setNeedsPassword(false)
    setPassword('')
    void next.arrayBuffer().then(async (buf) => {
      if (loadId.current !== load) return
      try {
        const { encrypted: locked } = await loadPdf(new Uint8Array(buf))
        if (loadId.current !== load) return
        setEncrypted(locked)
        if (locked) setNeedsPassword(true)
      } catch {
        if (loadId.current !== load) return
        setEncrypted(false)
      }
    })
  }

  useHandoff((payload) => {
    const pdf = payload.files?.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (pdf) take(pdf)
  })

  const applyLimit = useCallback((preset: { limit?: unknown }) => {
    const next = shrinkStateFromPreset(preset)
    if (next.limit) setLimit(next.limit)
  }, [])
  useToolPreset('shrink', applyLimit)

  const run = async () => {
    if (!file) return
    const token = ++runId.current
    setBusy(true)
    setError(null)
    setOutput(null)
    try {
      const source = new Uint8Array(await file.arrayBuffer())
      if (runId.current !== token) return
      const maxBytes = parseByteLimit(limit)
      const name = `${file.name.replace(/\.pdf$/i, '')}-smaller.pdf`

      if (lossless) {
        if (encrypted) {
          throw new Error(
            'Lossless rewrite cannot decrypt a passworded PDF. Turn lossless off and enter the password, or unlock the file in a reader first.',
          )
        }
        setStatus('Rewriting the document…')
        const packed = await repackPdf(source)
        if (runId.current !== token) return
        const stripped = await stripPdfMetadata(packed)
        if (runId.current !== token) return
        const blob = new Blob([stripped.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
        setOutput({ blob, name, withinLimit: !maxBytes || blob.size <= maxBytes, pages: 0 })
        return
      }

      // pdf.js transfers and detaches the buffer it is handed, so pass a copy.
      const doc = await openPdfJs(pdfjs, source, password || undefined)
      if (runId.current !== token) {
        await destroyPdfJs(doc)
        return
      }
      const result = await shrinkPdf(doc, { preset, maxBytes, grayscale }, ({ page, pages, pass }) => {
        if (runId.current === token) setStatus(`Pass ${pass} · page ${page} of ${pages}`)
      })
      if (runId.current !== token) {
        await destroyPdfJs(doc)
        return
      }
      const blob = new Blob([result.bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
      setOutput({ blob, name, withinLimit: result.withinLimit, pages: result.pages })
      await destroyPdfJs(doc)
      if (runId.current !== token) return
      setNeedsPassword(false)
    } catch (err) {
      if (runId.current !== token) return
      if (isPdfPasswordError(err)) {
        setNeedsPassword(true)
        setError(err.message)
        return
      }
      setError(err instanceof Error ? err.message : 'Could not shrink this PDF.')
    } finally {
      if (runId.current === token) {
        setBusy(false)
        setStatus(null)
      }
    }
  }

  const shrinkQueue = async () => {
    if (queue.length < 2) return
    const token = ++runId.current
    const batch = queue
    setBusy(true)
    setError(null)
    try {
      const entries: { name: string; data: Uint8Array }[] = []
      for (const next of batch) {
        if (runId.current !== token) return
        setStatus(next.name)
        const source = new Uint8Array(await next.arrayBuffer())
        if (runId.current !== token) return
        const doc = await openPdfJs(pdfjs, source, password || undefined)
        try {
          if (runId.current !== token) return
          const result = await shrinkPdf(doc, { preset, maxBytes: parseByteLimit(limit), grayscale })
          if (runId.current !== token) return
          entries.push({ name: `${next.name.replace(/\.pdf$/i, '')}-smaller.pdf`, data: result.bytes })
        } finally {
          await destroyPdfJs(doc)
        }
      }
      if (runId.current !== token) return
      const zip = zipStore(entries)
      triggerDownload(new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }), 'smaller-pdfs.zip')
    } catch (err) {
      if (runId.current !== token) return
      if (isPdfPasswordError(err)) {
        setNeedsPassword(true)
        setError(err.message)
        return
      }
      setError(err instanceof Error ? err.message : 'Could not shrink that batch.')
    } finally {
      if (runId.current === token) {
        setBusy(false)
        setStatus(null)
      }
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
        multiple
        onFiles={(files) => {
          const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
          if (pdfs.length > 1) {
            runId.current += 1
            setBusy(false)
            setStatus(null)
            setQueue(pdfs)
            setFile(null)
            setOutput(null)
            setError(null)
            return
          }
          setQueue([])
          if (pdfs[0]) take(pdfs[0])
          else {
            runId.current += 1
            setBusy(false)
            setStatus(null)
            setError('That is not a PDF.')
          }
        }}
      />

      {file || queue.length > 1 ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <p className="hint">
            {queue.length > 1
              ? `${queue.length} PDFs · ${formatBytes(queue.reduce((sum, item) => sum + item.size, 0))}`
              : file
                ? `${file.name} · ${formatBytes(file.size)}`
                : ''}
          </p>
          {encryptionWarning(encrypted, 'pdfjs') ? (
            <p className="banner warn">{encryptionWarning(encrypted, 'pdfjs')}</p>
          ) : null}
          {needsPassword ? (
            <PdfPassword
              value={password}
              onChange={setPassword}
              busy={busy}
              error={error}
              onUnlock={() => void (queue.length > 1 ? shrinkQueue() : run())}
            />
          ) : null}

          <label className="row" style={{ marginTop: '0.6rem' }}>
            <input type="checkbox" checked={lossless} onChange={(e) => setLossless(e.target.checked)} />
            Lossless only — rewrite and strip metadata, keep text selectable
          </label>

          {!lossless ? (
            <>
              <Segmented label="Quality preset" value={preset} options={PRESETS} onChange={setPreset} />
              <label className="field">
                <span>Target size — blank for no ceiling</span>
                <input
                  className="text-input"
                  value={limit}
                  placeholder="2mb"
                  onChange={(e) => setLimit(e.target.value)}
                />
              </label>
              <label className="row">
                <input type="checkbox" checked={grayscale} onChange={(e) => setGrayscale(e.target.checked)} />
                Convert to grayscale — usually a large extra saving on scans
              </label>
            </>
          ) : null}

          <div className="row" style={{ marginTop: '0.9rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void (queue.length > 1 ? shrinkQueue() : run())}
            >
              {busy ? 'Working…' : queue.length > 1 ? 'Shrink all to ZIP' : 'Shrink PDF'}
            </button>
            {output ? (
              output.withinLimit ? (
                <button type="button" className="btn" onClick={() => void downloadNamed(output.blob, output.name)}>
                  Save PDF
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void downloadNamed(output.blob, output.name)}
                >
                  Download anyway
                </button>
              )
            ) : null}
          </div>

          {status ? <p className="hint">{status}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}

          {output && file ? (
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
