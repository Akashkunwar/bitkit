import type { PDFDocumentProxy } from 'pdfjs-dist'
import { CANVAS_SAFE_MAX } from './image/limits'

export type RasterFormat = 'png' | 'jpeg' | 'webp'

export const RASTER_MIME: Record<RasterFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const RASTER_EXT: Record<RasterFormat, string> = { png: 'png', jpeg: 'jpg', webp: 'webp' }

/**
 * Render scale for a target DPI. PDF user space is 72 units per inch, so 150
 * DPI is a scale of 150/72. The result is capped so neither side exceeds the
 * canvas limit browsers enforce — an A0 poster at 300 DPI would not fit.
 */
export function scaleForDpi(pageWidthPt: number, pageHeightPt: number, dpi: number): number {
  const scale = dpi / 72
  const longest = Math.max(pageWidthPt, pageHeightPt) * scale
  return longest > CANVAS_SAFE_MAX ? CANVAS_SAFE_MAX / Math.max(pageWidthPt, pageHeightPt) : scale
}

/** Output file name for a page, zero-padded so files sort in page order. */
export function pageFileName(base: string, pageNumber: number, pageCount: number, format: RasterFormat): string {
  const width = Math.max(2, String(pageCount).length)
  return `${base}-page-${String(pageNumber).padStart(width, '0')}.${RASTER_EXT[format]}`
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encode failed.'))), type, quality)
  })
}

async function renderToCanvas(doc: PDFDocumentProxy, pageNumber: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber)
  try {
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')
    // Paper is white; without this, transparent PDFs become black JPEGs.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    return canvas
  } finally {
    page.cleanup()
  }
}

/** Renders one page as an image file at the given DPI. */
export async function renderPageImage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: { format: RasterFormat; dpi: number; quality: number },
): Promise<Blob> {
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  page.cleanup()
  const scale = scaleForDpi(base.width, base.height, options.dpi)
  const canvas = await renderToCanvas(doc, pageNumber, scale)
  const mime = RASTER_MIME[options.format]
  const blob = await canvasToBlob(canvas, mime, options.format === 'png' ? undefined : options.quality)
  // Safari silently falls back to PNG when it cannot encode WebP.
  if (blob.type && blob.type !== mime) {
    throw new Error(`This browser cannot save ${options.format.toUpperCase()} images. Pick PNG or JPEG instead.`)
  }
  canvas.width = 0
  canvas.height = 0
  return blob
}

/** A small preview of one page, as an object URL the caller must revoke. */
export async function renderPageThumb(doc: PDFDocumentProxy, pageNumber: number, width = 220): Promise<string> {
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  page.cleanup()
  const canvas = await renderToCanvas(doc, pageNumber, (width * (window.devicePixelRatio > 1 ? 1.5 : 1)) / base.width)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8)
  return URL.createObjectURL(blob)
}
