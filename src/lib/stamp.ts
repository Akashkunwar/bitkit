/**
 * Watermarks, page numbers, and running heads, written straight into the PDF.
 *
 * Everything here draws on top of the existing page content with pdf-lib, so
 * the original text stays selectable and nothing is re-rendered or re-encoded.
 * A watermark added this way is a visible mark, not a security control — it can
 * be removed by anyone with a PDF editor, and the UI says so.
 */
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { loadPdf } from './pdfLoad'
import { parsePageRange } from './pdfPages'
import { parseHex } from './contrast'

export type Placement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top centre' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom centre' },
  { value: 'bottom-right', label: 'Bottom right' },
]

export type NumberFormat = 'n' | 'n-of-m' | 'page-n' | 'page-n-of-m' | 'bates'

export const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
  { value: 'n', label: '1' },
  { value: 'n-of-m', label: '1 / 10' },
  { value: 'page-n', label: 'Page 1' },
  { value: 'page-n-of-m', label: 'Page 1 of 10' },
  { value: 'bates', label: 'Bates (ABC000001)' },
]

export type WatermarkSpec = {
  text: string
  size: number
  /** Degrees, counter-clockwise. 45 is the classic diagonal. */
  angle: number
  /** 0–1. */
  opacity: number
  color: string
  /** Repeat across the page instead of a single centred mark. */
  tile: boolean
}

export type NumberSpec = {
  format: NumberFormat
  placement: Placement
  startAt: number
  /** Leave a cover page unnumbered. */
  skipFirst: boolean
  size: number
  /** Bates prefix, e.g. "ACME". Ignored by the other formats. */
  prefix: string
  /** Bates zero padding. */
  digits: number
}

export type StampOptions = {
  watermark?: WatermarkSpec | null
  numbers?: NumberSpec | null
  header?: string
  footer?: string
  /** Points from the page edge for numbers, header, and footer. */
  margin: number
  /** 1-based page range like `2-5,8`. Empty means every page. */
  range?: string
  /** Substituted into {file} in headers and footers. */
  filename?: string
}

export const DEFAULT_WATERMARK: WatermarkSpec = {
  text: 'DRAFT',
  size: 64,
  angle: 45,
  opacity: 0.18,
  color: '#8a8f8f',
  tile: false,
}

export const DEFAULT_NUMBERS: NumberSpec = {
  format: 'page-n-of-m',
  placement: 'bottom-center',
  startAt: 1,
  skipFirst: false,
  size: 10,
  prefix: 'ABC',
  digits: 6,
}

/** The standard PDF fonts are Latin-1 only; anything else would throw mid-write. */
const WIN_ANSI = /^[\u0020-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\u2122]*$/

export function unsupportedGlyphs(text: string): string[] {
  return [...new Set([...text].filter((ch) => !WIN_ANSI.test(ch)))]
}

function assertWritable(text: string, what: string): void {
  const bad = unsupportedGlyphs(text)
  if (!bad.length) return
  throw new Error(
    `The ${what} uses characters the built-in PDF fonts cannot draw (${bad.slice(0, 6).join(' ')}). Stick to Latin text here.`,
  )
}

export function numberLabel(spec: NumberSpec, n: number, total: number): string {
  if (spec.format === 'bates') return `${spec.prefix}${String(n).padStart(Math.max(1, spec.digits), '0')}`
  if (spec.format === 'n') return String(n)
  if (spec.format === 'n-of-m') return `${n} / ${total}`
  if (spec.format === 'page-n') return `Page ${n}`
  return `Page ${n} of ${total}`
}

export function expandTokens(
  template: string,
  ctx: { n: number; total: number; filename: string },
): string {
  return template
    .replaceAll('{n}', String(ctx.n))
    .replaceAll('{total}', String(ctx.total))
    .replaceAll('{file}', ctx.filename)
    .replaceAll('{date}', new Date().toLocaleDateString())
}

function anchor(
  placement: Placement,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  size: number,
  margin: number,
): { x: number; y: number } {
  const [vertical, horizontal] = placement.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right']
  const x =
    horizontal === 'left'
      ? margin
      : horizontal === 'right'
        ? pageWidth - margin - textWidth
        : (pageWidth - textWidth) / 2
  const y = vertical === 'top' ? pageHeight - margin - size * 0.8 : margin
  return { x, y }
}

/**
 * pdf-lib rotates text about its own origin, so a centred diagonal mark needs
 * the origin shifted back by half the rotated bounding box.
 */
function rotatedOrigin(
  cx: number,
  cy: number,
  width: number,
  height: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: cx - (width / 2) * cos + (height / 2) * sin,
    y: cy - (width / 2) * sin - (height / 2) * cos,
  }
}

