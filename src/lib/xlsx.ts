import { unzip, type ZipFile } from './zipRead'
import { zipStore, type ZipEntry } from './zip'

/**
 * XLSX is a ZIP of XML parts. Writing uses STORE (no compression), which is
 * valid and lets us reuse the existing zip writer; reading needs raw inflate,
 * which every current browser provides natively via DecompressionStream.
 */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`

function workbookXml(name: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(name).slice(0, 31) || 'Sheet1'}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
}

/** XML 1.0 forbids most control characters outright, so they are dropped. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replace(FORBIDDEN, '')
}

/** 0-based column index to spreadsheet letters: 0 -> A, 26 -> AA. */
export function columnName(index: number): string {
  let n = index
  let out = ''
  for (;;) {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
    if (n < 0) break
  }
  return out
}

/** Column letters back to a 0-based index. */
export function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A'
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

const NUMERIC = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

function looksLikePlainNumber(value: string): boolean {
  const t = value.trim()
  if (!NUMERIC.test(t)) return false
  // Keep leading zeros as text so IDs like 01234 survive a round-trip.
  if (/^0\d/.test(t)) return false
  return true
}

function cellXml(ref: string, value: string): string {
  if (value === '') return ''
  if (looksLikePlainNumber(value)) return `<c r="${ref}"><v>${value.trim()}</v></c>`
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

export function sheetXml(rows: string[][]): string {
  const body = rows
    .map((cells, r) => {
      const inner = cells.map((cell, c) => cellXml(`${columnName(c)}${r + 1}`, cell ?? '')).join('')
      return `<row r="${r + 1}">${inner}</row>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
}

export function buildXlsx(rows: string[][], sheetName = 'Sheet1'): Uint8Array {
  const enc = new TextEncoder()
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: enc.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: enc.encode(workbookXml(sheetName)) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(WORKBOOK_RELS) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml(rows)) },
  ]
  return zipStore(entries)
}

// --- reading ---

function unescapeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replaceAll('&amp;', '&')
}

function textOf(xml: string, tag: string): string[] {
  const out: string[] = []
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>|<${tag}(?:\\s[^>]*)?/>`, 'g')
  for (const m of xml.matchAll(re)) out.push(m[1] ?? '')
  return out
}

export type XlsxSheet = { name: string; rows: string[][] }

function sheetPathFromRel(target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  if (target.startsWith('xl/')) return target
  return `xl/${target.replace(/^\.\//, '')}`
}

function parseWorkbookSheets(files: ZipFile[]): { name: string; path: string }[] {
  const decoder = new TextDecoder()
  const workbook = files.find((f) => f.name === 'xl/workbook.xml')
  const rels = files.find((f) => f.name === 'xl/_rels/workbook.xml.rels')
  if (!workbook) return []
  const relMap = new Map<string, string>()
  if (rels) {
    const xml = decoder.decode(rels.data)
    for (const m of xml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="([^"]+)"/g)) {
      const id = m[1] || m[4]
      const target = m[2] || m[3]
      if (id && target) relMap.set(id, sheetPathFromRel(target))
    }
  }
  const book = decoder.decode(workbook.data)
  const sheets: { name: string; path: string }[] = []
  for (const m of book.matchAll(/<sheet\b([^>]+)\/>/g)) {
    const attrs = m[1]
    const name = attrs.match(/name="([^"]+)"/)?.[1] ?? `Sheet${sheets.length + 1}`
    const rid = attrs.match(/r:id="([^"]+)"/)?.[1]
    const path = (rid && relMap.get(rid)) || `xl/worksheets/sheet${sheets.length + 1}.xml`
    sheets.push({ name: unescapeXml(name), path })
  }
  return sheets
}

function rowsFromSheetXml(xml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  for (const m of xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = []
    for (const c of m[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1]
      const body = c[2] ?? ''
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1]
      const type = attrs.match(/t="([^"]+)"/)?.[1]
      let value: string
      if (type === 's') {
        const idx = Number(textOf(body, 'v')[0] ?? '')
        value = shared[idx] ?? ''
      } else if (type === 'inlineStr') {
        value = unescapeXml(textOf(body, 't').join(''))
      } else {
        value = unescapeXml(textOf(body, 'v')[0] ?? '')
      }
      const at = ref ? columnIndex(ref) : cells.length
      while (cells.length < at) cells.push('')
      cells[at] = value
    }
    rows.push(cells)
  }
  const width = rows.reduce((n, r) => Math.max(n, r.length), 0)
  return rows.map((r) => {
    const padded = [...r]
    while (padded.length < width) padded.push('')
    return padded
  })
}

export async function readXlsxWorkbook(bytes: Uint8Array): Promise<XlsxSheet[]> {
  const files = await unzip(bytes)
  const decoder = new TextDecoder()
  const sharedPart = files.find((f) => f.name === 'xl/sharedStrings.xml')
  const shared = sharedPart
    ? textOf(decoder.decode(sharedPart.data), 'si').map((si) => unescapeXml(textOf(si, 't').join('')))
    : []
  const listed = parseWorkbookSheets(files)
  const fallback = files.filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name))
  const targets = listed.length
    ? listed
    : fallback.map((f, i) => ({ name: `Sheet${i + 1}`, path: f.name }))
  const out: XlsxSheet[] = []
  for (const sheet of targets) {
    const file = files.find((f) => f.name === sheet.path || f.name.endsWith(sheet.path.replace(/^xl\//, '')))
    if (!file) continue
    out.push({ name: sheet.name, rows: rowsFromSheetXml(decoder.decode(file.data), shared) })
  }
  if (!out.length) throw new Error('No worksheet found in that .xlsx file.')
  return out
}

export async function readXlsx(bytes: Uint8Array, sheetName?: string): Promise<string[][]> {
  const sheets = await readXlsxWorkbook(bytes)
  if (sheetName) {
    const found = sheets.find((s) => s.name === sheetName)
    if (!found) throw new Error(`No sheet named “${sheetName}”.`)
    return found.rows
  }
  return sheets[0].rows
}

/** Re-exported so callers that already import from `xlsx` keep working. */
export { unzip }
