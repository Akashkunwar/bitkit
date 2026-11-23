import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { downloadNamed } from '../../lib/download'
import { stageDownscale } from '../../lib/image/limits'
import {
  dottedText,
  formatMeta,
  htmlToPlainText,
  imagesToPdf,
  imposeBooklet,
  liftShadows,
  mhtmlToPdf,
  nextPage,
  parseGlyphLines,
  parseMhtml,
  pdfEncryptSupported,
  pdfUnlockSupported,
  prevPage,
  readPdfMeta,
  readZipImages,
  scannedRgba,
  svgFont,
  traceSize,
  writePdfMeta,
} from '../../lib/docgap'

const MODES = [
  { value: 'trace', label: 'Tracing worksheets' },
  { value: 'scan', label: 'Scanned look' },
  { value: 'scanner', label: 'Document scanner' },
  { value: 'booklet', label: 'PDF booklet' },
  { value: 'comic', label: 'Comic reader' },
  { value: 'cbz', label: 'CBZ to PDF' },
  { value: 'mhtml', label: 'MHTML to PDF' },
  { value: 'meta', label: 'PDF metadata' },
  { value: 'lock', label: 'Password-protect a PDF' },
  { value: 'unlock', label: 'Unlock a PDF' },
  { value: 'hand', label: 'Handwriting to font' },
] as const

type Mode = (typeof MODES)[number]['value']

const SAMPLE_MHTML = [
  'MIME-Version: 1.0',
  'Content-Type: multipart/related; type="text/html"; boundary="----=_Bit"',
  '',
  '------=_Bit',
  'Content-Type: text/html; charset="utf-8"',
  'Content-Transfer-Encoding: 8bit',
  '',
  '<html><body><h1>Notes</h1><p>Extracted on this device.</p></body></html>',
  '------=_Bit--',
  '',
].join('\n')

const SAMPLE_GLYPHS = [
  'A M80 720 L400 80 L720 720 M240 460 L560 460',
  'B M140 80 L140 720 M140 80 L420 80 Q620 220 420 400 L140 400 M140 400 L460 400 Q680 560 440 720 L140 720',
  'C M640 140 Q200 40 160 400 Q200 760 640 660',
].join('\n')

type ComicPage = { name: string; url: string }

function bytesBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type })
}

async function downloadBytes(bytes: Uint8Array, name: string, type: string): Promise<void> {
  await downloadNamed(bytesBlob(bytes, type), name)
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the PNG.'))), 'image/png')
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image.'))
    img.src = src
  })
}

async function fileToImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await loadImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function mimeFor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'bmp') return 'image/bmp'
  return 'image/png'
}

async function ensurePngOrJpeg(bytes: Uint8Array, name: string): Promise<Uint8Array> {
  if (isPng(bytes) || isJpeg(bytes)) return bytes
  const img = await fileToImage(bytesBlob(bytes, mimeFor(name)))
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width || 1
  canvas.height = img.naturalHeight || img.height || 1
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(img, 0, 0)
  const png = await canvasBlob(canvas)
  return new Uint8Array(await png.arrayBuffer())
}

function baseName(name: string, fallback: string): string {
  const stripped = name.replace(/\.[^.]+$/, '').trim()
  return stripped || fallback
}

