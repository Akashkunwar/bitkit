import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { PdfPassword } from '../../components/PdfPassword'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { destroyPdfJs, isPdfPasswordError, openPdfJs } from '../../lib/pdfJs'
import { extractPdfText, NO_TEXT_LAYER, type ExtractOptions } from '../../lib/pdfText'
import { buildDocx } from '../../lib/docx'
import { blocksToMarkdown, blocksToText, countWords, type DocBlock } from '../../lib/docBlocks'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type Result = { name: string; blocks: DocBlock[]; pages: string[] }

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'document'
}

export default function PdfTextTool() {
  const [source, setSource] = useState<File | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [headings, setHeadings] = useState(true)
  const [pageBreaks, setPageBreaks] = useState(true)
  const [dropRunningHeads, setDropRunningHeads] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)

  const options: ExtractOptions = { headings, pageBreaks, dropRunningHeads }

  const run = async (file: File, pass = password) => {
    setBusy(true)
    setError(null)
    setWarning(null)
    setProgress('')
    try {
      const data = new Uint8Array(await file.arrayBuffer())
      const doc = await openPdfJs(pdfjs, data, pass || undefined)
      try {
        const extract = await extractPdfText(doc, options, (page, total) =>
          setProgress(`Reading page ${page} of ${total}…`),
        )
        if (!extract.hasTextLayer) {
          setResult(null)
          setWarning(NO_TEXT_LAYER)
          return
        }
        setResult({ name: file.name, blocks: extract.blocks, pages: extract.pages })
        setNeedsPassword(false)
      } finally {
        await destroyPdfJs(doc)
      }
    } catch (err) {
      if (isPdfPasswordError(err)) {
        setNeedsPassword(true)
        setError(err.message)
      } else {
        setResult(null)
        setError(err instanceof Error ? err.message : 'Could not read that PDF.')
      }
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const take = (files: File[]) => {
    const pdf = files.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (!pdf) {
      setError('Drop a PDF file.')
      return
    }
    setSource(pdf)
    setResult(null)
    void run(pdf)
  }

  useHandoff((payload) => {
    if (payload.files?.length) take(payload.files)
  })

  const markdown = useMemo(() => (result ? blocksToMarkdown(result.blocks) : ''), [result])
  const text = useMemo(() => (result ? blocksToText(result.blocks) : ''), [result])
  const words = useMemo(() => (result ? countWords(result.blocks) : 0), [result])

  const saveDocx = () => {
    if (!result) return
    const bytes = buildDocx(result.blocks)
    triggerDownload(
      new Blob([bytes.slice().buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      `${baseName(result.name)}.docx`,
    )
  }

  const saveText = (kind: 'md' | 'txt') => {
    if (!result) return
    triggerDownload(
      new Blob([kind === 'md' ? markdown : text], { type: 'text/plain;charset=utf-8' }),
      `${baseName(result.name)}.${kind}`,
    )
  }

  return (
    <ToolLayout
      title="PDF to Word & text"
      lede="Pull the text layer out of a PDF as .docx, Markdown, or plain text. The file never leaves this tab."
    >
      <DropZone
        accept="application/pdf,.pdf"
        label="Drop a PDF."
        hint="Headings, paragraphs, and lists are rebuilt from the text layer. Images and exact layout are not."
        onFiles={take}
      />

      {busy ? <p className="hint">{progress || 'Reading…'}</p> : null}
      {error ? <p className="status-bad">{error}</p> : null}
      {warning ? (
        <p className="banner warn">
          {warning} <Link to="/ocr">Open OCR →</Link>
        </p>
      ) : null}
      {needsPassword ? (
        <PdfPassword
          value={password}
          onChange={setPassword}
          busy={busy}
          onUnlock={() => source && void run(source, password)}
        />
      ) : null}

      <div className="split">
        <aside className="panel">
          <span className="field-label">Reconstruction</span>
          <label className="row">
            <input type="checkbox" checked={headings} onChange={(e) => setHeadings(e.target.checked)} />
            Treat larger type as headings
          </label>
          <label className="row">
            <input type="checkbox" checked={pageBreaks} onChange={(e) => setPageBreaks(e.target.checked)} />
            Keep a break between pages
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={dropRunningHeads}
              onChange={(e) => setDropRunningHeads(e.target.checked)}
            />
            Drop repeated headers and footers
          </label>
          <div className="row" style={{ marginTop: '0.9rem' }}>
            <button type="button" className="btn" disabled={!source || busy} onClick={() => source && void run(source)}>
              Re-read with these settings
            </button>
          </div>
          {result ? (
            <>
              <p className="hint" style={{ marginTop: '0.9rem' }}>
                {result.pages.length} page{result.pages.length === 1 ? '' : 's'} · {words} words ·{' '}
                {result.blocks.length} blocks
              </p>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" onClick={saveDocx}>
                  Download .docx
                </button>
                <button type="button" className="btn" onClick={() => saveText('md')}>
                  Download .md
                </button>
                <button type="button" className="btn" onClick={() => saveText('txt')}>
                  Download .txt
                </button>
              </div>
              <p className="hint">
                A PDF stores glyphs at coordinates, not paragraphs, so this is a careful reconstruction of the words —
                not a rebuild of the original Word file.
              </p>
              <SendTo from="pdf-text" text={markdown} />
            </>
          ) : null}
        </aside>

        <section className="panel">
          <span className="field-label">Extracted text</span>
          <textarea
            className="code-area editor"
            readOnly
            value={markdown || 'Nothing extracted yet.'}
            aria-label="Extracted text"
          />
        </section>
      </div>
    </ToolLayout>
  )
}
