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

function cellXml(ref: string, value: string): string {
  if (value === '') return ''
  // Inline strings avoid needing a shared-strings part entirely.
  if (NUMERIC.test(value.trim())) return `<c r="${ref}"><v>${value.trim()}</v></c>`
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

type ZipFile = { name: string; data: Uint8Array }

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read compressed .xlsx files. Export the sheet as CSV instead.')
  }
  const stream = new Blob([data.slice().buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Reads a ZIP central directory and returns every entry, inflating as needed. */
export async function unzip(bytes: Uint8Array): Promise<ZipFile[]> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // Scan backwards for the end-of-central-directory signature.
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 22 - 65_536; i -= 1) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('That file is not a valid .xlsx (no ZIP directory found).')

  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out: ZipFile[] = []
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > bytes.length || dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const compressedSize = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    const localOffset = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen))

    // The local header repeats name/extra lengths, and they may differ.
    const localNameLen = dv.getUint16(localOffset + 26, true)
    const localExtraLen = dv.getUint16(localOffset + 28, true)
    const start = localOffset + 30 + localNameLen + localExtraLen
    const raw = bytes.subarray(start, start + compressedSize)
    out.push({ name, data: method === 0 ? raw : await inflateRaw(raw) })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

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

export async function readXlsx(bytes: Uint8Array): Promise<string[][]> {
  const files = await unzip(bytes)
  const sheet = files.find((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name))
  if (!sheet) throw new Error('No worksheet found in that .xlsx file.')
  const decoder = new TextDecoder()

  const sharedPart = files.find((f) => f.name === 'xl/sharedStrings.xml')
  const shared = sharedPart
    ? textOf(decoder.decode(sharedPart.data), 'si').map((si) => unescapeXml(textOf(si, 't').join('')))
    : []

  const xml = decoder.decode(sheet.data)
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
