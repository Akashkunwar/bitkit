import JSZip from 'jszip'
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'

/** A canvas dot. `dottedText` returns one of these per sample on a letter outline. */
export type TraceOp = { op: 'dot'; x: number; y: number }

export type Glyph = { char: string; path: string }

const CELL = 8
const STEP = 10
const COLS = 5
const ROWS = 7
const ADVANCE = COLS * STEP + 14
const LINE = ROWS * STEP + 18
const PAD = 16

/** 5×7 stroke bitmaps, top row first, high bit on the left. */
const FONT: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b10000, 0b11110, 0b00001, 0b00001, 0b11110],
  '6': [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  '.': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b01100, 0b01100],
  ',': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b01000],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  '?': [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0b00000, 0b00100],
  '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  "'": [0b00100, 0b00100, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
}

/**
 * Dotted outline instructions for a tracing worksheet.
 * Letters and digits are sampled from a stroke bitmap; lowercase follows the capital.
 */
export function dottedText(text: string): TraceOp[] {
  const ops: TraceOp[] = []
  let x = PAD
  let y = PAD
  for (const ch of text) {
    if (ch === '\n') {
      x = PAD
      y += LINE
      continue
    }
    if (ch === ' ') {
      x += ADVANCE
      continue
    }
    const rows = FONT[ch.toUpperCase()] ?? FONT[ch]
    if (!rows) {
      x += ADVANCE
      continue
    }
    for (let row = 0; row < ROWS; row += 1) {
      const bits = rows[row] ?? 0
      for (let col = 0; col < COLS; col += 1) {
        if ((bits & (1 << (COLS - 1 - col))) === 0) continue
        ops.push({
          op: 'dot',
          x: x + col * STEP + CELL / 2,
          y: y + row * STEP + CELL / 2,
        })
      }
    }
    x += ADVANCE
  }
  return ops
}

export function traceSize(ops: TraceOp[], pad = PAD): { width: number; height: number } {
  if (!ops.length) return { width: 320, height: 140 }
  let maxX = 0
  let maxY = 0
  for (const op of ops) {
    if (op.x > maxX) maxX = op.x
    if (op.y > maxY) maxY = op.y
  }
  return { width: Math.ceil(maxX + pad), height: Math.ceil(maxY + pad) }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Greyscale plus seeded grain. Same seed and pixels always return the same buffer.
 * Noise is never zero, so a mid grey moves; values near 0 and 255 stay near the edge.
 */
export function scannedRgba(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  seed: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data)
  const w = Number.isFinite(width) ? Math.max(0, Math.floor(width)) : 0
  const h = Number.isFinite(height) ? Math.max(0, Math.floor(height)) : 0
  const pixels = Math.min(w * h, Math.floor(data.length / 4))
  const rand = mulberry32(seed)
  for (let i = 0; i < pixels; i += 1) {
    const o = i * 4
    const y = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
    let noise = Math.round((rand() - 0.5) * 36)
    if (noise === 0) noise = 1
    const v = Math.max(0, Math.min(255, Math.round(y + noise)))
    out[o] = v
    out[o + 1] = v
    out[o + 2] = v
    out[o + 3] = data[o + 3]
  }
  return out
}

/**
 * Shadow lift for a photographed page. Gamma below 1 raises dark pixels and leaves white alone.
 * This does not find page edges or rotate the image.
 */
export function liftShadows(data: Uint8Array | Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  const pixels = Math.floor(data.length / 4)
  for (let i = 0; i < pixels; i += 1) {
    const o = i * 4
    for (let c = 0; c < 3; c += 1) {
      const v = data[o + c] / 255
      out[o + c] = Math.round(255 * Math.pow(v, 0.55))
    }
    out[o + 3] = data[o + 3]
  }
  return out
}

/**
 * Saddle-stitch page order as 0-based source indexes.
 * The count is padded up to a multiple of 4; indexes past the last real page are blank sheets.
 * Eight pages come out as 8, 1, 2, 7, 6, 3, 4, 5 in reading numbers.
 */
export function bookletOrder(pageCount: number): number[] {
  if (!Number.isFinite(pageCount) || pageCount < 1) return []
  const count = Math.floor(pageCount)
  const n = count % 4 === 0 ? count : count + (4 - (count % 4))
  const order: number[] = []
  for (let i = 0; i < n / 2; i += 1) {
    if (i % 2 === 0) order.push(n - 1 - i, i)
    else order.push(i, n - 1 - i)
  }
  return order
}

