import type { ZipEntry } from './zip'

const BLOCK = 512

export function isGzip(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

async function through(format: 'gzip' | 'deflate-raw', data: Uint8Array, compress: boolean): Promise<Uint8Array> {
  const Stream = compress ? CompressionStream : DecompressionStream
  if (typeof Stream === 'undefined') {
    throw new Error('This browser cannot read or write gzip. Use a current Chrome, Edge, Safari, or Firefox.')
  }
  const stream = new Stream(format)
  const writer = stream.writable.getWriter()
  await writer.write(data.slice())
  await writer.close()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
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

export function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  return through('gzip', bytes, false)
}

function field(text: string, length: number): Uint8Array {
  const bytes = new TextEncoder().encode(text)
  if (bytes.length > length) throw new Error(`“${text}” does not fit in a tar header.`)
  const out = new Uint8Array(length)
  out.set(bytes)
  return out
}

function octal(value: number, length: number): Uint8Array {
  return field(value.toString(8).padStart(length - 1, '0') + '\0', length)
}

function headerFor(name: string, size: number, mtime: number): Uint8Array {
  const nameBytes = new TextEncoder().encode(name)
  if (nameBytes.length > 100) {
    throw new Error(`“${name}” is longer than 100 bytes. Tar names here stay short; rename it and try again.`)
  }
  const header = new Uint8Array(BLOCK)
  header.set(nameBytes, 0)
  header.set(octal(0o644, 8), 100)
  header.set(octal(0, 8), 108)
  header.set(octal(0, 8), 116)
  header.set(octal(size, 12), 124)
  header.set(octal(mtime, 12), 136)
  header.fill(0x20, 148, 156)
  header[156] = '0'.charCodeAt(0)
  header.set(field('ustar\0', 6), 257)
  header.set(field('00', 2), 263)
  let sum = 0
  for (const byte of header) sum += byte
  const checksum = sum.toString(8).padStart(6, '0') + '\0 '
  header.set(new TextEncoder().encode(checksum), 148)
  return header
}

/** Uncompressed ustar. Two zero blocks end the archive. */
export function tarPack(entries: ZipEntry[], mtime = Math.floor(Date.now() / 1000)): Uint8Array {
  const parts: Uint8Array[] = []
  for (const entry of entries) {
    const name = entry.name.replaceAll('\\', '/').replace(/^\.\//, '')
    if (!name || name.endsWith('/')) continue
    parts.push(headerFor(name, entry.data.length, mtime))
    parts.push(entry.data)
    const pad = (BLOCK - (entry.data.length % BLOCK)) % BLOCK
    if (pad) parts.push(new Uint8Array(pad))
  }
  parts.push(new Uint8Array(BLOCK * 2))
  const total = parts.reduce((n, part) => n + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export function tarGzip(entries: ZipEntry[]): Promise<Uint8Array> {
  return through('gzip', tarPack(entries), true)
}

function readString(block: Uint8Array, offset: number, length: number): string {
  let end = offset
  const limit = offset + length
  while (end < limit && block[end] !== 0) end += 1
  return new TextDecoder().decode(block.subarray(offset, end))
}

function readOctal(block: Uint8Array, offset: number, length: number): number {
  const text = readString(block, offset, length).trim()
  if (!text) return 0
  const value = Number.parseInt(text, 8)
  if (!Number.isFinite(value)) throw new Error('That tar header has a size BitKit cannot read.')
  return value
}

function checksumOf(block: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < BLOCK; i += 1) sum += i >= 148 && i < 156 ? 0x20 : block[i]
  return sum
}

export type TarEntry = { name: string; size: number; data: Uint8Array }

/** Reads a ustar archive. Directory entries are skipped. */
export function tarExtract(bytes: Uint8Array): TarEntry[] {
  const out: TarEntry[] = []
  let offset = 0
  while (offset + BLOCK <= bytes.length) {
    const block = bytes.subarray(offset, offset + BLOCK)
    offset += BLOCK
    if (block.every((byte) => byte === 0)) break
    const stored = readOctal(block, 148, 8)
    if (stored !== checksumOf(block)) throw new Error('That tar header failed its checksum.')
    const type = block[156]
    const size = readOctal(block, 124, 12)
    const name = readString(block, 0, 100)
    if (type === 'L'.charCodeAt(0) || type === 'x'.charCodeAt(0) || type === 'X'.charCodeAt(0)) {
      throw new Error('That tar uses an extended name header. Rename the file to under 100 bytes and pack it here.')
    }
    const data = bytes.subarray(offset, offset + size)
    offset += size + ((BLOCK - (size % BLOCK)) % BLOCK)
    if (type === 0 || type === '0'.charCodeAt(0)) out.push({ name, size, data })
  }
  if (!out.length) throw new Error('That archive has no files.')
  return out
}