export default function DocGapTool() {
  const [mode, setMode] = useState<Mode>('trace')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [traceText, setTraceText] = useState('ABC\ncat')
  const [seed, setSeed] = useState(1)
  const [note, setNote] = useState<string | null>(null)
  const [comic, setComic] = useState<ComicPage[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [zipNames, setZipNames] = useState<string[]>([])
  const [mhtml, setMhtml] = useState(SAMPLE_MHTML)
  const [htmlPart, setHtmlPart] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [pdfName, setPdfName] = useState('document')
  const [glyphText, setGlyphText] = useState(SAMPLE_GLYPHS)
  const [lockNote, setLockNote] = useState<string | null>(null)
  const traceRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const sourceRef = useRef<ImageData | null>(null)
  const pdfBytesRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (mode !== 'trace') return
    const canvas = traceRef.current
    if (!canvas) return
    const ops = dottedText(traceText)
    const size = traceSize(ops)
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1c1c1c'
    for (const op of ops) {
      ctx.beginPath()
      ctx.arc(op.x, op.y, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [mode, traceText])

  useEffect(() => {
    return () => {
      for (const page of comic) URL.revokeObjectURL(page.url)
    }
  }, [comic])

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const takeImage = (files: File[]) => {
    const file = files[0]
    if (!file) return
    void run(async () => {
      const img = await fileToImage(file)
      const size = stageDownscale(img.naturalWidth || img.width, img.naturalHeight || img.height)
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is unavailable.')
      ctx.drawImage(img, 0, 0, size.width, size.height)
      sourceRef.current = ctx.getImageData(0, 0, size.width, size.height)
      setNote(file.name)
      paintImage(mode === 'scanner' ? 'scanner' : 'scan')
    })
  }

  const paintImage = (kind: 'scan' | 'scanner') => {
    const source = sourceRef.current
    const canvas = previewRef.current
    if (!source || !canvas) return
    canvas.width = source.width
    canvas.height = source.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const next =
      kind === 'scan' ? scannedRgba(source.data, source.width, source.height, seed) : liftShadows(source.data)
    const copy = new Uint8ClampedArray(next.length)
    copy.set(next)
    ctx.putImageData(new ImageData(copy, source.width, source.height), 0, 0)
  }

  const downloadPreview = () => {
    const canvas = previewRef.current
    if (!canvas || !canvas.width) return
    void run(async () => {
      const blob = await canvasBlob(canvas)
      const stem = baseName(note ?? '', mode === 'scanner' ? 'document-scan' : 'scanned')
      await downloadNamed(blob, `${stem}.png`)
    })
  }

  const takePdf = (files: File[]) => {
    const file = files[0]
    if (!file) return
    void run(async () => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      pdfBytesRef.current = bytes
      setPdfName(baseName(file.name, 'document'))
      if (mode === 'booklet') {
        const out = await imposeBooklet(bytes)
        await downloadBytes(out, `${baseName(file.name, 'booklet')}-booklet.pdf`, 'application/pdf')
        setNote(`Reordered ${file.name} into saddle-stitch order.`)
        return
      }
      if (mode === 'meta') {
        const meta = await readPdfMeta(bytes)
        if (meta.encrypted) {
          throw new Error('This PDF is encrypted. pdf-lib cannot decrypt it, so the title and author were not read.')
        }
        setTitle(meta.title)
        setAuthor(meta.author)
        setNote(formatMeta(meta))
        return
      }
      const meta = await readPdfMeta(bytes)
      if (mode === 'lock') {
        setLockNote(
          pdfEncryptSupported()
            ? 'Encryption is available in this build.'
            : `${file.name} was not password-protected. pdf-lib 1.17 has no encrypt method and no userPassword save option, so BitKit did not pretend to lock it.`,
        )
        return
      }
      setLockNote(
        pdfUnlockSupported()
          ? 'Password opening is available in this build.'
          : meta.encrypted
            ? `${file.name} is encrypted. pdf-lib 1.17 cannot open it with a password, and BitKit will not try passwords.`
            : `${file.name} is not encrypted. There is nothing to unlock. pdf-lib still cannot open a password-protected PDF.`,
      )
    })
  }

  const saveMeta = () => {
    const bytes = pdfBytesRef.current
    if (!bytes) return
    void run(async () => {
      const out = await writePdfMeta(bytes, { title, author })
      pdfBytesRef.current = out
      setNote(formatMeta({ title, author }))
      await downloadBytes(out, `${pdfName || 'document'}.pdf`, 'application/pdf')
    })
  }

  const takeZip = (files: File[], asPdf: boolean) => {
    const file = files[0]
    if (!file) return
    void run(async () => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const images = await readZipImages(bytes)
      if (!images.length) throw new Error('No images in that archive.')
      setZipNames(images.map((image) => image.name))
      if (asPdf) {
        const pages: Uint8Array[] = []
        for (const image of images) pages.push(await ensurePngOrJpeg(image.data, image.name))
        const pdf = await imagesToPdf(pages)
        await downloadBytes(pdf, `${baseName(file.name, 'comic')}.pdf`, 'application/pdf')
        setNote(`Built a ${pages.length}-page PDF. Remote files were not fetched.`)
        return
      }
      const pages = images.map((image) => ({
        name: image.name,
        url: URL.createObjectURL(bytesBlob(image.data, mimeFor(image.name))),
      }))
      setComic(pages)
      setPageIndex(0)
      setNote(`${pages.length} image${pages.length === 1 ? '' : 's'} in ${file.name}.`)
    })
  }

  const extractMhtml = () => {
    void run(async () => {
      const html = parseMhtml(mhtml)
      setHtmlPart(html)
      setNote('HTML was extracted. Remote addresses in the message were not opened.')
    })
  }

  const downloadMhtmlPdf = () => {
    void run(async () => {
      const html = parseMhtml(mhtml)
      setHtmlPart(html)
      const pdf = await mhtmlToPdf(mhtml)
      setNote('HTML was extracted. Remote addresses in the message were not opened.')
      await downloadBytes(pdf, 'extracted.pdf', 'application/pdf')
    })
  }

  const downloadFont = () => {
    const glyphs = parseGlyphLines(glyphText)
    if (!glyphs.length) {
      setError('Add at least one line shaped like “A M0 0 L10 10”.')
      return
    }
    void run(async () => {
      const svg = svgFont(glyphs)
      await downloadNamed(new Blob([svg], { type: 'image/svg+xml' }), 'handwriting.svg')
      setNote(
        `SVG font with ${glyphs.map((glyph) => glyph.char).join('')}. These are the paths you typed, not traced outlines.`,
      )
    })
  }

  const glyphs = parseGlyphLines(glyphText)
  const fontSvg = glyphs.length ? svgFont(glyphs) : ''
  const comicPage = comic[pageIndex]

  return (
    <ToolLayout
      title="Document workshop"
      lede="Tracing sheets, scan effects, booklets, comics, and PDF details. Files stay in this browser."
    >
      <Segmented
        label="Mode"
        value={mode}
        block
        options={[...MODES]}
        onChange={(next) => {
          setMode(next)
          setError(null)
          setNote(null)
          setLockNote(null)
        }}
      />

      {error ? <p className="status-bad">{error}</p> : null}

      {mode === 'trace' ? (
        <div className="split">
          <section className="panel">
            <label className="field">
              <span>Practice text</span>
              <textarea
                className="text-input"
                rows={5}
                value={traceText}
                spellCheck={false}
                onChange={(event) => setTraceText(event.target.value)}
              />
            </label>
            <p className="hint">Each letter is drawn as dots you can trace. Lowercase uses the capital shape.</p>
            <canvas ref={traceRef} style={{ maxWidth: '100%', height: 'auto', background: '#fff' }} />
          </section>
          <aside className="panel">
            <p className="lede">Tracing worksheets</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const canvas = traceRef.current
                if (!canvas) return
                void run(async () => {
                  await downloadNamed(await canvasBlob(canvas), 'tracing-worksheet.png')
                })
              }}
            >
              Download PNG
            </button>
          </aside>
        </div>
      ) : null}

      {mode === 'scan' || mode === 'scanner' ? (
        <div className="split">
          <section className="panel">
            <DropZone
              accept="image/*"
              label={mode === 'scanner' ? 'Drop a photo of a page.' : 'Drop a photo to give it a scanned look.'}
              hint="The picture is processed in this tab."
              onFiles={takeImage}
            />
            <canvas ref={previewRef} style={{ maxWidth: '100%', height: 'auto' }} />
          </section>
          <aside className="panel">
            <p className="lede">{mode === 'scanner' ? 'Document scanner' : 'Scanned look'}</p>
            {mode === 'scan' ? (
              <label className="field">
                <span>Grain seed</span>
                <input
                  className="text-input"
                  type="number"
                  value={seed}
                  onChange={(event) => setSeed(Number(event.target.value) || 0)}
                />
              </label>
            ) : (
              <p className="hint">
                Dark pixels are lifted so a photo of a page is easier to read. Edges are not detected and the page is
                not rotated.
              </p>
            )}
            <div className="row">
              <button
                type="button"
                className="btn"
                disabled={busy || !sourceRef.current}
                onClick={() => paintImage(mode === 'scanner' ? 'scanner' : 'scan')}
              >
                Apply
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={downloadPreview}>
                Download PNG
              </button>
            </div>
            {note ? <p className="hint">{note}</p> : null}
          </aside>
        </div>
      ) : null}

      {mode === 'booklet' || mode === 'meta' || mode === 'lock' || mode === 'unlock' ? (
        <div className="split">
          <section className="panel">
            <DropZone
              accept="application/pdf,.pdf"
              label={
                mode === 'booklet'
                  ? 'Drop a PDF to reorder as a saddle booklet.'
                  : mode === 'meta'
                    ? 'Drop a PDF to read its title and author.'
                    : mode === 'lock'
                      ? 'Drop a PDF. It will not be password-protected.'
                      : 'Drop a PDF to see whether it is encrypted.'
              }
              hint="The file is not uploaded."
              onFiles={takePdf}
            />
            {mode === 'meta' ? (
              <>
                <label className="field">
                  <span>Title</span>
                  <input className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label className="field">
                  <span>Author</span>
                  <input className="text-input" value={author} onChange={(event) => setAuthor(event.target.value)} />
                </label>
              </>
            ) : null}
            {lockNote ? <p className="hint">{lockNote}</p> : null}
          </section>
          <aside className="panel">
            <p className="lede">
              {mode === 'booklet'
                ? 'PDF booklet'
                : mode === 'meta'
                  ? 'PDF metadata'
                  : mode === 'lock'
                    ? 'Password-protect a PDF'
                    : 'Unlock a PDF'}
            </p>
            {mode === 'booklet' ? (
              <p className="hint">
                Pages are reordered for a folded saddle booklet (8, 1, 2, 7… for an 8-page file). Blank pages pad the
                count to a multiple of 4. The PDF is not scaled onto spreads.
              </p>
            ) : null}
            {mode === 'lock' ? (
              <p className="status-bad">
                {pdfEncryptSupported()
                  ? 'Encryption is reported as available.'
                  : 'pdf-lib 1.17 cannot encrypt a PDF. Nothing downloaded from this mode is password-protected.'}
              </p>
            ) : null}
            {mode === 'unlock' ? (
              <p className="status-bad">
                {pdfUnlockSupported()
                  ? 'Password opening is reported as available.'
                  : 'pdf-lib 1.17 cannot open a PDF with a password. BitKit will not guess one.'}
              </p>
            ) : null}
            {mode === 'meta' ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !pdfBytesRef.current}
                onClick={saveMeta}
              >
                Save PDF
              </button>
            ) : null}
            {note ? <p className="hint">{note}</p> : null}
          </aside>
        </div>
      ) : null}

      {mode === 'comic' || mode === 'cbz' ? (
        <div className="split">
          <section className="panel">
            <DropZone
              accept=".cbz,.zip,application/zip,application/x-cbz"
              label={
                mode === 'comic' ? 'Drop a CBZ or zip of images.' : 'Drop a CBZ or zip to turn each image into a page.'
              }
              hint="Only images inside the archive are used."
              onFiles={(files) => takeZip(files, mode === 'cbz')}
            />
            {mode === 'comic' && comicPage ? (
              <img src={comicPage.url} alt={comicPage.name} style={{ maxWidth: '100%', height: 'auto' }} />
            ) : null}
            {zipNames.length ? <textarea className="code-area" rows={6} readOnly value={zipNames.join('\n')} /> : null}
          </section>
          <aside className="panel">
            <p className="lede">{mode === 'comic' ? 'Comic reader' : 'CBZ to PDF'}</p>
            {mode === 'comic' ? (
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  disabled={!comic.length}
                  onClick={() => setPageIndex((index) => prevPage(index, comic.length))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!comic.length}
                  onClick={() => setPageIndex((index) => nextPage(index, comic.length))}
                >
                  Next
                </button>
              </div>
            ) : (
              <p className="hint">Each image becomes one PDF page, in file-name order. Drop the archive to build it.</p>
            )}
            {comic.length ? (
              <p className="hint">
                {pageIndex + 1} / {comic.length}
                {comicPage ? ` · ${comicPage.name}` : ''}
              </p>
            ) : null}
            {note ? <p className="hint">{note}</p> : null}
          </aside>
        </div>
      ) : null}

      {mode === 'mhtml' ? (
        <div className="split">
          <section className="panel">
            <label className="field">
              <span>MHTML message</span>
              <textarea
                className="code-area"
                rows={10}
                spellCheck={false}
                value={mhtml}
                onChange={(event) => setMhtml(event.target.value)}
              />
            </label>
            <DropZone
              accept=".mht,.mhtml,message/rfc822,text/plain"
              label="Or drop an .mht file."
              hint="The file is read as text. Links inside it are not opened."
              onFiles={(files) => {
                const file = files[0]
                if (!file) return
                void run(async () => {
                  setMhtml(await file.text())
                  setHtmlPart('')
                })
              }}
            />
            {htmlPart ? (
              <>
                <p className="hint">HTML was extracted. It is shown as text so nothing in it can load.</p>
                <textarea className="code-area" rows={8} readOnly value={htmlPart} />
                <p className="hint">
                  {htmlToPlainText(htmlPart) ? 'Plain text is ready for the PDF.' : 'The HTML part had no text.'}
                </p>
              </>
            ) : null}
          </section>
          <aside className="panel">
            <p className="lede">MHTML to PDF</p>
            <div className="row">
              <button type="button" className="btn" disabled={busy} onClick={extractMhtml}>
                Extract HTML
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={downloadMhtmlPdf}>
                Download PDF
              </button>
            </div>
            <p className="hint">
              The PDF is the extracted wording, not a live web page. Remote addresses are not opened.
            </p>
            {note ? <p className="hint">{note}</p> : null}
          </aside>
        </div>
      ) : null}

      {mode === 'hand' ? (
        <div className="split">
          <section className="panel">
            <label className="field">
              <span>Letters and paths</span>
              <textarea
                className="code-area"
                rows={8}
                spellCheck={false}
                value={glyphText}
                onChange={(event) => setGlyphText(event.target.value)}
              />
            </label>
            <p className="hint">
              One letter per line: the character, a space, then an SVG path. A, B, and C are filled in as samples.
            </p>
            {fontSvg ? <textarea className="code-area" rows={8} readOnly value={fontSvg} /> : null}
          </section>
          <aside className="panel">
            <p className="lede">Handwriting to font</p>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={downloadFont}>
              Download SVG font
            </button>
            <p className="hint">The file is an SVG font of the paths you typed. It is not traced from a drawing.</p>
            {note ? <p className="hint">{note}</p> : null}
          </aside>
        </div>
      ) : null}
    </ToolLayout>
  )
}
