/**
 * Permanent PDF redaction.
 *
 * A white rectangle drawn on top of text can be deleted, and the words
 * copied out from underneath. Redaction replaces every page that has a
 * mark with a picture of that page, black boxes included, so the text
 * layer on that page is gone. Pages without a mark are copied unchanged.
 */

import { PDFDocument } from 'pdf-lib'
import { destroyPdfJs, openPdfJs } from './pdfJs'
import { renderPageCanvas } from './pdfRaster'

export type RedactRect = { x: number; y: number; w: number; h: number }

export function rectsOverlap(a: RedactRect, b: RedactRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export async function redactPdf(
  source: Uint8Array,
  pages: { sourceIndex: number; boxes: RedactRect[] }[],
  renderFlattened: (sourceIndex: number) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const src = await PDFDocument.load(source)
  const out = await PDFDocument.create()
  for (const entry of pages) {
    if (!entry.boxes.length) {
      const [copied] = await out.copyPages(src, [entry.sourceIndex])
      out.addPage(copied)
      continue
    }
    const png = await renderFlattened(entry.sourceIndex)
    const image = await out.embedPng(png)
    const sourcePage = src.getPage(entry.sourceIndex)
    const page = out.addPage([sourcePage.getWidth(), sourcePage.getHeight()])
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() })
  }
  return out.save()
}

async function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not encode the redacted page.')
  return new Uint8Array(await blob.arrayBuffer())
}

/** Flattens marked pages in the browser. Boxes are top-left, in PDF points. */
export async function redactPdfLocal(
  source: Uint8Array,
  pages: { sourceIndex: number; boxes: RedactRect[] }[],
): Promise<Uint8Array> {
  const { pdfjs } = await import('./pdfjsRuntime')
  const doc = await openPdfJs(pdfjs, source)
  try {
    return await redactPdf(source, pages, async (index) => {
      const boxes = pages.find((page) => page.sourceIndex === index)?.boxes ?? []
      const { canvas, scale } = await renderPageCanvas(doc, index + 1, 144)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is unavailable.')
      ctx.fillStyle = '#000000'
      for (const box of boxes) ctx.fillRect(box.x * scale, box.y * scale, box.w * scale, box.h * scale)
      return canvasPng(canvas)
    })
  } finally {
    await destroyPdfJs(doc)
  }
}
