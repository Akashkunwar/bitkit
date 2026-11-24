export const HEX_PREVIEW_BYTES = 64 * 1024

export type HexRow = { offset: string; hex: string; ascii: string }

export function hexRows(bytes: Uint8Array, width = 16): HexRow[] {
  const rows: HexRow[] = []
  const columns = width === 8 ? 8 : 16
  for (let i = 0; i < bytes.length; i += columns) {
    const slice = bytes.subarray(i, i + columns)
    const hex = [...slice].map((byte) => byte.toString(16).padStart(2, '0')).join(' ')
    const ascii = [...slice].map((byte) => (byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '·')).join('')
    rows.push({ offset: i.toString(16).padStart(8, '0'), hex, ascii })
  }
  return rows
}

function text(bytes: Uint8Array, length: number): string {
  return String.fromCharCode(...bytes.subarray(0, length))
}

/** A label for the first bytes. Unknown files stay "Unknown" rather than a guess. */
export function sniffType(bytes: Uint8Array): string {
  if (bytes.length >= 8 && bytes[0] === 0x89 && text(bytes, 4) === '\u0089PNG') return 'PNG'
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return 'PNG'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'JPEG'
  if (text(bytes, 6) === 'GIF87a' || text(bytes, 6) === 'GIF89a') return 'GIF'
  if (text(bytes, 4) === '%PDF') return 'PDF'
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07))
    return 'ZIP'
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return 'gzip'
  if (text(bytes, 4) === 'RIFF' && text(bytes.subarray(8), 4) === 'WEBP') return 'WebP'
  if (text(bytes, 4) === 'RIFF' && text(bytes.subarray(8), 4) === 'WAVE') return 'WAV'
  if (bytes.length >= 12 && text(bytes.subarray(4), 4) === 'ftyp') return 'MP4'
  if (text(bytes, 4) === 'OggS') return 'Ogg'
  if (text(bytes, 4) === 'fLaC') return 'FLAC'
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return 'MP3'
  if (text(bytes, 4) === '\u007fELF') return 'ELF'
  if (bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d) return 'WebAssembly'
  if (text(bytes, 15) === 'SQLite format 3') return 'SQLite'
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'UTF-8 text'
  return 'Unknown'
}
