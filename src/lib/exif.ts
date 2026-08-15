export type ExifTag = { label: string; value: string; group: string }

export type GpsFix = { lat: number; lon: number }

export type MetadataResult = {
  format: string
  tags: ExifTag[]
  gps: GpsFix | null
  stripKind: 'jpeg' | 'png' | 'reencode'
}

const JPEG_TAGS: Record<number, string> = {
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x013b: 'Artist',
  0x8298: 'Copyright',
  0x8769: 'ExifIFD',
  0x8825: 'GPSIFD',
  0x829a: 'ExposureTime',
  0x829d: 'FNumber',
  0x8827: 'ISO',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x920a: 'FocalLength',
  0xa002: 'PixelXDimension',
  0xa003: 'PixelYDimension',
  0xa433: 'LensMake',
  0xa434: 'LensModel',
}

const GPS_TAGS: Record<number, string> = {
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0006: 'GPSAltitude',
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function ascii(bytes: Uint8Array, start: number, len: number): string {
  return new TextDecoder('latin1').decode(bytes.subarray(start, start + len)).replaceAll('\0', '').trim()
}

function readValue(
  bytes: Uint8Array,
  le: boolean,
  tiff: number,
  type: number,
  count: number,
  inline: number,
): string | number | number[] | null {
  const size =
    type === 1 || type === 2 || type === 7 ? 1 : type === 3 ? 2 : type === 4 || type === 9 ? 4 : type === 5 || type === 10 ? 8 : 0
  if (!size) return null
  const total = size * count
  const offset = tiff + inline
  const dv = viewOf(bytes)

  if (type === 2) {
    if (total <= 4) {
      const tmp = new Uint8Array(4)
      new DataView(tmp.buffer).setUint32(0, inline, le)
      return ascii(tmp, 0, count)
    }
    if (offset + count > bytes.length) return null
    return ascii(bytes, offset, count)
  }

  if (type === 5 || type === 10) {
    if (total <= 4) return null
    const nums: number[] = []
    for (let i = 0; i < count; i += 1) {
      const p = offset + i * 8
      if (p + 8 > bytes.length) break
      const num = type === 10 ? dv.getInt32(p, le) : dv.getUint32(p, le)
      const den = type === 10 ? dv.getInt32(p + 4, le) : dv.getUint32(p + 4, le)
      nums.push(den ? num / den : 0)
    }
    return nums.length === 1 ? nums[0] : nums
  }

  if (total <= 4) {
    if (type === 3) {
      const vals = []
      for (let i = 0; i < count; i += 1) vals.push((inline >>> (16 * i)) & 0xffff)
      return count === 1 ? vals[0] : vals
    }
    if (type === 1 || type === 7) return inline & 0xff
    return inline >>> 0
  }

  const readAt = (pos: number): number => {
    if (type === 3) return dv.getUint16(pos, le)
    if (type === 4) return dv.getUint32(pos, le)
    if (type === 9) return dv.getInt32(pos, le)
    return dv.getUint8(pos)
  }
  const vals: number[] = []
  for (let i = 0; i < count; i += 1) vals.push(readAt(offset + i * size))
  return count === 1 ? vals[0] : vals
}

type IfdMap = Record<string, string | number | number[]>

function readIfd(bytes: Uint8Array, le: boolean, tiff: number, offset: number, names: Record<number, string>): IfdMap {
  const dv = viewOf(bytes)
  const start = tiff + offset
  if (start + 2 > bytes.length) return {}
  const count = dv.getUint16(start, le)
  const out: IfdMap = {}
  for (let i = 0; i < count; i += 1) {
    const p = start + 2 + i * 12
    if (p + 12 > bytes.length) break
    const tag = dv.getUint16(p, le)
    const type = dv.getUint16(p + 2, le)
    const n = dv.getUint32(p + 4, le)
    const inline = dv.getUint32(p + 8, le)
    const name = names[tag]
    if (!name) continue
    const value = readValue(bytes, le, tiff, type, n, inline)
    if (value != null) out[name] = value
  }
  return out
}

function formatValue(value: string | number | number[]): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value)
    return value.toPrecision(6).replace(/\.?0+$/, '')
  }
  return value.map((n) => formatValue(n)).join(', ')
}

function dmsToDecimal(dms: number[], ref: string): number | null {
  if (dms.length < 3) return null
  const sign = ref === 'S' || ref === 'W' ? -1 : 1
  return sign * (dms[0] + dms[1] / 60 + dms[2] / 3600)
}