export async function imposeBooklet(bytes: Uint8Array): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  if (src.isEncrypted) {
    throw new Error('This PDF is encrypted. pdf-lib cannot decrypt it, so the booklet was not built.')
  }
  const count = src.getPageCount()
  if (!count) throw new Error('That PDF has no pages.')
  const order = bookletOrder(count)
  const out = await PDFDocument.create()
  out.setCreator('BitKit')
  const size = src.getPage(0).getSize()
  for (const index of order) {
    if (index < 0 || index >= count) {
      out.addPage([size.width, size.height])
      continue
    }
    const [page] = await out.copyPages(src, [index])
    out.addPage(page)
  }
  return out.save()
}

/** Next page index, wrapping to the start. An empty comic stays on 0. */
export function nextPage(i: number, n: number): number {
  if (n <= 0) return 0
  const index = ((Math.trunc(i) % n) + n) % n
  return (index + 1) % n
}

export function prevPage(i: number, n: number): number {
  if (n <= 0) return 0
  const index = ((Math.trunc(i) % n) + n) % n
  return (index - 1 + n) % n
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif)$/i

export function isZipImageName(name: string): boolean {
  const base = name.split('/').pop() ?? name
  if (!base || base.startsWith('.') || name.includes('__MACOSX/')) return false
  return IMAGE_EXT.test(base)
}

function sortedImageNames(zip: JSZip): string[] {
  const names: string[] = []
  zip.forEach((path, entry) => {
    if (!entry.dir && isZipImageName(path)) names.push(path)
  })
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  return names
}

/** Image entry names inside a zip or CBZ, in reading order. */
export async function listZipImages(bytes: Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(bytes)
  return sortedImageNames(zip)
}

export async function readZipImages(bytes: Uint8Array): Promise<{ name: string; data: Uint8Array }[]> {
  const zip = await JSZip.loadAsync(bytes)
  const out: { name: string; data: Uint8Array }[] = []
  for (const name of sortedImageNames(zip)) {
    const file = zip.file(name)
    if (!file) continue
    out.push({ name, data: await file.async('uint8array') })
  }
  return out
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

/** One image per page. PNG and JPEG bytes only; the page is the image's pixel size in points. */
export async function imagesToPdf(images: Uint8Array[]): Promise<Uint8Array> {
  if (!images.length) throw new Error('Add at least one image.')
  const doc = await PDFDocument.create()
  doc.setCreator('BitKit')
  for (const bytes of images) {
    const image = isJpeg(bytes) ? await doc.embedJpg(bytes) : isPng(bytes) ? await doc.embedPng(bytes) : null
    if (!image) throw new Error('Only PNG and JPEG images can go on a page.')
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return doc.save()
}

function decodeQuotedPrintable(input: string): string {
  const stripped = input.replace(/=\r?\n/g, '')
  const bytes: number[] = []
  for (let i = 0; i < stripped.length; i += 1) {
    const hex = stripped.slice(i + 1, i + 3)
    if (stripped[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16))
      i += 2
    } else {
      const code = stripped.charCodeAt(i)
      bytes.push(code <= 255 ? code : 0x3f)
    }
  }
  return new TextDecoder('utf-8').decode(Uint8Array.from(bytes))
}

function decodeBase64(input: string): string {
  const clean = input.replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * Returns the text/html part of a minimal MHTML message.
 * Content-Location and other remote addresses are left as text and are not requested.
 */
export function parseMhtml(text: string): string {
  const source = text.replace(/^\uFEFF/, '')
  const boundaryMatch = /boundary\s*=\s*"([^"]+)"/i.exec(source) ?? /boundary\s*=\s*([^;\s]+)/i.exec(source)
  if (!boundaryMatch) {
    const html = /<html[\s\S]*<\/html>/i.exec(source)
    if (html) return html[0]
    throw new Error('No MIME boundary and no HTML document found.')
  }
  const marker = `--${boundaryMatch[1]}`
  for (const chunk of source.split(marker)) {
    const body = chunk.replace(/^\r?\n/, '')
    if (body.startsWith('--')) continue
    const splitAt = body.search(/\r?\n\r?\n/)
    if (splitAt < 0) continue
    const headers = body.slice(0, splitAt)
    if (!/content-type:\s*text\/html/i.test(headers)) continue
    let payload = body
      .slice(splitAt)
      .replace(/^\r?\n\r?\n/, '')
      .replace(/\s*$/, '')
    const encoding = /content-transfer-encoding:\s*([^\s;]+)/i.exec(headers)?.[1]?.toLowerCase() ?? ''
    if (encoding === 'base64') payload = decodeBase64(payload)
    else if (encoding === 'quoted-printable') payload = decodeQuotedPrintable(payload)
    return payload
  }
  throw new Error('The MHTML message has no text/html part.')
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function winAnsi(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code === 10 || code === 13 || code === 9) {
      out += ch
      continue
    }
    if ((code >= 32 && code <= 255) || code === 0x2013 || code === 0x2014 || code === 0x20ac) out += ch
    else out += '?'
  }
  return out
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter((word) => word.length > 0)
    if (!words.length) {
      lines.push('')
      continue
    }
    let current = ''
    const pushWord = (word: string) => {
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word
        return
      }
      let chunk = ''
      for (const ch of word) {
        const trial = chunk + ch
        if (chunk && font.widthOfTextAtSize(trial, size) > maxWidth) {
          lines.push(chunk)
          chunk = ch
        } else chunk = trial
      }
      current = chunk
    }
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next
      else {
        if (current) lines.push(current)
        pushWord(word)
      }
    }
    if (current) lines.push(current)
  }
  return lines.length ? lines : ['']
}

