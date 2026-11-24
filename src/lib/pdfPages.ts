import { PDFDocument } from 'pdf-lib'
import { loadPdf } from './pdfLoad'

export async function inspectPdf(bytes: Uint8Array): Promise<{ pages: number; encrypted: boolean }> {
  const { doc, encrypted } = await loadPdf(bytes)
  return { pages: doc.getPageCount(), encrypted }
}

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  return (await inspectPdf(bytes)).pages
}

export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  if (!files.length) throw new Error('Drop at least one PDF.')
  const out = await PDFDocument.create()
  for (const bytes of files) {
    const { doc: src } = await loadPdf(bytes)
    const copied = await out.copyPages(src, src.getPageIndices())
    for (const page of copied) out.addPage(page)
  }
  return out.save()
}

export async function extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  const { doc: src } = await loadPdf(bytes)
  const count = src.getPageCount()
  const unique = [...new Set(indices.filter((i) => i >= 0 && i < count))]
  if (!unique.length) throw new Error('No pages in that range.')
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, unique)
  for (const page of copied) out.addPage(page)
  return out.save()
}

export async function splitPdf(bytes: Uint8Array): Promise<{ index: number; bytes: Uint8Array }[]> {
  const { doc: src } = await loadPdf(bytes)
  const out: { index: number; bytes: Uint8Array }[] = []
  for (const i of src.getPageIndices()) {
    const doc = await PDFDocument.create()
    const [page] = await doc.copyPages(src, [i])
    doc.addPage(page)
    out.push({ index: i, bytes: await doc.save() })
  }
  return out
}

export type PageMargins = { top: number; right: number; bottom: number; left: number }

/** PDF crop box. Origin is the bottom-left of the page, in points. */
export function cropBox(
  pageWidth: number,
  pageHeight: number,
  margin: PageMargins,
): { x: number; y: number; width: number; height: number } {
  const width = pageWidth - margin.left - margin.right
  const height = pageHeight - margin.top - margin.bottom
  if (!(width >= 1) || !(height >= 1)) throw new Error('Those margins leave no page.')
  return { x: margin.left, y: margin.bottom, width, height }
}

/** Shrink every page's visible crop box. The file is not re-rendered. */
export async function cropPdf(bytes: Uint8Array, margin: PageMargins): Promise<Uint8Array> {
  const { doc } = await loadPdf(bytes)
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    const box = cropBox(width, height, margin)
    page.setCropBox(box.x, box.y, box.width, box.height)
  }
  return doc.save()
}

/** Parse 1-based ranges like `1-3,5,8-9` into 0-based page indices. */
export function parsePageRange(input: string, pageCount: number): number[] {
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const indices: number[] = []
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) throw new Error(`Could not parse page range “${part}”. Use 1-3,5.`)
    const start = Number(m[1])
    const end = m[2] ? Number(m[2]) : start
    const from = Math.min(start, end)
    const to = Math.max(start, end)
    if (from < 1 || to > pageCount) throw new Error(`Pages must be between 1 and ${pageCount}.`)
    for (let n = from; n <= to; n += 1) indices.push(n - 1)
  }
  return indices
}