export async function stampPdf(bytes: Uint8Array, opts: StampOptions): Promise<Uint8Array> {
  const { doc } = await loadPdf(bytes)
  const pages = doc.getPages()
  const total = pages.length
  if (!total) throw new Error('That PDF has no pages.')

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const filename = opts.filename ?? 'document'

  const selected = opts.range?.trim()
    ? new Set(parsePageRange(opts.range.trim(), total))
    : new Set(pages.map((_, i) => i))

  const mark = opts.watermark && opts.watermark.text.trim() ? opts.watermark : null
  if (mark) assertWritable(mark.text, 'watermark')
  if (opts.header) assertWritable(opts.header, 'header')
  if (opts.footer) assertWritable(opts.footer, 'footer')
  if (opts.numbers?.format === 'bates') assertWritable(opts.numbers.prefix, 'Bates prefix')

  const markColor = mark ? (parseHex(mark.color) ?? { r: 138, g: 143, b: 143 }) : null
  const ink = markColor ? rgb(markColor.r / 255, markColor.g / 255, markColor.b / 255) : rgb(0.5, 0.5, 0.5)

  pages.forEach((page, index) => {
    if (!selected.has(index)) return
    const { width, height } = page.getSize()
    const margin = Math.max(8, opts.margin)

    if (mark) {
      const size = Math.max(6, mark.size)
      const textWidth = bold.widthOfTextAtSize(mark.text, size)
      const textHeight = size * 0.72
      const draw = (cx: number, cy: number) => {
        const origin = rotatedOrigin(cx, cy, textWidth, textHeight, mark.angle)
        page.drawText(mark.text, {
          x: origin.x,
          y: origin.y,
          size,
          font: bold,
          color: ink,
          opacity: Math.min(1, Math.max(0.02, mark.opacity)),
          rotate: degrees(mark.angle),
        })
      }
      if (mark.tile) {
        // Spacing scales with the mark so a big watermark does not overlap itself.
        const stepX = Math.max(textWidth * 1.25, 80)
        const stepY = Math.max(size * 3.2, 80)
        for (let y = stepY / 2; y < height + stepY; y += stepY) {
          for (let x = stepX / 2; x < width + stepX; x += stepX) draw(x, y)
        }
      } else {
        draw(width / 2, height / 2)
      }
    }

    const ctx = { n: index + 1, total, filename }
    const chrome = rgb(0.35, 0.38, 0.38)

    if (opts.header?.trim()) {
      const text = expandTokens(opts.header, ctx)
      page.drawText(text, { x: margin, y: height - margin - 8, size: 9, font, color: chrome })
    }
    if (opts.footer?.trim()) {
      const text = expandTokens(opts.footer, ctx)
      page.drawText(text, { x: margin, y: margin, size: 9, font, color: chrome })
    }

    const numbers = opts.numbers
    if (numbers && !(numbers.skipFirst && index === 0)) {
      const n = numbers.startAt + index - (numbers.skipFirst ? 1 : 0)
      const label = numberLabel(numbers, n, total - (numbers.skipFirst ? 1 : 0) + numbers.startAt - 1)
      const size = Math.max(6, numbers.size)
      const textWidth = font.widthOfTextAtSize(label, size)
      const spot = anchor(numbers.placement, width, height, textWidth, size, margin)
      page.drawText(label, { x: spot.x, y: spot.y, size, font, color: rgb(0.2, 0.22, 0.22) })
    }
  })

  return doc.save()
}

/** Rotate selected pages by a quarter turn, keeping everything else intact. */
export async function rotatePages(bytes: Uint8Array, range: string, turns: number): Promise<Uint8Array> {
  const { doc } = await loadPdf(bytes)
  const pages = doc.getPages()
  const selected = range.trim() ? parsePageRange(range.trim(), pages.length) : pages.map((_, i) => i)
  for (const index of selected) {
    const page = pages[index]
    const current = page.getRotation().angle
    page.setRotation(degrees((((current + turns * 90) % 360) + 360) % 360))
  }
  return doc.save()
}

/** Drop pages by 1-based range; the rest keep their order. */
export async function deletePages(bytes: Uint8Array, range: string): Promise<Uint8Array> {
  const { doc: src } = await loadPdf(bytes)
  const count = src.getPageCount()
  const drop = new Set(parsePageRange(range, count))
  const keep = src.getPageIndices().filter((i) => !drop.has(i))
  if (!keep.length) throw new Error('That range would remove every page.')
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, keep)
  for (const page of copied) out.addPage(page)
  return out.save()
}
