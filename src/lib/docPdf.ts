import { jsPDF } from 'jspdf'
import type { DocBlock, Run } from './docBlocks'

export type PdfOptions = {
  pageSize: 'a4' | 'letter'
  marginMm: number
  header?: string
  footer?: string
  /** Printed top-left on page one when no header is given. */
  title?: string
}

type Style = 'normal' | 'bold' | 'italic' | 'bolditalic'
type Seg = { text: string; font: 'helvetica' | 'courier'; style: Style; width: number }

function styleOf(run: Run, base: Style): Style {
  const bold = run.bold || base === 'bold' || base === 'bolditalic'
  const italic = run.italic || base === 'italic' || base === 'bolditalic'
  if (bold && italic) return 'bolditalic'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

/**
 * Wraps a run of styled text into lines of positioned segments.
 *
 * jsPDF's own splitTextToSize only knows one font at a time, so mixed bold and
 * italic text has to be measured token by token. Tokens wider than the column
 * (a long URL, say) are hard-split rather than allowed to run off the page.
 */
function layoutRuns(
  doc: jsPDF,
  runs: Run[],
  maxWidth: number,
  size: number,
  base: Style,
): Seg[][] {
  doc.setFontSize(size)
  const lines: Seg[][] = []
  let line: Seg[] = []
  let width = 0

  const push = () => {
    // Trailing spaces would otherwise shift the next line's start.
    while (line.length && !line[line.length - 1].text.trim()) line.pop()
    lines.push(line)
    line = []
    width = 0
  }

  for (const run of runs) {
    const font = run.mono ? 'courier' : 'helvetica'
    const style = styleOf(run, base)
    doc.setFont(font, style)
    for (const raw of run.text.split(/(\s+)/)) {
      if (!raw) continue
      const token = raw.includes('\n') ? raw.replace(/\s+/g, ' ') : raw
      let w = doc.getTextWidth(token)
      if (w > maxWidth && token.trim()) {
        // Hard-split an unbreakable token so it cannot escape the column.
        for (const piece of doc.splitTextToSize(token, maxWidth) as string[]) {
          const pw = doc.getTextWidth(piece)
          if (width + pw > maxWidth && line.length) push()
          line.push({ text: piece, font, style, width: pw })
          width += pw
        }
        continue
      }
      if (width + w > maxWidth && line.length) {
        if (!token.trim()) continue
        push()
        w = doc.getTextWidth(token)
      }
      if (!line.length && !token.trim()) continue
      line.push({ text: token, font, style, width: w })
      width += w
    }
  }
  if (line.length) push()
  return lines.length ? lines : [[]]
}

function cellText(doc: jsPDF, text: string, width: number): string[] {
  return doc.splitTextToSize(text || ' ', width) as string[]
}

/** Column widths proportional to content, clamped so no column collapses. */
function columnWidths(doc: jsPDF, rows: string[][], maxWidth: number): number[] {
  const cols = Math.max(...rows.map((row) => row.length))
  const natural = new Array(cols).fill(0) as number[]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const row of rows) {
    for (let c = 0; c < cols; c += 1) {
      natural[c] = Math.max(natural[c], doc.getTextWidth(row[c] ?? '') + 4)
    }
  }
  const total = natural.reduce((a, b) => a + b, 0)
  if (total <= maxWidth) {
    // Spread the slack so the table fills the text column rather than hugging left.
    const extra = (maxWidth - total) / cols
    return natural.map((w) => w + extra)
  }
  const min = Math.min(18, maxWidth / cols)
  const scaled = natural.map((w) => Math.max(min, (w / total) * maxWidth))
  const over = scaled.reduce((a, b) => a + b, 0) / maxWidth
  return scaled.map((w) => w / over)
}

