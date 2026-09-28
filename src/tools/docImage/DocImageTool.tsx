import { useEffect, useRef, useState } from 'react'
import { CheckSquare, Download, FileText, Square, X } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { formatBytes } from '../../lib/format'
import { useHandoff } from '../../lib/useHandoff'
import { useToolSettings } from '../../lib/prefs'
import { zipStore } from '../../lib/zip'
import { OFFICE_ACCEPT, SOURCE_LABEL } from '../../lib/office'
import { canvasToBlob, stackPages } from '../../lib/domRaster'
import { detectDocKind, pagesToPdf, renderDocument, type RenderedDocument } from '../../lib/docRender'
import { DOC_THEMES, type DocThemeId, type Paper } from '../../lib/docThemes'

type Output = 'images' | 'long' | 'pdf'
type Format = 'png' | 'jpeg'

const DEFAULTS = {
  output: 'images' as Output,
  format: 'png' as Format,
  scale: 2,
  paper: 'a4' as Paper,
  marginMm: 18,
  theme: 'github' as DocThemeId,
}

type Loaded = { file: File; base: string; preview: RenderedDocument; thumbs: string[] }

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'document'
}

async function thumbnail(page: HTMLCanvasElement): Promise<string> {
  const width = 260
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round((page.height / page.width) * width)
  canvas.getContext('2d')!.drawImage(page, 0, 0, canvas.width, canvas.height)
  return URL.createObjectURL(await canvasToBlob(canvas, 'image/jpeg', 0.85))
}

