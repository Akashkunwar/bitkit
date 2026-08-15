import { useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { imagesToPdf, type PageFit } from '../../lib/imagePdf'
import { zipStore } from '../../lib/zip'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type Mode = 'to-pdf' | 'to-images'

export default function ImagePdfTool() {
  const [mode, setMode] = useState<Mode>('to-pdf')
  const [files, setFiles] = useState<File[]>([])
  const [fit, setFit] = useState<PageFit>('fit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outFile, setOutFile] = useState<File | null>(null)

  const addFiles = (incoming: File[]) => {
    setFiles((prev) => [...prev, ...incoming])
    setOutFile(null)
  }

  useHandoff((payload) => {
    if (payload.files?.length) addFiles(payload.files)
  })

  const run = async () => {
    if (!files.length) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'to-pdf') {
        const images = files.filter((f) => f.type.startsWith('image/'))
        const bytes = await imagesToPdf(images, fit)
        const file = new File([bytes.slice().buffer as ArrayBuffer], 'images.pdf', { type: 'application/pdf' })
        setOutFile(file)
        triggerDownload(file, file.name)
        return
      }
      const pdf = files.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      if (!pdf) throw new Error('Drop a PDF to convert to images.')
      const data = new Uint8Array(await pdf.arrayBuffer())
      const doc = await pdfjs.getDocument({ data }).promise
      const entries: { name: string; data: Uint8Array }[] = []
      const outFiles: File[] = []
      for (let i = 1; i <= doc.numPages; i += 1) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width
        canvas.height = vp.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas is unavailable.')
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed.'))), 'image/jpeg', 0.92)
        })
        const bytes = new Uint8Array(await blob.arrayBuffer())
        const name = `page-${String(i).padStart(2, '0')}.jpg`
        entries.push({ name, data: bytes })
        outFiles.push(new File([blob], name, { type: 'image/jpeg' }))
      }
      if (entries.length === 1) {
        triggerDownload(new Blob([entries[0].data.slice().buffer as ArrayBuffer], { type: 'image/jpeg' }), entries[0].name)
      } else {
        const zip = zipStore(entries)
        triggerDownload(new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }), 'pdf-pages.zip')
      }
      setOutFile(outFiles[0] ?? null)
      if (outFiles.length) setFiles(outFiles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Image ↔ PDF"
      lede="Turn screenshots into a packet, or rasterize a PDF into JPEGs. Encoding stays in this tab."
    >
      <Segmented
        label="Direction"
        value={mode}
        options={[
          { value: 'to-pdf', label: 'Images → PDF' },
          { value: 'to-images', label: 'PDF → images' },
        ]}
        onChange={setMode}
      />
      <DropZone
        accept={mode === 'to-pdf' ? 'image/*' : 'application/pdf,.pdf'}
        multiple={mode === 'to-pdf'}
        label={mode === 'to-pdf' ? 'Drop images in page order.' : 'Drop a PDF.'}
        onFiles={addFiles}
      />
      <div className="split">
        <section className="panel">
          {!files.length ? <p className="muted">Nothing queued.</p> : null}
          {files.map((file) => (
            <p key={file.name + file.size}>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          ))}
        </section>
        <aside className="panel">
          {mode === 'to-pdf' ? (
            <Segmented
              label="Page size"
              value={fit}
              options={[
                { value: 'fit', label: 'Fit image' },
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
              ]}
              onChange={setFit}
            />
          ) : (
            <p className="hint">Pages render at 2× for a sharper JPEG. Multi-page PDFs download as a ZIP.</p>
          )}
          <button type="button" className="btn btn-primary" disabled={!files.length || busy} onClick={() => void run()}>
            {busy ? 'Working…' : 'Convert'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => { setFiles([]); setOutFile(null) }}>
            Clear
          </button>
          {error ? <p className="status-bad">{error}</p> : null}
          <SendTo from="image-pdf" files={outFile ? [outFile] : files} />
        </aside>
      </div>
    </ToolLayout>
  )
}
