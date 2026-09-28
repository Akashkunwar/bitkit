import { useEffect, useMemo, useRef, useState } from 'react'
import { pdfjs } from '../../lib/pdfjsRuntime'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { CheckSquare, Download, FileImage, Square, X } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { PdfPassword } from '../../components/PdfPassword'
import { triggerDownload } from '../../lib/download'
import { formatBytes } from '../../lib/format'
import { useHandoff } from '../../lib/useHandoff'
import { useToolSettings } from '../../lib/prefs'
import { zipStore } from '../../lib/zip'
import { parsePageRange } from '../../lib/pdfPages'
import { destroyPdfJs, isPdfPasswordError, openPdfJs } from '../../lib/pdfJs'
import { pageFileName, renderPageImage, renderPageThumb, type RasterFormat } from '../../lib/pdfRaster'

const DEFAULTS = { format: 'png' as RasterFormat, dpi: 150, quality: 0.9 }

const DPI_OPTIONS = [
  { value: '72', label: '72', title: 'Screen — smallest files' },
  { value: '150', label: '150', title: 'Standard — sharp on screen' },
  { value: '220', label: '220', title: 'High — good for zooming' },
  { value: '300', label: '300', title: 'Print quality' },
]

type Loaded = { name: string; base: string; bytes: Uint8Array; doc: PDFDocumentProxy; pages: number }
type Output = { files: File[]; zip: File | null }

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export default function PdfImagesTool() {
  const { settings, update } = useToolSettings('pdf-images', DEFAULTS)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [pending, setPending] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [thumbs, setThumbs] = useState<Record<number, string>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [range, setRange] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<Output | null>(null)
  const thumbUrls = useRef<string[]>([])

  const releaseThumbs = () => {
    for (const url of thumbUrls.current) URL.revokeObjectURL(url)
    thumbUrls.current = []
    setThumbs({})
  }

  useEffect(
    () => () => {
      for (const url of thumbUrls.current) URL.revokeObjectURL(url)
    },
    [],
  )

  useEffect(
    () => () => {
      void destroyPdfJs(loaded?.doc)
    },
    [loaded],
  )

  // Render page previews in the background, first page first.
  useEffect(() => {
    if (!loaded) return
    let live = true
    void (async () => {
      for (let n = 1; n <= loaded.pages && live; n += 1) {
        try {
          const url = await renderPageThumb(loaded.doc, n)
          if (!live) {
            URL.revokeObjectURL(url)
            return
          }
          thumbUrls.current.push(url)
          setThumbs((current) => ({ ...current, [n]: url }))
        } catch (err) {
          // A page that fails to preview can still be exported.
          console.warn(`Preview of page ${n} failed`, err)
        }
      }
    })()
    return () => {
      live = false
    }
  }, [loaded])

  const open = async (file: File, pass?: string) => {
    setError(null)
    setOutput(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const doc = await openPdfJs(pdfjs, bytes, pass)
      releaseThumbs()
      const pages = doc.numPages
      setLoaded({ name: file.name, base: file.name.replace(/\.pdf$/i, '') || 'document', bytes, doc, pages })
      setSelected(new Set(Array.from({ length: pages }, (_, i) => i + 1)))
      setNeedsPassword(false)
      setPending(null)
      setRange('')
    } catch (err) {
      if (isPdfPasswordError(err)) {
        setPending(file)
        setNeedsPassword(true)
        setError(err.kind === 'incorrect' ? err.message : null)
        return
      }
      setError(err instanceof Error ? err.message : 'Could not open that PDF.')
    }
  }

  const take = (files: File[]) => {
    const pdf = files.find(isPdf)
    if (!pdf) {
      setError('That is not a PDF. Drop a .pdf file.')
      return
    }
    setPassword('')
    void open(pdf)
  }

  useHandoff((payload) => {
    if (payload.files?.length) take(payload.files)
  })

  const pageList = useMemo(() => (loaded ? Array.from({ length: loaded.pages }, (_, i) => i + 1) : []), [loaded])
  const chosen = pageList.filter((n) => selected.has(n))

  const toggle = (n: number) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
    setOutput(null)
  }

  const applyRange = () => {
    if (!loaded) return
    try {
      const indices = parsePageRange(range, loaded.pages)
      setSelected(new Set(indices.map((i) => i + 1)))
      setError(null)
      setOutput(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that page range.')
    }
  }

  const exportPages = async (pages: number[]) => {
    if (!loaded || !pages.length) return
    setBusy(true)
    setError(null)
    setProgress(0)
    try {
      const files: File[] = []
      for (let i = 0; i < pages.length; i += 1) {
        const n = pages[i]
        const blob = await renderPageImage(loaded.doc, n, settings)
        files.push(new File([blob], pageFileName(loaded.base, n, loaded.pages, settings.format), { type: blob.type }))
        setProgress((i + 1) / pages.length)
      }
      if (files.length === 1) {
        triggerDownload(files[0], files[0].name)
        setOutput({ files, zip: null })
      } else {
        const entries = await Promise.all(
          files.map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) })),
        )
        const zipBytes = zipStore(entries)
        const zip = new File([zipBytes.slice().buffer as ArrayBuffer], `${loaded.base}-images.zip`, {
          type: 'application/zip',
        })
        triggerDownload(zip, zip.name)
        setOutput({ files, zip })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not render those pages.')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    releaseThumbs()
    setLoaded(null)
    setOutput(null)
    setError(null)
    setSelected(new Set())
  }

  const outputSize = output ? (output.zip?.size ?? output.files.reduce((s, f) => s + f.size, 0)) : 0

  return (
    <ToolLayout
      title="PDF to images"
      lede="Turn every page — or just the ones you pick — into PNG, JPEG, or WebP images at the resolution you need. The PDF is rendered in this tab."
    >
      {!loaded ? (
        <>
          <DropZone
            accept="application/pdf,.pdf"
            label="Drop a PDF here"
            hint="Each page becomes one image. Password-protected PDFs work if you know the password."
            buttonLabel="Choose PDF"
            onFiles={take}
          />
          {needsPassword && pending ? (
            <section className="panel">
              <p className="banner">“{pending.name}” is password-protected.</p>
              <PdfPassword
                value={password}
                onChange={setPassword}
                error={error}
                onUnlock={() => void open(pending, password)}
              />
            </section>
          ) : error ? (
            <p className="status-bad" role="alert">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <div className="split">
          <section className="panel">
            <div className="toolbar">
              <div className="toolbar-group" style={{ minWidth: 0 }}>
                <FileImage size={17} aria-hidden="true" />
                <strong className="thumb-name" style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>
                  {loaded.name}
                </strong>
                <span className="muted">
                  · {loaded.pages} {loaded.pages === 1 ? 'page' : 'pages'}
                </span>
              </div>
              <div className="toolbar-group">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    setSelected(new Set(pageList))
                    setOutput(null)
                  }}
                >
                  <CheckSquare size={15} aria-hidden="true" />
                  All
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    setSelected(new Set())
                    setOutput(null)
                  }}
                >
                  <Square size={15} aria-hidden="true" />
                  None
                </button>
                <button type="button" className="btn btn-sm" onClick={reset}>
                  <X size={15} aria-hidden="true" />
                  Close
                </button>
              </div>
            </div>

            <form
              className="row"
              style={{ marginBottom: '1rem' }}
              onSubmit={(event) => {
                event.preventDefault()
                applyRange()
              }}
            >
              <label className="visually-hidden" htmlFor="pdf-img-range">
                Pages to select
              </label>
              <input
                id="pdf-img-range"
                className="text-input"
                style={{ flex: 1, minWidth: '10rem' }}
                placeholder={`Select pages, e.g. 1-3, 5 (of ${loaded.pages})`}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
              <button type="submit" className="btn" disabled={!range.trim()}>
                Select
              </button>
            </form>

            <ul className="thumb-grid" aria-label="Pages">
              {pageList.map((n) => {
                const isOn = selected.has(n)
                return (
                  <li key={n} className="thumb-card" data-selected={isOn} data-excluded={!isOn}>
                    <button
                      type="button"
                      className="thumb-media thumb-toggle"
                      aria-pressed={isOn}
                      aria-label={`Page ${n}${isOn ? ', selected' : ''}`}
                      onClick={() => toggle(n)}
                    >
                      {thumbs[n] ? <img src={thumbs[n]} alt="" /> : <span className="spinner" aria-hidden="true" />}
                    </button>
                    <span className="thumb-index" aria-hidden="true">
                      {n}
                    </span>
                    <span className="thumb-check" aria-hidden="true">
                      {isOn ? <CheckSquare size={20} /> : <Square size={20} />}
                    </span>
                    <div className="thumb-foot">
                      <span className="thumb-name">Page {n}</span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Download page ${n}`}
                        title="Download this page"
                        disabled={busy}
                        onClick={() => void exportPages([n])}
                      >
                        <Download size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <aside className="panel">
            <div className="panel-title">
              <h2>Export</h2>
            </div>
            <Segmented
              label="Format"
              value={settings.format}
              onChange={(format) => update({ format })}
              block
              options={[
                { value: 'png', label: 'PNG', title: 'Lossless — best for text and diagrams' },
                { value: 'jpeg', label: 'JPEG', title: 'Smaller — best for photos and scans' },
                { value: 'webp', label: 'WebP', title: 'Smallest, widely supported' },
              ]}
            />
            <Segmented
              label="Resolution (DPI)"
              value={String(settings.dpi)}
              onChange={(dpi) => update({ dpi: Number(dpi) })}
              block
              options={DPI_OPTIONS}
            />
            {settings.format !== 'png' ? (
              <label className="field">
                <span>Quality · {Math.round(settings.quality * 100)}%</span>
                <input
                  type="range"
                  min={0.4}
                  max={1}
                  step={0.05}
                  value={settings.quality}
                  onChange={(e) => update({ quality: Number(e.target.value) })}
                />
              </label>
            ) : null}
            <p className="hint">
              {chosen.length > 1
                ? `${chosen.length} pages download as one ZIP of ${settings.format.toUpperCase()} files.`
                : 'Each page is one image file.'}
            </p>

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={!chosen.length || busy}
              onClick={() => void exportPages(chosen)}
            >
              {busy ? <span className="spinner" aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
              {busy
                ? `Rendering… ${Math.round(progress * 100)}%`
                : chosen.length
                  ? `Convert ${chosen.length} ${chosen.length === 1 ? 'page' : 'pages'}`
                  : 'Select pages to convert'}
            </button>
            {busy ? (
              <div className="progress" style={{ marginTop: '0.6rem' }}>
                <span style={{ width: `${progress * 100}%` }} />
              </div>
            ) : null}
            {error ? (
              <p className="status-bad" role="alert">
                {error}
              </p>
            ) : null}

            {output ? (
              <div className="result-card">
                <div>
                  <strong>{output.zip?.name ?? output.files[0]?.name}</strong>
                  <span>{formatBytes(outputSize)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    const file = output.zip ?? output.files[0]
                    if (file) triggerDownload(file, file.name)
                  }}
                >
                  <Download size={15} aria-hidden="true" />
                  Download again
                </button>
              </div>
            ) : null}
            <SendTo from="pdf-images" files={output?.files ?? []} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
