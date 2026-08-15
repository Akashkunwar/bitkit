import { PDFDocument } from 'pdf-lib'

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.getPageCount()
}

export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  if (!files.length) throw new Error('Drop at least one PDF.')
  const out = await PDFDocument.create()
  for (const bytes of files) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const copied = await out.copyPages(src, src.getPageIndices())
    for (const page of copied) out.addPage(page)
  }
  return out.save()
}

export async function extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const count = src.getPageCount()
  const unique = [...new Set(indices.filter((i) => i >= 0 && i < count))]
  if (!unique.length) throw new Error('No pages in that range.')
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, unique)
  for (const page of copied) out.addPage(page)
  return out.save()
}

export async function splitPdf(bytes: Uint8Array): Promise<{ index: number; bytes: Uint8Array }[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const out: { index: number; bytes: Uint8Array }[] = []
  for (const i of src.getPageIndices()) {
    const doc = await PDFDocument.create()
    const [page] = await doc.copyPages(src, [i])
    doc.addPage(page)
    out.push({ index: i, bytes: await doc.save() })
  }
  return out
}

/** Parse 1-based ranges like `1-3,5,8-9` into 0-based page indices. */
export function parsePageRange(input: string, pageCount: number): number[] {
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean)
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
