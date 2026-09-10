/**
 * One entry point from "a file the user dropped" to the shared block model.
 *
 * Everything here runs on the file's bytes in this tab. There is no server
 * round-trip, which is also why the fidelity ceiling is what it is: no Word
 * layout engine, no embedded images, no fonts.
 */
import type { DocBlock } from './docBlocks'
import { readDocx, readPptxOutline } from './docx'
import { blocksFromHtml } from './pdf'
import { renderMarkdown, sanitizeHtml } from './markdown'
import { detectDelimiter, tableFromCsv, type Table } from './table'
import { readXlsxWorkbook } from './xlsx'

export type SourceKind = 'docx' | 'pptx' | 'xlsx' | 'csv' | 'markdown' | 'html' | 'rtf' | 'text'

export const OFFICE_ACCEPT =
  '.docx,.pptx,.xlsx,.csv,.tsv,.md,.markdown,.html,.htm,.rtf,.txt,text/plain,text/markdown,text/html,text/csv'

const BY_EXTENSION: Record<string, SourceKind> = {
  docx: 'docx',
  pptx: 'pptx',
  xlsx: 'xlsx',
  csv: 'csv',
  tsv: 'csv',
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  rtf: 'rtf',
  txt: 'text',
  log: 'text',
}

export const SOURCE_LABEL: Record<SourceKind, string> = {
  docx: 'Word document',
  pptx: 'PowerPoint deck',
  xlsx: 'Excel workbook',
  csv: 'Delimited text',
  markdown: 'Markdown',
  html: 'HTML',
  rtf: 'Rich text',
  text: 'Plain text',
}

export function detectSource(file: File): SourceKind | null {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  const known = BY_EXTENSION[ext]
  if (known) return known
  if (file.type === 'text/html') return 'html'
  if (file.type === 'text/markdown') return 'markdown'
  if (file.type === 'text/csv') return 'csv'
  if (file.type.startsWith('text/')) return 'text'
  return null
}

function tableBlocks(table: Table): DocBlock[] {
  if (!table.headers.length && !table.rows.length) return []
  return [{ kind: 'table', rows: [table.headers, ...table.rows], header: table.headers.length > 0 }]
}

function textBlocks(text: string): DocBlock[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => ({ kind: 'p', runs: [{ text: chunk.replace(/\n/g, ' ') }] }) as DocBlock)
}

/**
 * Enough RTF to recover the words: drop the header groups, unescape the common
 * escapes, and turn \par into a paragraph break. Formatting is not recovered.
 */
export function rtfToText(source: string): string {
  let text = source
    .replace(/\\'([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u(-?\d+)\s?\??/g, (_, code: string) => String.fromCodePoint(Number(code) & 0xffff))
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\(par|line)\b/g, '\n')
    .replace(/\\(tab)\b/g, '\t')
    .replace(/\\[a-z]+-?\d*\s?/gi, '')
    .replace(/[{}]/g, '')
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  if (!text) throw new Error('No text found in that .rtf file.')
  return text
}

export async function fileToBlocks(file: File): Promise<{ kind: SourceKind; blocks: DocBlock[] }> {
  const kind = detectSource(file)
  if (!kind) {
    throw new Error(`BitKit cannot read “${file.name}”. Supported: .docx, .pptx, .xlsx, .csv, .md, .html, .rtf, .txt.`)
  }

  if (kind === 'docx') return { kind, blocks: await readDocx(new Uint8Array(await file.arrayBuffer())) }
  if (kind === 'pptx') return { kind, blocks: await readPptxOutline(new Uint8Array(await file.arrayBuffer())) }

  if (kind === 'xlsx') {
    const sheets = await readXlsxWorkbook(new Uint8Array(await file.arrayBuffer()))
    const blocks: DocBlock[] = []
    sheets.forEach((sheet, index) => {
      if (index > 0) blocks.push({ kind: 'break' })
      blocks.push({ kind: 'h', level: 2, runs: [{ text: sheet.name }] })
      const rows = sheet.rows.filter((row) => row.some((cell) => cell.trim()))
      if (rows.length) blocks.push({ kind: 'table', rows, header: true })
      else blocks.push({ kind: 'p', runs: [{ text: 'Empty sheet.', italic: true }] })
    })
    return { kind, blocks }
  }

  const text = await file.text()
  if (kind === 'csv') {
    return { kind, blocks: tableBlocks(tableFromCsv(text, detectDelimiter(text))) }
  }
  if (kind === 'markdown') return { kind, blocks: blocksFromHtml(renderMarkdown(text)) }
  if (kind === 'html') return { kind, blocks: blocksFromHtml(sanitizeHtml(text)) }
  if (kind === 'rtf') return { kind, blocks: textBlocks(rtfToText(text)) }
  return { kind, blocks: textBlocks(text) }
}