async function textToPdf(text: string, title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(title)
  doc.setCreator('BitKit')
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const size = 11
  const margin = 48
  const lineHeight = 15
  const pageWidth = 612
  const pageHeight = 792
  const lines = wrapLines(winAnsi(text), font, size, pageWidth - margin * 2)
  let page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin
  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0.12, 0.12, 0.12) })
    y -= lineHeight
  }
  return doc.save()
}

/** PDF of the extracted HTML as plain text. Remote URLs in the source are not opened. */
export async function mhtmlToPdf(text: string): Promise<Uint8Array> {
  const html = parseMhtml(text)
  const plain = htmlToPlainText(html) || 'The HTML part was empty.'
  return textToPdf(plain, 'Extracted HTML')
}

export function formatMeta(meta: { title?: string; author?: string }): string {
  const title = meta.title?.trim() || 'Untitled'
  const author = meta.author?.trim() || 'Unknown'
  return `${title} — ${author}`
}

export async function readPdfMeta(bytes: Uint8Array): Promise<{ title: string; author: string; encrypted: boolean }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    encrypted: doc.isEncrypted,
  }
}

export async function writePdfMeta(bytes: Uint8Array, meta: { title: string; author: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  if (doc.isEncrypted) {
    throw new Error('This PDF is encrypted. pdf-lib cannot decrypt it, so the metadata was not changed.')
  }
  doc.setTitle(meta.title)
  doc.setAuthor(meta.author)
  return doc.save()
}

/**
 * pdf-lib 1.17 SaveOptions has no userPassword, and PDFDocument has no encrypt method.
 * This stays false so the UI does not pretend a download is password-protected.
 */
export function pdfEncryptSupported(): boolean {
  return false
}

/** pdf-lib 1.17 LoadOptions has ignoreEncryption and no password. Passwords are never guessed. */
export function pdfUnlockSupported(): boolean {
  return false
}

function xmlEscape(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

/** An SVG font file. Paths are stored as given; this is not an outline tracer. */
export function svgFont(glyphs: Glyph[]): string {
  const body = glyphs
    .map((glyph) => {
      const char = xmlEscape(glyph.char)
      return `      <glyph unicode="${char}" glyph-name="${char}" horiz-adv-x="800" d="${xmlEscape(glyph.path)}" />`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <defs>
    <font id="BitKitHand" horiz-adv-x="800">
      <font-face font-family="BitKit Hand" units-per-em="1000" ascent="800" descent="-200" />
      <missing-glyph horiz-adv-x="500" />
${body}
    </font>
  </defs>
</svg>
`
}

/** Lines shaped like `A M10 10 L20 40`. Blank lines and `#` comments are skipped. */
export function parseGlyphLines(text: string): Glyph[] {
  const glyphs: Glyph[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = /^(\S)\s+(\S.*)$/.exec(trimmed)
    if (!match) continue
    glyphs.push({ char: match[1], path: match[2].trim() })
  }
  return glyphs
}
