/**
 * Reading side of the ZIP container.
 *
 * The writing side lives in `zip.ts` (STORE only). This module is the reader,
 * shared by every format that is really a ZIP underneath: .xlsx, .docx, .pptx,
 * and plain archives the user drops on the archive tool.
 */

export type ZipFile = { name: string; data: Uint8Array }

export async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot expand compressed archives. Try a current Chrome, Edge, Safari, or Firefox.')
  }
  // Fed through the stream directly rather than via a Blob, so this also works
  // where Blob.stream() is missing (jsdom, older WebViews).
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  void writer.write(data.slice())
  void writer.close()
  const chunks: Uint8Array[] = []
  const reader = ds.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const total = chunks.reduce((n, chunk) => n + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/** Offset of the end-of-central-directory record, scanning back from the tail. */
function findEocd(bytes: Uint8Array, dv: DataView): number {
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 22 - 65_536; i -= 1) {
    if (dv.getUint32(i, true) === 0x06054b50) return i
  }
  throw new Error('That file is not a ZIP container (no ZIP directory found).')
}

/** Reads a ZIP central directory and returns every entry, inflating as needed. */
export async function unzip(bytes: Uint8Array): Promise<ZipFile[]> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocd = findEocd(bytes, dv)

  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out: ZipFile[] = []
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > bytes.length || dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const compressedSize = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    const localOffset = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen))

    // The local header repeats name/extra lengths, and they may differ.
    const localNameLen = dv.getUint16(localOffset + 26, true)
    const localExtraLen = dv.getUint16(localOffset + 28, true)
    const start = localOffset + 30 + localNameLen + localExtraLen
    const raw = bytes.subarray(start, start + compressedSize)
    out.push({ name, data: method === 0 ? raw : await inflateRaw(raw) })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

/** Entry names and sizes without expanding anything. Cheap enough for a listing. */
export function zipIndex(bytes: Uint8Array): { name: string; size: number; compressed: number }[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocd = findEocd(bytes, dv)
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out: { name: string; size: number; compressed: number }[] = []
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > bytes.length || dv.getUint32(p, true) !== 0x02014b50) break
    const compressed = dv.getUint32(p + 20, true)
    const size = dv.getUint32(p + 24, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    out.push({
      name: new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen)),
      size,
      compressed,
    })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}
