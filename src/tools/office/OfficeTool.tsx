import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import {
  blocksToHtml,
  blocksToMarkdown,
  blocksToText,
  countWords,
  documentTitle,
  type DocBlock,
} from '../../lib/docBlocks'
import { blocksToPdf, nonLatinWarning, type PdfOptions } from '../../lib/docPdf'
import { buildDocx } from '../../lib/docx'
import { fileToBlocks, OFFICE_ACCEPT, SOURCE_LABEL, type SourceKind } from '../../lib/office'

type Loaded = { name: string; kind: SourceKind; blocks: DocBlock[] }

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'document'
}

export default function OfficeTool() {
  const [doc, setDoc] = useState<Loaded | null>(null)
  const [pageSize, setPageSize] = useState<PdfOptions['pageSize']>('a4')
  const [marginMm, setMarginMm] = useState(18)
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outFile, setOutFile] = useState<File | null>(null)

  const load = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setBusy(true)
    setError(null)
    setOutFile(null)
    try {
      const { kind, blocks } = await fileToBlocks(file)
      if (!blocks.length) throw new Error(`No readable text in “${file.name}”.`)
      setDoc({ name: file.name, kind, blocks })
    } catch (err) {
      setDoc(null)
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  useHandoff((payload) => {
    if (payload.files?.length) void load(payload.files)
  })

  const html = useMemo(() => (doc ? blocksToHtml(doc.blocks) : ''), [doc])
  const words = useMemo(() => (doc ? countWords(doc.blocks) : 0), [doc])
  const markdown = useMemo(() => (doc ? blocksToMarkdown(doc.blocks) : ''), [doc])
  const fontWarning = useMemo(() => (doc ? nonLatinWarning(blocksToText(doc.blocks)) : null), [doc])
  const title = doc ? documentTitle(doc.blocks, baseName(doc.name)) : ''

  const savePdf = () => {
    if (!doc) return
    setError(null)
    try {
      const blob = blocksToPdf(doc.blocks, { pageSize, marginMm, header, footer, title })
      const file = new File([blob], `${baseName(doc.name)}.pdf`, { type: 'application/pdf' })
      setOutFile(file)
      triggerDownload(file, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed.')
    }
  }

  const saveDocx = () => {
    if (!doc) return
    const bytes = buildDocx(doc.blocks)
    triggerDownload(
      new Blob([bytes.slice().buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      `${baseName(doc.name)}.docx`,
    )
  }

  const saveText = (kind: 'md' | 'txt') => {
    if (!doc) return
    const body = kind === 'md' ? markdown : blocksToText(doc.blocks)
    triggerDownload(new Blob([body], { type: 'text/plain;charset=utf-8' }), `${baseName(doc.name)}.${kind}`)
  }

  const printDoc = () => {
    document.body.classList.add('printing-md')
    window.print()
    document.body.classList.remove('printing-md')
  }

  return (
    <ToolLayout
      title="Office to PDF"
      lede="Word, PowerPoint, Excel, Markdown, HTML, or plain text — converted in this tab, with no upload."
    >
      <div className="no-print">
        <DropZone
          accept={OFFICE_ACCEPT}
          label="Drop a .docx, .pptx, .xlsx, .csv, .md, .html, .rtf, or .txt file."
          hint="Text, headings, lists, and tables come across. Images, columns, and exact page layout do not."
          onFiles={(files) => void load(files)}
        />
      </div>

      {error ? <p className="status-bad no-print">{error}</p> : null}
      {busy ? <p className="hint no-print">Reading…</p> : null}

      {doc ? (
        <>
          <div className="split no-print">
            <section className="panel">
              <p className="hint">
                <code>{doc.name}</code> · {SOURCE_LABEL[doc.kind]} · {doc.blocks.length} blocks · {words} words
              </p>
              {doc.kind === 'pptx' ? (
                <p className="banner">
                  A .pptx comes across as a text outline, one heading and bullet list per slide. Shapes, images, and
                  slide design are not reproduced.
                </p>
              ) : null}
              {fontWarning ? <p className="banner warn">{fontWarning}</p> : null}
              <div className="row" style={{ flexWrap: 'wrap', marginTop: '0.8rem' }}>
                <button type="button" className="btn btn-primary" onClick={savePdf}>
                  Download PDF
                </button>
                <button type="button" className="btn" onClick={printDoc}>
                  Print / Save as PDF
                </button>
                <button type="button" className="btn" onClick={saveDocx}>
                  Download .docx
                </button>
                <button type="button" className="btn" onClick={() => saveText('md')}>
                  Download .md
                </button>
                <button type="button" className="btn" onClick={() => saveText('txt')}>
                  Download .txt
                </button>
              </div>
              <p className="hint" style={{ marginTop: '0.7rem' }}>
                “Download PDF” draws the text with the built-in PDF fonts. “Print / Save as PDF” hands the preview to
                the browser, which embeds its own fonts — use that one for non-Latin scripts.
              </p>
              <SendTo from="office" files={outFile ? [outFile] : []} text={markdown} />
            </section>

            <aside className="panel">
              <label className="field">
                <span>Page</span>
                <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PdfOptions['pageSize'])}>
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </label>
              <label className="field">
                <span>Margin (mm)</span>
                <input
                  type="number"
                  min={8}
                  max={40}
                  value={marginMm}
                  onChange={(e) => setMarginMm(Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span>Header</span>
                <input value={header} onChange={(e) => setHeader(e.target.value)} placeholder={title} />
              </label>
              <label className="field">
                <span>Footer</span>
                <input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Page numbers only" />
              </label>
            </aside>
          </div>

          <section className="panel print-root md-preview">
            <article dangerouslySetInnerHTML={{ __html: html }} />
          </section>
        </>
      ) : null}
    </ToolLayout>
  )
}