export default function DocImageTool() {
  const { settings, update } = useToolSettings('doc-image', DEFAULTS)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<File[]>([])
  const thumbsRef = useRef<string[]>([])

  useEffect(
    () => () => {
      for (const url of thumbsRef.current) URL.revokeObjectURL(url)
    },
    [],
  )

  const isWord = loaded ? loaded.preview.kind === 'docx' : false

  const load = async (file: File) => {
    setBusy('Reading…')
    setError(null)
    setOutputs([])
    setProgress(0)
    try {
      const preview = await renderDocument(file, {
        scale: 1,
        paper: settings.paper,
        marginMm: settings.marginMm,
        theme: settings.theme,
        onProgress: (done, total) => setProgress(done / total),
      })
      for (const url of thumbsRef.current) URL.revokeObjectURL(url)
      const thumbs = await Promise.all(preview.pages.map(thumbnail))
      thumbsRef.current = thumbs
      setLoaded({ file, base: baseName(file.name), preview, thumbs })
      setSelected(new Set(preview.pages.map((_, i) => i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that document.')
    } finally {
      setBusy(null)
    }
  }

  const take = (files: File[]) => {
    const file = files.find((f) => detectDocKind(f)) ?? files[0]
    if (file) void load(file)
  }

  useHandoff((payload) => {
    if (payload.files?.length) take(payload.files)
  })

  // Page setup changes re-lay out documents that have no page size of their own.
  const layoutKey = `${settings.paper}-${settings.marginMm}-${settings.theme}`
  const lastLayout = useRef(layoutKey)
  useEffect(() => {
    if (!loaded || isWord || lastLayout.current === layoutKey) return
    lastLayout.current = layoutKey
    void load(loaded.file)
    // Only the layout inputs should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey])

  const toggle = (index: number) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    setOutputs([])
  }

  const exportPages = async () => {
    if (!loaded) return
    const chosen = loaded.preview.pages.map((_, i) => i).filter((i) => selected.has(i))
    if (!chosen.length) return
    setBusy('Rendering…')
    setError(null)
    setProgress(0)
    try {
      const full = await renderDocument(loaded.file, {
        scale: settings.scale,
        paper: settings.paper,
        marginMm: settings.marginMm,
        theme: settings.theme,
        onProgress: (done, total) => setProgress((done / total) * 0.8),
      })
      const pages = chosen.map((i) => full.pages[i]).filter(Boolean)
      const mime = settings.format === 'png' ? 'image/png' : 'image/jpeg'
      const ext = settings.format === 'png' ? 'png' : 'jpg'

      if (settings.output === 'pdf') {
        const bytes = await pagesToPdf(pages, full.pageWidth, full.pageHeight, { title: loaded.base })
        const file = new File([bytes.slice().buffer as ArrayBuffer], `${loaded.base}.pdf`, { type: 'application/pdf' })
        setOutputs([file])
        triggerDownload(file, file.name)
      } else if (settings.output === 'long' || pages.length === 1) {
        const canvas =
          settings.output === 'long' ? stackPages(pages, Math.round(16 * settings.scale), '#e5e7eb') : pages[0]
        const blob = await canvasToBlob(canvas, mime, 0.92)
        const suffix = settings.output === 'long' ? '' : `-page-${chosen[0] + 1}`
        const file = new File([blob], `${loaded.base}${suffix}.${ext}`, { type: mime })
        setOutputs([file])
        triggerDownload(file, file.name)
      } else {
        const width = Math.max(2, String(full.pages.length).length)
        const files: File[] = []
        for (let i = 0; i < pages.length; i += 1) {
          const blob = await canvasToBlob(pages[i], mime, 0.92)
          files.push(
            new File([blob], `${loaded.base}-page-${String(chosen[i] + 1).padStart(width, '0')}.${ext}`, {
              type: mime,
            }),
          )
          setProgress(0.8 + ((i + 1) / pages.length) * 0.2)
        }
        const entries = await Promise.all(
          files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) })),
        )
        const zip = zipStore(entries)
        triggerDownload(
          new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
          `${loaded.base}-pages.zip`,
        )
        setOutputs(files)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not render the pages.')
    } finally {
      setBusy(null)
    }
  }

  const reset = () => {
    for (const url of thumbsRef.current) URL.revokeObjectURL(url)
    thumbsRef.current = []
    setLoaded(null)
    setOutputs([])
    setError(null)
  }

  const count = selected.size
  const dpi = Math.round(96 * settings.scale)

  return (
    <ToolLayout
      title="Word to image"
      lede="Turn a Word document into PNG or JPEG pages, one long image, or a PDF that looks exactly like it. Also works with Markdown, HTML, text, and spreadsheets."
    >
      {!loaded ? (
        <>
          <DropZone
            accept={`${OFFICE_ACCEPT},.doc`}
            label="Drop a Word document"
            hint=".docx keeps fonts, colours, tables, images, headers, and footers. Also .md, .html, .txt, .rtf, .csv, .xlsx, .pptx."
            buttonLabel="Choose document"
            onFiles={take}
          />
          {busy ? (
            <div className="panel empty-state" role="status">
              <span className="spinner" aria-hidden="true" />
              <p>
                {busy} {progress ? `${Math.round(progress * 100)}%` : ''}
              </p>
            </div>
          ) : null}
          {error ? (
            <p className="banner warn" role="alert">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <div className="split">
          <section className="panel">
            <div className="toolbar">
              <div className="toolbar-group" style={{ minWidth: 0 }}>
                <FileText size={17} aria-hidden="true" />
                <strong className="thumb-name" style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>
                  {loaded.file.name}
                </strong>
                <span className="muted">
                  ·{' '}
                  {loaded.preview.kind === 'docx'
                    ? 'Word document'
                    : SOURCE_LABEL[loaded.preview.kind as keyof typeof SOURCE_LABEL]}{' '}
                  · {loaded.preview.pages.length} {loaded.preview.pages.length === 1 ? 'page' : 'pages'}
                </span>
              </div>
              <div className="toolbar-group">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setSelected(new Set(loaded.preview.pages.map((_, i) => i)))}
                >
                  <CheckSquare size={15} aria-hidden="true" />
                  All
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setSelected(new Set())}>
                  <Square size={15} aria-hidden="true" />
                  None
                </button>
                <button type="button" className="btn btn-sm" onClick={reset}>
                  <X size={15} aria-hidden="true" />
                  Close
                </button>
              </div>
            </div>

            <ul className="thumb-grid doc-thumbs" aria-label="Pages">
              {loaded.thumbs.map((url, i) => {
                const on = selected.has(i)
                return (
                  <li key={url} className="thumb-card" data-selected={on} data-excluded={!on}>
                    <button
                      type="button"
                      className="thumb-media thumb-toggle"
                      aria-pressed={on}
                      aria-label={`Page ${i + 1}${on ? ', selected' : ''}`}
                      onClick={() => toggle(i)}
                    >
                      <img src={url} alt="" />
                    </button>
                    <span className="thumb-index" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="thumb-check" aria-hidden="true">
                      {on ? <CheckSquare size={20} /> : <Square size={20} />}
                    </span>
                  </li>
                )
              })}
            </ul>
            {isWord ? (
              <p className="hint" style={{ marginTop: '1rem' }}>
                Rendered in this browser, so fonts the document names but this device lacks are substituted, and pages
                may break a little differently from Word.
              </p>
            ) : null}
          </section>

          <aside className="panel">
            <Segmented
              label="Save as"
              value={settings.output}
              onChange={(output) => {
                update({ output })
                setOutputs([])
              }}
              block
              options={[
                { value: 'images', label: 'Page images' },
                { value: 'long', label: 'One long image' },
                { value: 'pdf', label: 'PDF' },
              ]}
            />
            {settings.output !== 'pdf' ? (
              <Segmented
                label="Format"
                value={settings.format}
                onChange={(format) => update({ format })}
                block
                options={[
                  { value: 'png', label: 'PNG' },
                  { value: 'jpeg', label: 'JPG' },
                ]}
              />
            ) : (
              <p className="hint">
                The PDF looks exactly like these pages, but its text is part of the picture — use Office to PDF when you
                need selectable text.
              </p>
            )}
            <Segmented
              label={`Resolution · ${dpi} DPI`}
              value={String(settings.scale)}
              onChange={(scale) => update({ scale: Number(scale) })}
              block
              options={[
                { value: '1', label: 'Standard' },
                { value: '2', label: 'Sharp' },
                { value: '3', label: 'Print' },
              ]}
            />

            {!isWord ? (
              <>
                <div className="grid-2">
                  <label className="field">
                    <span>Paper</span>
                    <select value={settings.paper} onChange={(e) => update({ paper: e.target.value as Paper })}>
                      <option value="a4">A4</option>
                      <option value="letter">US Letter</option>
                      <option value="legal">US Legal</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Margin (mm)</span>
                    <select value={settings.marginMm} onChange={(e) => update({ marginMm: Number(e.target.value) })}>
                      {[10, 14, 18, 22, 25].map((mm) => (
                        <option key={mm} value={mm}>
                          {mm}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Style</span>
                  <select value={settings.theme} onChange={(e) => update({ theme: e.target.value as DocThemeId })}>
                    {DOC_THEMES.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.label} — {theme.hint}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={!count || !!busy}
              onClick={() => void exportPages()}
            >
              {busy ? <span className="spinner" aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
              {busy
                ? `${busy} ${Math.round(progress * 100)}%`
                : !count
                  ? 'Select pages'
                  : settings.output === 'pdf'
                    ? `Download PDF (${count} ${count === 1 ? 'page' : 'pages'})`
                    : settings.output === 'long'
                      ? `Download one image (${count} ${count === 1 ? 'page' : 'pages'})`
                      : count === 1
                        ? 'Download image'
                        : `Download ${count} images (ZIP)`}
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
            {outputs.length ? (
              <p className="hint">
                Saved {outputs.length === 1 ? outputs[0].name : `${outputs.length} files`} ·{' '}
                {formatBytes(outputs.reduce((sum, f) => sum + f.size, 0))}
              </p>
            ) : null}
            <SendTo from="doc-image" files={outputs} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
