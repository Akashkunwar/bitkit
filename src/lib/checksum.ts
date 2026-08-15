import { crc32 } from './zip'

export type HashAlgo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | 'CRC-32'

export const HASH_ALGOS: HashAlgo[] = ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512', 'CRC-32']

export function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * WebCrypto has no streaming digest, so a whole-file hash needs the file in
 * memory. Reading in chunks at least keeps CRC-32 streaming and lets the UI
 * report progress instead of freezing on a multi-gigabyte file.
 */
const CHUNK = 8 * 1024 * 1024

export async function hashFile(
  file: Blob,
  algo: HashAlgo,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  if (algo === 'CRC-32') {
    const bytes = new Uint8Array(await file.arrayBuffer())
    onProgress?.(1)
    return crc32(bytes).toString(16).padStart(8, '0')
  }

  const total = file.size
  if (total <= CHUNK) {
    const digest = await crypto.subtle.digest(algo, await file.arrayBuffer())
    onProgress?.(1)
    return toHex(digest)
  }

  // Larger inputs are concatenated in one pass with progress reporting, since
  // subtle.digest cannot be fed incrementally.
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
