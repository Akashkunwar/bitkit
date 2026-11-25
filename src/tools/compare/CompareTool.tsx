import { useState } from 'react'
import { pdfjs } from '../../lib/pdfjsRuntime'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { destroyPdfJs, isPdfPasswordError, openPdfJs } from '../../lib/pdfJs'
import { PdfPassword } from '../../components/PdfPassword'
import { renderPageCanvas } from '../../lib/pdfRaster'
import { diffPixels } from '../../lib/pixels'
import { useHandoff } from '../../lib/useHandoff'

type Side = { file: File; bytes: Uint8Array }

type PageDiff = {
  page: number
  changed: number
  total: number
  note: string
  leftUrl: string
  rightUrl: string
  diffUrl: string
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

async function canvasUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not draw a page.')
  return URL.createObjectURL(blob)
}

export default function CompareTool() {
  const [left, setLeft] = useState<Side | null>(null)
  const [right, setRight] = useState<Side | null>(null)
  const [pages, setPages] = useState<PageDiff[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)

  const revoke = (rows: PageDiff[]) => {
    const urls = new Set(rows.flatMap((row) => [row.leftUrl, row.rightUrl, row.diffUrl]))
    for (const url of urls) URL.revokeObjectURL(url)
  }

  const take = async (files: File[]) => {
    const pdfs = files.filter(isPdf)
    if (!pdfs.length) {
      setError('Drop PDF files.')
      return
    }
    setError(null)
    const read = async (file: File): Promise<Side> => ({ file, bytes: new Uint8Array(await file.arrayBuffer()) })
    if (pdfs.length >= 2) {
      setLeft(await read(pdfs[0]))
      setRight(await read(pdfs[1]))
    } else if (!left) setLeft(await read(pdfs[0]))
    else setRight(await read(pdfs[0]))
    setPages((current) => {
      revoke(current)
      return []
    })
  }

  useHandoff((payload) => {
    if (payload.files?.length) void take(payload.files)
  })

  const compare = async () => {
    if (!left || !right) return
    setBusy(true)
    setError(null)
    let docA: Awaited<ReturnType<typeof openPdfJs>> | null = null
    let docB: Awaited<ReturnType<typeof openPdfJs>> | null = null
    try {
      docA = await openPdfJs(pdfjs, left.bytes, password || undefined)
      docB = await openPdfJs(pdfjs, right.bytes, password || undefined)
      const count = Math.max(docA.numPages, docB.numPages)
      const next: PageDiff[] = []
      for (let page = 1; page <= count; page += 1) {
        if (page > docA.numPages || page > docB.numPages) {
          const only = page > docA.numPages ? 'Only in the second PDF' : 'Only in the first PDF'
          const present = page > docA.numPages ? docB : docA
          const rendered = await renderPageCanvas(present, page, 72)
          const url = await canvasUrl(rendered.canvas)
          next.push({ page, changed: 1, total: 1, note: only, leftUrl: url, rightUrl: url, diffUrl: url })
          continue
        }
        const a = await renderPageCanvas(docA, page, 72)
        const b = await renderPageCanvas(docB, page, 72)
        const width = a.canvas.width
        const height = a.canvas.height
        const sized = document.createElement('canvas')
        sized.width = width
        sized.height = height
        const sizedCtx = sized.getContext('2d')
        const aCtx = a.canvas.getContext('2d', { willReadFrequently: true })
        if (!sizedCtx || !aCtx) throw new Error('Canvas is unavailable.')
        sizedCtx.drawImage(b.canvas, 0, 0, width, height)
        const diff = diffPixels(
          aCtx.getImageData(0, 0, width, height).data,
          sizedCtx.getImageData(0, 0, width, height).data,
        )
        const overlay = document.createElement('canvas')
        overlay.width = width
        overlay.height = height
        const overlayCtx = overlay.getContext('2d')
        if (!overlayCtx) throw new Error('Canvas is unavailable.')
        const pixels = Uint8ClampedArray.from(diff.overlay)
        overlayCtx.putImageData(new ImageData(pixels, width, height), 0, 0)
        const sizeNote =
          a.canvas.width === b.canvas.width && a.canvas.height === b.canvas.height
            ? ''
            : ' Page sizes differ; the second was scaled to the first.'
        next.push({
          page,
          changed: diff.changed,
          total: diff.total,
          note: sizeNote,
          leftUrl: await canvasUrl(a.canvas),
          rightUrl: await canvasUrl(sized),
          diffUrl: await canvasUrl(overlay),
        })
      }
      setPages((current) => {
        revoke(current)
        return next
      })
      setNeedsPassword(false)
    } catch (err) {
      if (isPdfPasswordError(err)) {
        setNeedsPassword(true)
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Could not compare those PDFs.')
      }
    } finally {
      if (docA) await destroyPdfJs(docA)
      if (docB) await destroyPdfJs(docB)
      setBusy(false)
    }
  }

  const changedPages = pages.filter((page) => page.changed > 0).length

  return (
    <ToolLayout
      title="PDF compare"
      lede="Two versions of a document, side by side. Changed pixels are marked. Both files stay in this tab."
    >
      <DropZone
        accept="application/pdf,.pdf"
        multiple
        label="Drop the two PDFs."
        hint="The first file is the original. Drop them together, or one after the other."
        onFiles={(files) => void take(files)}
      />
      <div className="split">
        <p className="hint">{left ? left.file.name : 'First PDF not chosen.'}</p>
        <p className="hint">{right ? right.file.name : 'Second PDF not chosen.'}</p>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!left || !right || busy}
        onClick={() => void compare()}
      >
        {busy ? 'Comparing…' : 'Compare'}
      </button>
      {needsPassword ? (
        <PdfPassword
          value={password}
          onChange={setPassword}
          busy={busy}
          error={error}
          onUnlock={() => void compare()}
        />
      ) : error ? (
        <p className="status-bad">{error}</p>
      ) : null}
      {pages.length ? (
        <>
          <p className="status-ok">
            {changedPages === 0 ? 'No visible changes.' : `${changedPages} of ${pages.length} pages differ.`}
          </p>
          <div className="compare-list">
            {pages.map((page) => (
              <article key={page.page} className="panel">
                <h2>
                  Page {page.page}
                  {page.total > 1 ? ` · ${((page.changed / page.total) * 100).toFixed(2)}% changed` : ''}
                  {page.note}
                </h2>
                <div className="compare-row">
                  <figure>
                    <img src={page.leftUrl} alt={`Page ${page.page}, first file`} />
                    <figcaption>First</figcaption>
                  </figure>
                  <figure>
                    <img src={page.rightUrl} alt={`Page ${page.page}, second file`} />
                    <figcaption>Second</figcaption>
                  </figure>
                  <figure>
                    <img src={page.diffUrl} alt={`Page ${page.page}, changes in red`} />
                    <figcaption>Changes</figcaption>
                  </figure>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </ToolLayout>
  )
}
