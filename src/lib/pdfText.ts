/**
 * PDF text layer → the shared block model.
 *
 * A PDF stores glyphs at coordinates, not paragraphs, so structure has to be
 * inferred: lines from y positions, paragraphs from the gaps between them,
 * headings from type size, lists from the leading character. It is a good
 * reconstruction of the words, never a reconstruction of the layout — and a
 * scanned PDF has no text layer at all, which `hasTextLayer` reports so the
 * tool can point at OCR instead of handing back an empty file.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { DocBlock } from './docBlocks'

type TextItemLike = {
  str: string
  transform: number[]
  width: number
  height: number
}

type Cell = { x: number; text: string }
type Line = { text: string; y: number; size: number; x: number; width: number; cells: Cell[] }

export type ExtractOptions = {
  /** Promote larger type to headings instead of leaving everything as body text. */
  headings?: boolean
  /** Emit a page break block between pages. */
  pageBreaks?: boolean
  /** Drop lines that repeat at the same spot on most pages. */
  dropRunningHeads?: boolean
}

const BULLET = /^\s*([•·▪◦‣*–—-]|\(?\d{1,3}[.)]|[a-z][.)])\s+/i

function median(values: number[]): number {
  return percentile(values, 0.5)
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

function linesOfPage(items: TextItemLike[]): Line[] {
  const glyphs = items
    .filter((item) => typeof item.str === 'string' && item.str.length)
    .map((item) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0,
      size: Math.abs(item.transform[3]) || item.height || 10,
    }))
  if (!glyphs.length) return []

  glyphs.sort((a, b) => b.y - a.y || a.x - b.x)

  const lines: Line[] = []
  let current: typeof glyphs = []
  const flush = () => {
    if (!current.length) return
    current.sort((a, b) => a.x - b.x)
    let text = ''
    let prevEnd = current[0].x
    for (const glyph of current) {
      // Two runs on the same line with a real gap between them need a space.
      const gap = glyph.x - prevEnd
      if (text && gap > glyph.size * 0.18 && !/\s$/.test(text) && !/^\s/.test(glyph.text)) text += ' '
      text += glyph.text
      prevEnd = glyph.x + glyph.width
    }
    const size = median(current.map((g) => g.size))
    // A gap far wider than a space is a column boundary, not a word boundary.
    // Recording them lets a table be rebuilt later from the x alignment.
    const cells: Cell[] = []
    let cellEnd = current[0].x
    for (const glyph of current) {
      // pdf.js represents a column gap as a run of spaces that spans it, so
      // measuring from the last real glyph is the only way to see the gap.
      if (!glyph.text.trim()) continue
      if (!cells.length || glyph.x - cellEnd > size * 0.9) cells.push({ x: glyph.x, text: glyph.text })
      else {
        const cell = cells[cells.length - 1]
        cell.text += (glyph.x - cellEnd > size * 0.18 && !/\s$/.test(cell.text) ? ' ' : '') + glyph.text
      }
      cellEnd = glyph.x + glyph.width
    }
    lines.push({
      text: text.replace(/\s+/g, ' ').trim(),
      y: current[0].y,
      size,
      x: Math.min(...current.map((g) => g.x)),
      width: prevEnd - Math.min(...current.map((g) => g.x)),
      cells: cells.map((cell) => ({ x: cell.x, text: cell.text.replace(/\s+/g, ' ').trim() })).filter((c) => c.text),
    })
    current = []
  }

  for (const glyph of glyphs) {
    if (current.length && Math.abs(glyph.y - current[0].y) > Math.max(2, glyph.size * 0.5)) flush()
    current.push(glyph)
  }
  flush()
  return lines.filter((line) => line.text.length)
}