function parseTiff(bytes: Uint8Array, tiff: number): { tags: ExifTag[]; gps: GpsFix | null } {
  const dv = viewOf(bytes)
  if (tiff + 8 > bytes.length) return { tags: [], gps: null }
  const mag = ascii(bytes, tiff, 2)
  const le = mag === 'II'
  if (mag !== 'II' && mag !== 'MM') return { tags: [], gps: null }
  const ifd0 = dv.getUint32(tiff + 4, le)
  const main = readIfd(bytes, le, tiff, ifd0, JPEG_TAGS)
  const tags: ExifTag[] = []
  const push = (group: string, map: IfdMap, skip: string[]) => {
    for (const [label, value] of Object.entries(map)) {
      if (skip.includes(label)) continue
      tags.push({ label, value: formatValue(value), group })
    }
  }
  push('Image', main, ['ExifIFD', 'GPSIFD'])

  let gps: GpsFix | null = null
  const exifOff = main.ExifIFD
  if (typeof exifOff === 'number') {
    const exif = readIfd(bytes, le, tiff, exifOff, JPEG_TAGS)
    push('Camera', exif, ['ExifIFD', 'GPSIFD'])
  }
  const gpsOff = main.GPSIFD
  if (typeof gpsOff === 'number') {
    const g = readIfd(bytes, le, tiff, gpsOff, GPS_TAGS)
    push('GPS', g, [])
    const lat = Array.isArray(g.GPSLatitude) ? g.GPSLatitude : null
    const lon = Array.isArray(g.GPSLongitude) ? g.GPSLongitude : null
    const latRef = typeof g.GPSLatitudeRef === 'string' ? g.GPSLatitudeRef : 'N'
    const lonRef = typeof g.GPSLongitudeRef === 'string' ? g.GPSLongitudeRef : 'E'
    if (lat && lon) {
      const la = dmsToDecimal(lat, latRef)
      const lo = dmsToDecimal(lon, lonRef)
      if (la != null && lo != null) gps = { lat: la, lon: lo }
    }
  }
  return { tags, gps }
}

function parseJpeg(bytes: Uint8Array): MetadataResult | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let i = 2
  const tags: ExifTag[] = []
  let gps: GpsFix | null = null
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) break
    const marker = bytes[i + 1]
    if (marker === 0xda) break
    const len = (bytes[i + 2] << 8) | bytes[i + 3]
    const payload = bytes.subarray(i + 4, i + 2 + len)
    if (marker === 0xe1 && ascii(payload, 0, 4) === 'Exif') {
      const parsed = parseTiff(payload, 6)
      tags.push(...parsed.tags)
      gps = parsed.gps
    } else if (marker === 0xe1 && ascii(payload, 0, 15).startsWith('http://ns.adobe')) {
      tags.push({ label: 'XMP', value: 'Present', group: 'Document' })
    } else if (marker === 0xed) {
      tags.push({ label: 'IPTC', value: 'Present', group: 'Document' })
    } else if (marker === 0xfe) {
      tags.push({ label: 'Comment', value: ascii(payload, 0, payload.length), group: 'Document' })
    }
    i += 2 + len
  }
  tags.unshift({ label: 'File size', value: `${bytes.length} bytes`, group: 'File' })
  return { format: 'JPEG', tags, gps, stripKind: 'jpeg' }
}

function parsePng(bytes: Uint8Array): MetadataResult | null {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  if (sig.some((b, i) => bytes[i] !== b)) return null
  const tags: ExifTag[] = []
  let gps: GpsFix | null = null
  let i = 8
  const dv = viewOf(bytes)
  while (i + 12 <= bytes.length) {
    const len = dv.getUint32(i)
    const type = ascii(bytes, i + 4, 4)
    const data = bytes.subarray(i + 8, i + 8 + len)
    if (type === 'IHDR') {
      tags.push({ label: 'Width', value: String(dv.getUint32(i + 8)), group: 'Image' })
      tags.push({ label: 'Height', value: String(dv.getUint32(i + 12)), group: 'Image' })
    } else if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
      const text = ascii(data, 0, Math.min(data.length, 200))
      tags.push({ label: type, value: text.replace('\0', ' = '), group: 'Text' })
    } else if (type === 'eXIf') {
      const parsed = parseTiff(data, 0)
      tags.push(...parsed.tags)
      gps = parsed.gps
    } else if (type === 'pHYs') {
      const x = dv.getUint32(i + 8)
      const y = dv.getUint32(i + 12)
      tags.push({ label: 'Pixels per unit', value: `${x} × ${y}`, group: 'Image' })
    } else if (type === 'tIME') {
      tags.push({ label: 'Last modified', value: 'Present', group: 'Document' })
    }
    i += 12 + len
  }
  tags.unshift({ label: 'File size', value: `${bytes.length} bytes`, group: 'File' })
  return { format: 'PNG', tags, gps, stripKind: 'png' }
}

