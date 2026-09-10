import { crc32, crc32Feed, crc32Final, crc32Init } from './zip'

export type HashAlgo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | 'CRC-32'

export const HASH_ALGOS: HashAlgo[] = ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512', 'CRC-32']

/** WebCrypto must buffer the whole file; refuse sizes that would crash the tab. */
export const HASH_MAX_BYTES = 256 * 1024 * 1024

export function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const CHUNK = 8 * 1024 * 1024

export async function hashFile(
  file: Blob,
  algo: HashAlgo,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  if (file.size > HASH_MAX_BYTES) {
    throw new Error(
      `This file is larger than ${Math.round(HASH_MAX_BYTES / 1024 / 1024)} MB. Hashing it would likely crash this tab.`,
    )
  }

  if (algo === 'CRC-32') {
    let crc = crc32Init()
    const total = file.size || 1
    let offset = 0
    while (offset < file.size) {
      const slice = file.slice(offset, Math.min(offset + CHUNK, file.size))
      crc = crc32Feed(crc, new Uint8Array(await slice.arrayBuffer()))
      offset += CHUNK
      onProgress?.(Math.min(1, offset / total))
    }
    onProgress?.(1)
    return crc32Final(crc).toString(16).padStart(8, '0')
  }

  const total = file.size
  if (total <= CHUNK) {
    const digest = await crypto.subtle.digest(algo, await file.arrayBuffer())
    onProgress?.(1)
    return toHex(digest)
  }

  const buffer = new Uint8Array(total)
  let offset = 0
  while (offset < total) {
    const slice = file.slice(offset, Math.min(offset + CHUNK, total))
    buffer.set(new Uint8Array(await slice.arrayBuffer()), offset)
    offset += CHUNK
    onProgress?.(Math.min(1, offset / total))
  }
  return toHex(await crypto.subtle.digest(algo, buffer))
}

export async function hashText(text: string, algo: HashAlgo): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  if (algo === 'CRC-32') return crc32(bytes).toString(16).padStart(8, '0')
  return toHex(await crypto.subtle.digest(algo, bytes))
}

/** Case- and whitespace-insensitive comparison, tolerating pasted "sha256:" prefixes. */
export function hashesMatch(actual: string, expected: string): boolean {
  const clean = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^[a-z0-9-]+[:=]\s*/, '')
      .replace(/\s+/g, '')
  const a = clean(actual)
  const b = clean(expected)
  return Boolean(a) && a === b
}

/** Guesses which algorithm a pasted hex digest came from, by length. */
export function algoForDigest(value: string): HashAlgo | null {
  const hex = value.trim().replace(/^[a-z0-9-]+[:=]\s*/i, '').replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null
  switch (hex.length) {
    case 8:
      return 'CRC-32'
    case 40:
      return 'SHA-1'
    case 64:
      return 'SHA-256'
    case 96:
      return 'SHA-384'
    case 128:
      return 'SHA-512'
    default:
      return null
  }
}
