import { useEffect, useMemo, useRef, useState, type DragEvent, type ClipboardEvent } from 'react'
import {
  Code2,
  Columns2,
  Download,
  Eye,
  FileCode2,
  FileDown,
  FolderOpen,
  ImagePlus,
  Printer,
  RotateCcw,
} from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { formatBytes } from '../../lib/format'
import { useHandoff } from '../../lib/useHandoff'
import { useToolSettings } from '../../lib/prefs'
import { getPref, setPref } from '../../lib/db'
import { markdownHtmlToPdf } from '../../lib/pdf'
import { nonLatinWarning } from '../../lib/docPdf'
import { blobToDataUrl } from '../../lib/domRaster'
import { decoratePages, pagesToPdf, renderHtmlPages } from '../../lib/docRender'
import { DOC_THEMES, PAPER_PX, docThemeCss, mmToPx, type DocThemeId, type Paper } from '../../lib/docThemes'
import { buildDocument, printPageCss, standaloneHtml, wordStats } from '../../lib/markdownDoc'

const SAMPLE = `# Project brief

Write in **Markdown** on the left; the right side shows the page exactly as it will print.
Tables, code, task lists, quotes, images, emoji 🎉 and any script — नमस्ते, こんにちは — all come out right.

## Goals

1. Ship the importer by **June**
2. Cut load time by 40%
   - measure first
   - then optimise

- [x] Draft written
- [ ] Reviewed by the team

> Simple things should be simple; complex things should be possible.

## Status

| Area | Owner | Progress |
| --- | --- | ---: |
| Import | Priya | 80% |
| Export | Sam | 45% |

\`\`\`ts
export function greet(name: string) {
  return \`Hello, \${name}\`
}
\`\`\`

\\pagebreak

## Appendix

Put \`\\pagebreak\` on its own line to start a new page. Drop an image onto the editor to embed it.
`

const DRAFT_KEY = 'markdown-draft'

type View = 'split' | 'write' | 'preview'
type Engine = 'exact' | 'text'

const DEFAULTS = {
  view: 'split' as View,
  theme: 'modern' as DocThemeId,
  paper: 'a4' as Paper,
  marginMm: 18,
  toc: false,
  titleBlock: false,
  subtitle: '',
  header: '',
  footer: '',
  pageNumbers: true,
  engine: 'exact' as Engine,
}

function safeName(title: string): string {
  return (
    title
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'document'
  )
}