/** Lines repeated at the same height on most pages are running heads, not content. */
function runningHeads(pages: Line[][]): Set<string> {
  const out = new Set<string>()
  if (pages.length < 4) return out
  const counts = new Map<string, number>()
  for (const lines of pages) {
    const seen = new Set<string>()
    for (const line of lines) {
      const key = `${Math.round(line.y / 6)}:${line.text.replace(/\d+/g, '#')}`
      if (seen.has(key)) continue
      seen.add(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.6))
  for (const [key, count] of counts) {
    if (count >= threshold) out.add(key)
  }
  return out
}

const NUMERIC = /^[-+(]?[\d,.]+%?\)?$/

/**
 * Rebuilds a table from a run of lines whose cells line up in columns.
 *
 * Alignment across lines is what separates a real table from justified prose
 * that merely happens to have wide spaces: stretched word gaps never land on
 * the same x twice, so a run that fails to cluster is left as paragraph text.
 */
function tableFromLines(lines: Line[], bodySize: number): DocBlock | null {
  if (lines.length < 2) return null
  const tolerance = bodySize * 1.5
  const xs = lines.flatMap((line) => line.cells.map((cell) => cell.x)).sort((a, b) => a - b)
  const columns: number[] = []
  for (const x of xs) {
    if (!columns.length || x - columns[columns.length - 1] > tolerance) columns.push(x)
  }
  if (columns.length < 2 || columns.length > 12) return null

  const rows: string[][] = []
  for (const line of lines) {
    const row = new Array<string>(columns.length).fill('')
    for (const cell of line.cells) {
      let index = 0
      for (let c = 1; c < columns.length; c += 1) {
        if (Math.abs(cell.x - columns[c]) < Math.abs(cell.x - columns[index])) index = c
      }
      row[index] = row[index] ? `${row[index]} ${cell.text}` : cell.text
    }
    if (row.some((value) => value)) rows.push(row)
  }
  if (rows.length < 2) return null

  // A first row of labels above rows that carry numbers is a header row.
  const header =
    rows[0].every((cell) => !NUMERIC.test(cell)) &&
    rows.slice(1).some((row) => row.some((cell) => NUMERIC.test(cell)))
  return { kind: 'table', rows, header }
}

function blocksOfPage(lines: Line[], bodySize: number, opts: ExtractOptions): DocBlock[] {
  const out: DocBlock[] = []
  const isBody = (line: Line) => Math.abs(line.size - bodySize) <= bodySize * 0.1

  // Leading inside a paragraph is the tightest gap the page uses, so take a low
  // percentile of the body-to-body gaps: the median would sit halfway between
  // line leading and paragraph spacing on a page with few paragraphs, and the
  // space above a heading would skew it further.
  const gaps: number[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const gap = lines[i - 1].y - lines[i].y
    if (gap > 0 && isBody(lines[i - 1]) && isBody(lines[i])) gaps.push(gap)
  }
  const normalGap = Math.max(percentile(gaps, 0.25) || bodySize * 1.2, bodySize)
  const body = lines.filter(isBody)
  const maxWidth = Math.max(...body.map((line) => line.width), 1)
  const leftEdge = Math.min(...body.map((line) => line.x), Infinity)

  let buffer: string[] = []
  const flush = () => {
    if (!buffer.length) return
    const text = buffer.join(' ').replace(/\s+/g, ' ').trim()
    buffer = []
    if (!text) return
    const bullet = BULLET.exec(text)
    if (bullet) {
      const marker = bullet[1].replace(/^[•·▪◦‣*–—-]$/, '•')
      out.push({ kind: 'li', runs: [{ text: text.slice(bullet[0].length) }], depth: 0, marker })
      return
    }
    out.push({ kind: 'p', runs: [{ text }] })
  }

  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const prev = lines[index - 1]

    // A run of column-aligned lines becomes one table instead of flowing
    // together into an unreadable paragraph.
    // Tables are usually set smaller than the body, so the test is "not a
    // heading" rather than "matches the body size".
    const tabular = (candidate: Line) => candidate.cells.length >= 2 && candidate.size <= bodySize * 1.18
    if (tabular(line)) {
      let end = index
      while (end + 1 < lines.length && tabular(lines[end + 1])) end += 1
      const table = tableFromLines(lines.slice(index, end + 1), bodySize)
      if (table) {
        flush()
        out.push(table)
        index = end + 1
        continue
      }
    }

    const gap = prev ? prev.y - line.y : 0
    const big = opts.headings !== false && line.size > bodySize * 1.18
    const startsList = BULLET.test(line.text)
    // A wide gap, a size change, or a new bullet all end the previous paragraph.
    const breaks =
      !prev ||
      gap > normalGap * 1.55 ||
      startsList ||
      big ||
      prev.size > bodySize * 1.18 ||
      // An indented first line is the other common paragraph marker.
      (Number.isFinite(leftEdge) && isBody(line) && line.x > leftEdge + bodySize * 0.6) ||
      // A short line that ends a sentence is the end of its paragraph.
      (prev.width < maxWidth * 0.8 && /[.!?:;"\u201D\u2019)]$/.test(prev.text))

    if (breaks) flush()

    if (big) {
      const ratio = line.size / bodySize
      const level = ratio > 1.7 ? 1 : ratio > 1.4 ? 2 : ratio > 1.25 ? 3 : 4
      out.push({ kind: 'h', level: level as 1 | 2 | 3 | 4, runs: [{ text: line.text }] })
      index += 1
      continue
    }
    buffer.push(line.text)
    index += 1
  }
  flush()
  return out
}

export type PdfExtract = {
  blocks: DocBlock[]
  /** Plain text per page, for the preview and the .txt export. */
  pages: string[]
  hasTextLayer: boolean
}

export async function extractPdfText(
  doc: PDFDocumentProxy,
  opts: ExtractOptions = {},
  onProgress?: (page: number, total: number) => void,
): Promise<PdfExtract> {
  const total = doc.numPages
  const perPage: Line[][] = []
  for (let n = 1; n <= total; n += 1) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    perPage.push(linesOfPage(content.items as unknown as TextItemLike[]))
    page.cleanup()
    onProgress?.(n, total)
  }

  const heads = opts.dropRunningHeads === false ? new Set<string>() : runningHeads(perPage)
  const cleaned = perPage.map((lines) =>
    lines.filter((line) => !heads.has(`${Math.round(line.y / 6)}:${line.text.replace(/\d+/g, '#')}`)),
  )

  const allSizes = cleaned.flat().map((line) => line.size)
  const bodySize = median(allSizes) || 10

  const blocks: DocBlock[] = []
  cleaned.forEach((lines, index) => {
    if (index > 0 && opts.pageBreaks) blocks.push({ kind: 'break' })
    blocks.push(...blocksOfPage(lines, bodySize, opts))
  })

  const pages = cleaned.map((lines) => lines.map((line) => line.text).join('\n'))
  return {
    blocks,
    pages,
    hasTextLayer: pages.some((page) => page.trim().length > 0),
  }
}

export const NO_TEXT_LAYER =
  'This PDF has no text layer — it is a scan or an image export. Run it through OCR first, then bring the text back here.'