export function blocksToPdf(blocks: DocBlock[], opts: PdfOptions): Blob {
  const doc = new jsPDF({ unit: 'mm', format: opts.pageSize === 'letter' ? 'letter' : 'a4', compress: true })
  const margin = Math.max(6, opts.marginMm)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - margin * 2
  const bottom = pageHeight - margin - 6
  const heading = opts.header || opts.title || ''

  let y = margin
  let pageNum = 1

  const paintChrome = () => {
    if (heading) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(90)
      doc.text(heading.slice(0, 120), margin, margin - 3)
      doc.setTextColor(0)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    const label = opts.footer ? `${opts.footer}  ·  ${pageNum}` : String(pageNum)
    doc.text(label, pageWidth / 2, pageHeight - margin + 4, { align: 'center' })
    doc.setTextColor(0)
  }

  const newPage = () => {
    paintChrome()
    doc.addPage()
    pageNum += 1
    y = margin + (heading ? 4 : 0)
  }

  const ensure = (need: number) => {
    if (y + need <= bottom) return
    newPage()
  }

  y = margin + (heading ? 4 : 0)

  const drawLines = (lines: Seg[][], leading: number, indent = 0, firstPrefix = '') => {
    lines.forEach((line, i) => {
      ensure(leading)
      let x = margin + indent
      if (i === 0 && firstPrefix) {
        doc.setFont('helvetica', 'normal')
        doc.text(firstPrefix, margin + Math.max(0, indent - 5), y)
      }
      for (const seg of line) {
        doc.setFont(seg.font, seg.style)
        doc.text(seg.text, x, y)
        x += seg.width
      }
      y += leading
    })
  }

  const drawTable = (rows: string[][], header: boolean) => {
    if (!rows.length) return
    const widths = columnWidths(doc, rows, maxWidth)
    const pad = 1.6
    const leading = 4.4

    const drawRow = (row: string[], bold: boolean) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      const cells = widths.map((w, c) => cellText(doc, row[c] ?? '', w - pad * 2))
      const height = Math.max(...cells.map((lines) => lines.length)) * leading + pad * 2
      ensure(height)
      const top = y - leading + 1
      doc.setDrawColor(200)
      doc.setLineWidth(0.15)
      if (bold) {
        doc.setFillColor(243, 245, 245)
        doc.rect(margin, top, maxWidth, height, 'F')
      }
      let x = margin
      cells.forEach((lines, c) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        lines.forEach((line, i) => doc.text(line, x + pad, y + i * leading))
        x += widths[c]
      })
      doc.rect(margin, top, maxWidth, height)
      let rule = margin
      for (let c = 0; c < widths.length - 1; c += 1) {
        rule += widths[c]
        doc.line(rule, top, rule, top + height)
      }
      y += height
    }

    y += 2
    rows.forEach((row, i) => drawRow(row, header && i === 0))
    y += 3
  }

  for (const block of blocks) {
    if (block.kind === 'break') {
      newPage()
      continue
    }
    if (block.kind === 'h') {
      const size = block.level === 1 ? 17 : block.level === 2 ? 14 : block.level === 3 ? 12 : 11
      y += block.level === 1 ? 4 : 3
      ensure(size * 0.6)
      drawLines(layoutRuns(doc, block.runs, maxWidth, size, 'bold'), size * 0.52)
      y += 1.5
      continue
    }
    if (block.kind === 'pre') {
      y += 2
      const lines = layoutRuns(doc, [{ text: block.text, mono: true }], maxWidth, 9, 'normal')
      drawLines(lines, 4.4)
      y += 2
      continue
    }
    if (block.kind === 'li') {
      const indent = 5 + block.depth * 5
      drawLines(layoutRuns(doc, block.runs, maxWidth - indent, 11, 'normal'), 5.6, indent, block.marker)
      y += 0.8
      continue
    }
    if (block.kind === 'table') {
      drawTable(block.rows, block.header)
      continue
    }
    drawLines(layoutRuns(doc, block.runs, maxWidth, 11, 'normal'), 5.6)
    y += 2.2
  }

  paintChrome()
  return doc.output('blob')
}

/**
 * jsPDF's built-in faces are Latin-1 only. Anything outside that range would
 * silently come out as boxes, so the tools warn instead of shipping a broken
 * file — the browser's own Print → Save as PDF handles those scripts properly.
 */
export function nonLatinWarning(text: string): string | null {
  const bad = [...text].filter((ch) => ch.codePointAt(0)! > 0x2122)
  if (bad.length < 3) return null
  const sample = [...new Set(bad)].slice(0, 6).join(' ')
  return `This document uses characters the built-in PDF fonts cannot draw (${sample}). Use “Print / Save as PDF” instead — the browser embeds its own fonts.`
}