/** Scales the fixed-width page preview to fit its column. */
function usePreviewZoom(paperWidth: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setZoom(Math.min(1, Math.max(0.3, (width - 32) / paperWidth)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [paperWidth])
  return { ref, zoom }
}

export default function MarkdownTool() {
  const { settings, update } = useToolSettings('markdown', DEFAULTS)
  const [source, setSource] = useState(SAMPLE)
  const [images, setImages] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const loadedDraft = useRef(false)
  const paper = PAPER_PX[settings.paper]
  const { ref: previewRef, zoom } = usePreviewZoom(paper.width)

  // Restore the last draft once; keep it saved as you type.
  useEffect(() => {
    void getPref<string | null>(DRAFT_KEY, null).then((draft) => {
      if (!loadedDraft.current && draft) setSource(draft)
      loadedDraft.current = true
    })
  }, [])
  useEffect(() => {
    if (!loadedDraft.current) return
    const id = window.setTimeout(() => void setPref(DRAFT_KEY, source), 400)
    return () => window.clearTimeout(id)
  }, [source])

  useHandoff((payload) => {
    loadedDraft.current = true
    if (payload.text) setSource(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setSource)
  })

  const doc = useMemo(
    () =>
      buildDocument(source, {
        toc: settings.toc,
        titleBlock: settings.titleBlock,
        subtitle: settings.subtitle,
        images,
      }),
    [source, settings.toc, settings.titleBlock, settings.subtitle, images],
  )
  const stats = useMemo(() => wordStats(source), [source])
  const themeCss = useMemo(() => docThemeCss(settings.theme), [settings.theme])
  const setup = {
    paper: settings.paper,
    marginMm: settings.marginMm,
    header: settings.header,
    footer: settings.footer,
    pageNumbers: settings.pageNumbers,
  }
  const textWarning = settings.engine === 'text' ? nonLatinWarning(source) : null

  const insertAtCursor = (text: string) => {
    const el = editorRef.current
    const start = el?.selectionStart ?? source.length
    const end = el?.selectionEnd ?? source.length
    const next = source.slice(0, start) + text + source.slice(end)
    setSource(next)
    window.requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const embedImages = async (files: File[]) => {
    const added: Record<string, string> = {}
    let markdown = ''
    for (const file of files.filter((f) => f.type.startsWith('image/'))) {
      const name = (file.name || 'image.png').replace(/\s+/g, '-')
      added[name] = await blobToDataUrl(file)
      markdown += `\n![${name.replace(/\.[^.]+$/, '')}](${name})\n`
    }
    if (!markdown) return false
    setImages((current) => ({ ...current, ...added }))
    insertAtCursor(markdown)
    return true
  }

  const openFiles = async (files: File[]) => {
    const md = files.find((f) => /\.(md|markdown|txt)$/i.test(f.name) || f.type.startsWith('text/'))
    if (md) setSource(await md.text())
    await embedImages(files)
  }

  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    setDragging(false)
    if (!event.dataTransfer.files.length) return
    event.preventDefault()
    void openFiles([...event.dataTransfer.files])
  }

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...event.clipboardData.files].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    event.preventDefault()
    void embedImages(
      files.map(
        (f, i) =>
          new File([f], f.name && f.name !== 'image.png' ? f.name : `pasted-${Date.now()}-${i}.png`, { type: f.type }),
      ),
    )
  }

  const downloadPdf = async () => {
    setBusy('Building PDF…')
    setError(null)
    try {
      const name = `${safeName(doc.title)}.pdf`
      let blob: Blob
      if (settings.engine === 'text') {
        blob = await markdownHtmlToPdf(doc.html, source, {
          pageSize: settings.paper === 'letter' ? 'letter' : 'a4',
          marginMm: settings.marginMm,
          header: settings.header,
          footer: settings.footer,
        })
      } else {
        const scale = 2
        const rendered = await renderHtmlPages(doc.html, {
          scale,
          paper: settings.paper,
          marginMm: settings.marginMm,
          theme: settings.theme,
        })
        decoratePages(rendered.pages, {
          header: settings.header,
          footer: settings.footer,
          pageNumbers: settings.pageNumbers,
          scale,
          marginPx: mmToPx(settings.marginMm),
        })
        const bytes = await pagesToPdf(rendered.pages, rendered.pageWidth, rendered.pageHeight, { title: doc.title })
        blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
      }
      const file = new File([blob], name, { type: 'application/pdf' })
      setOutput(file)
      triggerDownload(file, name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed.')
    } finally {
      setBusy(null)
    }
  }

  const downloadHtml = () => {
    const html = standaloneHtml(doc.title, doc.html, settings.theme, setup)
    triggerDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `${safeName(doc.title)}.html`)
  }

  const downloadMarkdown = () => {
    triggerDownload(new Blob([source], { type: 'text/markdown;charset=utf-8' }), `${safeName(doc.title)}.md`)
  }

  const view = settings.view

  return (
    <ToolLayout
      title="Markdown to PDF"
      lede="Write or paste Markdown, pick a style, and download a properly formatted PDF — headings, tables, code, task lists, images, emoji, and every script."
    >
      {/* Theme and page rules for the preview, plus @page rules for printing. */}
      <style>{`${themeCss}\n@media print { ${printPageCss(setup)} }`}</style>

      <section className="panel md-toolbar no-print" aria-label="Document options">
        <Segmented
          label="View"
          hideLabel
          value={view}
          onChange={(next) => update({ view: next })}
          options={[
            {
              value: 'write',
              label: (
                <>
                  <Code2 size={15} aria-hidden="true" /> Write
                </>
              ),
            },
            {
              value: 'split',
              label: (
                <>
                  <Columns2 size={15} aria-hidden="true" /> Split
                </>
              ),
            },
            {
              value: 'preview',
              label: (
                <>
                  <Eye size={15} aria-hidden="true" /> Preview
                </>
              ),
            },
          ]}
        />
        <label className="md-inline-field">
          <span>Style</span>
          <select
            className="select-inline"
            value={settings.theme}
            onChange={(e) => update({ theme: e.target.value as DocThemeId })}
          >
            {DOC_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
        <label className="md-inline-field">
          <span>Paper</span>
          <select
            className="select-inline"
            value={settings.paper}
            onChange={(e) => update({ paper: e.target.value as Paper })}
          >
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
            <option value="legal">Legal</option>
          </select>
        </label>
        <label className="md-inline-field">
          <span>Margins</span>
          <select
            className="select-inline"
            value={settings.marginMm}
            onChange={(e) => update({ marginMm: Number(e.target.value) })}
          >
            <option value={12}>Narrow</option>
            <option value={18}>Normal</option>
            <option value={25}>Wide</option>
          </select>
        </label>
        <div className="md-toolbar-actions">
          <button
            type="button"
            className="btn"
            onClick={() => window.print()}
            title="Print, or Save as PDF with selectable text"
          >
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
          <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => void downloadPdf()}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <FileDown size={16} aria-hidden="true" />}
            {busy ?? 'Download PDF'}
          </button>
        </div>

        <details className="md-more">
          <summary>Page setup, contents, header and footer</summary>
          <div className="md-more-grid">
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.titleBlock}
                onChange={(e) => update({ titleBlock: e.target.checked })}
              />
              Title block
            </label>
            <label className="switch">
              <input type="checkbox" checked={settings.toc} onChange={(e) => update({ toc: e.target.checked })} />
              Table of contents
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.pageNumbers}
                onChange={(e) => update({ pageNumbers: e.target.checked })}
              />
              Page numbers
            </label>
            {settings.titleBlock ? (
              <label className="field">
                <span>Subtitle</span>
                <input
                  value={settings.subtitle}
                  placeholder="Author · date"
                  onChange={(e) => update({ subtitle: e.target.value })}
                />
              </label>
            ) : null}
            <label className="field">
              <span>Header</span>
              <input
                value={settings.header}
                placeholder="Shown at the top of every page"
                onChange={(e) => update({ header: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Footer</span>
              <input
                value={settings.footer}
                placeholder="Shown at the bottom of every page"
                onChange={(e) => update({ footer: e.target.value })}
              />
            </label>
            <Segmented
              label="PDF engine"
              value={settings.engine}
              onChange={(engine) => update({ engine })}
              options={[
                {
                  value: 'exact',
                  label: 'Exact look',
                  title: 'Matches the preview; any script; text is part of the image',
                },
                {
                  value: 'text',
                  label: 'Text (small)',
                  title: 'Selectable text in basic PDF fonts; Latin scripts only',
                },
              ]}
            />
          </div>
          <p className="hint">
            <strong>Download PDF</strong> matches the preview exactly, emoji and all.{' '}
            <strong>Print → Save as PDF</strong> gives the same styling with selectable, searchable text. The{' '}
            <em>Text</em> engine makes the smallest file but only knows basic Latin fonts.
          </p>
        </details>
        {textWarning ? <p className="banner warn">{textWarning}</p> : null}
        {error ? (
          <p className="status-bad" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <div className="md-workbench" data-view={view}>
        <section className="panel md-editor no-print" aria-label="Markdown editor">
          <div className="md-pane-head">
            <span className="muted">
              {stats.words.toLocaleString()} words · {stats.minutes} min read
            </span>
            <div className="row">
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => fileRef.current?.click()}>
                <FolderOpen size={15} aria-hidden="true" />
                Open
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.multiple = true
                  input.onchange = () => void embedImages([...(input.files ?? [])])
                  input.click()
                }}
              >
                <ImagePlus size={15} aria-hidden="true" />
                Image
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSource(SAMPLE)}>
                <RotateCcw size={15} aria-hidden="true" />
                Sample
              </button>
            </div>
          </div>
          <textarea
            ref={editorRef}
            className="code-area md-textarea"
            data-dragging={dragging}
            value={source}
            spellCheck
            onChange={(event) => setSource(event.target.value)}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes('Files')) {
                event.preventDefault()
                setDragging(true)
              }
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onPaste={onPaste}
            aria-label="Markdown source"
          />
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain,image/*"
            multiple
            hidden
            aria-label="Open a Markdown file"
            onChange={(event) => {
              void openFiles([...(event.target.files ?? [])])
              event.target.value = ''
            }}
          />
        </section>

        {/* Always rendered: in Write view it is hidden on screen but still what prints. */}
        <section className="panel md-preview-pane print-root" aria-label="Preview" ref={previewRef}>
          <div className="md-paper-wrap" style={{ zoom }}>
            <article
              className="doc-page md-paper"
              style={{ width: paper.width, minHeight: paper.height, padding: `${mmToPx(settings.marginMm)}px` }}
              dangerouslySetInnerHTML={{ __html: doc.html }}
            />
          </div>
        </section>
      </div>

      <section className="panel no-print md-export">
        <div className="row">
          <button type="button" className="btn" onClick={downloadHtml}>
            <FileCode2 size={16} aria-hidden="true" />
            Download .html
          </button>
          <button type="button" className="btn" onClick={downloadMarkdown}>
            <Download size={16} aria-hidden="true" />
            Download .md
          </button>
          {output ? (
            <span className="hint">
              Last PDF: {output.name} · {formatBytes(output.size)}
            </span>
          ) : null}
        </div>
        <SendTo from="markdown" text={source} files={output ? [output] : []} />
      </section>
    </ToolLayout>
  )
}
