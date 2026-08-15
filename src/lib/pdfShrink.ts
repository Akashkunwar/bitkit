import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export type ShrinkPreset = 'screen' | 'ebook' | 'print'

/** Target raster density per preset, in CSS pixels per PDF point (72pt = 1in). */
const PRESET_SCALE: Record<ShrinkPreset, number> = {
  screen: 100 / 72,
  ebook: 150 / 72,
  print: 220 / 72,
}

export type ShrinkOptions = {
  preset: ShrinkPreset
  /** Hard byte ceiling. When set, quality and scale step down until it fits. */
  maxBytes?: number
  grayscale?: boolean
  quality?: number
}

export type ShrinkResult = {
  bytes: Uint8Array
  pages: number
  quality: number
  scale: number
  withinLimit: boolean
}

export type ShrinkProgress = { page: number; pages: number; pass: number }

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function toGrayscale(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    // Rec. 601 luma keeps scanned text legible better than a flat average.
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = y
    data[i + 1] = y
    data[i + 2] = y
  }
  ctx.putImageData(image, 0, 0)
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode a page.'))),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Renders each page to a raster and rebuilds the document from those images.
 * Text stops being selectable, which is the trade every "compress PDF" service
 * makes; it is what turns an 8 MB scan into something a portal will accept.
 */
async function renderPass(
  doc: PDFDocumentProxy,
  scale: number,
  quality: number,
  grayscale: boolean,
  onProgress?: (progress: ShrinkProgress) => void,
  pass = 1,
): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n)
    const viewport = page.getViewport({ scale })
    const canvas = makeCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable in this browser.')
    // Scanned pages are often transparent; JPEG has no alpha, so lay down white.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    if (grayscale) toGrayscale(canvas)

    const jpeg = await encodeJpeg(canvas, quality)
    const embedded = await out.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))
    // Keep the original point size so the page prints at its true dimensions.
    const base = page.getViewport({ scale: 1 })
    const target = out.addPage([base.width, base.height])
    target.drawImage(embedded, { x: 0, y: 0, width: base.width, height: base.height })

    canvas.width = 0
    canvas.height = 0
    page.cleanup()
    onProgress?.({ page: n, pages: doc.numPages, pass })
  }
  return out.save()
}

export async function shrinkPdf(
  doc: PDFDocumentProxy,
  options: ShrinkOptions,
  onProgress?: (progress: ShrinkProgress) => void,
): Promise<ShrinkResult> {
  let scale = PRESET_SCALE[options.preset]
  let quality = options.quality ?? 0.72
  const grayscale = Boolean(options.grayscale)

  let bytes = await renderPass(doc, scale, quality, grayscale, onProgress, 1)
  if (!options.maxBytes || bytes.length <= options.maxBytes) {
    return { bytes, pages: doc.numPages, quality, scale, withinLimit: true }
  }

  // Drop quality first (cheap, preserves layout), then resolution, then both.
  const steps: { quality: number; scale: number }[] = [
    { quality: 0.6, scale },
    { quality: 0.5, scale: scale * 0.8 },
    { quality: 0.42, scale: scale * 0.65 },
    { quality: 0.35, scale: scale * 0.5 },
    { quality: 0.3, scale: scale * 0.4 },
  ]
  for (const [i, step] of steps.entries()) {
    quality = step.quality
    scale = step.scale
    bytes = await renderPass(doc, scale, quality, grayscale, onProgress, i + 2)
    if (bytes.length <= options.maxBytes) {
      return { bytes, pages: doc.numPages, quality, scale, withinLimit: true }
    }
  }
  return { bytes, pages: doc.numPages, quality, scale, withinLimit: false }
}

/** Strips metadata that survives a normal save, without re-rastering anything. */
export async function stripPdfMetadata(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setProducer('')
  doc.setCreator('')
  return doc.save({ useObjectStreams: true })
}

/** Lossless-ish repack: pdf-lib rewrites the xref and drops orphaned objects. */
export async function repackPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.save({ useObjectStreams: true })
}