function parseWebp(bytes: Uint8Array): MetadataResult | null {
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return null
  const tags: ExifTag[] = [{ label: 'File size', value: `${bytes.length} bytes`, group: 'File' }]
  let gps: GpsFix | null = null
  let i = 12
  const dv = viewOf(bytes)
  while (i + 8 <= bytes.length) {
    const type = ascii(bytes, i, 4)
    const size = dv.getUint32(i + 4, true)
    const data = bytes.subarray(i + 8, i + 8 + size)
    if (type === 'EXIF') {
      const parsed = parseTiff(data, 0)
      tags.push(...parsed.tags)
      gps = parsed.gps
    } else if (type === 'XMP ') {
      tags.push({ label: 'XMP', value: 'Present', group: 'Document' })
    }
    i += 8 + size + (size % 2)
  }
  return { format: 'WebP', tags, gps, stripKind: 'reencode' }
}

export async function readMetadata(file: Blob): Promise<MetadataResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const jpeg = parseJpeg(bytes)
  if (jpeg) return jpeg
  const png = parsePng(bytes)
  if (png) return png
  const webp = parseWebp(bytes)
  if (webp) return webp
  return {
    format: file.type || 'Unknown',
    tags: [{ label: 'File size', value: `${bytes.length} bytes`, group: 'File' }],
    gps: null,
    stripKind: 'reencode',
  }
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export function stripJpeg(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG.')
  const parts: Uint8Array[] = [bytes.subarray(0, 2)]
  let i = 2
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) {
      parts.push(bytes.subarray(i))
      break
    }
    const marker = bytes[i + 1]
    if (marker === 0xda) {
      parts.push(bytes.subarray(i))
      break
    }
    if (marker === 0xd9) {
      parts.push(bytes.subarray(i, i + 2))
      break
    }
    if (marker === 0x00 || marker === 0xff) {
      parts.push(bytes.subarray(i, i + 2))
      i += 2
      continue
    }
    const len = (bytes[i + 2] << 8) | bytes[i + 3]
    const skip = marker === 0xe1 || marker === 0xed || marker === 0xfe
    if (!skip) parts.push(bytes.subarray(i, i + 2 + len))
    i += 2 + len
  }
  return concatBytes(parts)
}

export function stripPng(bytes: Uint8Array): Uint8Array {
  const drop = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'])
  const chunks: Uint8Array[] = [bytes.subarray(0, 8)]
  const dv = viewOf(bytes)
  let i = 8
  while (i + 12 <= bytes.length) {
    const len = dv.getUint32(i)
    const type = ascii(bytes, i + 4, 4)
    const chunk = bytes.subarray(i, i + 12 + len)
    if (!drop.has(type)) chunks.push(chunk)
    i += 12 + len
  }
  return concatBytes(chunks)
}

export async function stripMetadata(file: Blob): Promise<{ blob: Blob; method: 'lossless' | 'reencode' }> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return { blob: new Blob([stripJpeg(bytes).slice().buffer as ArrayBuffer], { type: 'image/jpeg' }), method: 'lossless' }
  }
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  if (sig.every((b, i) => bytes[i] === b)) {
    return { blob: new Blob([stripPng(bytes).slice().buffer as ArrayBuffer], { type: 'image/png' }), method: 'lossless' }
  }
  const { compressImage } = await import('./image/compress')
  const mime = file.type === 'image/webp' ? 'image/webp' : file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
  const result = await compressImage(file, { mime })
  return { blob: result.blob, method: 'reencode' }
}

/** Convert GPS DMS arrays to decimal degrees. Exported for tests. */
export function gpsDecimal(lat: number[], latRef: string, lon: number[], lonRef: string): GpsFix | null {
  const la = dmsToDecimal(lat, latRef)
  const lo = dmsToDecimal(lon, lonRef)
  if (la == null || lo == null) return null
  return { lat: la, lon: lo }
}
