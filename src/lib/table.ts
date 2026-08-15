import { parseCsv } from './textbench'
import { readXlsx, buildXlsx } from './xlsx'

export type ColumnType = 'number' | 'date' | 'boolean' | 'text'

export type Table = {
  headers: string[]
  rows: string[][]
}

export type SortDir = 'asc' | 'desc'

export const EMPTY_TABLE: Table = { headers: [], rows: [] }

function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>()
  return raw.map((value, i) => {
    const base = value.trim() || `column${i + 1}`
    const hits = seen.get(base) ?? 0
    seen.set(base, hits + 1)
    return hits ? `${base}_${hits + 1}` : base
  })
}

function fromMatrix(matrix: string[][]): Table {
  if (!matrix.length) return EMPTY_TABLE
  const width = matrix.reduce((n, r) => Math.max(n, r.length), 0)
  const pad = (row: string[]) => {
    const out = [...row]
    while (out.length < width) out.push('')
    return out
  }
  return { headers: uniqueHeaders(pad(matrix[0])), rows: matrix.slice(1).map(pad) }
}

/** Stand-in for a real comma while the file is parsed as comma-separated. */
const COMMA_HOLD = '\u0000'

export function tableFromCsv(input: string, delimiter = ','): Table {
  if (delimiter === ',') return fromMatrix(parseCsv(input))
  // parseCsv only understands commas, so park real commas out of the way,
  // promote the actual delimiter, parse, then put the commas back per cell.
  let swapped = ''
  let quoted = false
  for (const ch of input) {
    if (ch === '"') quoted = !quoted
    if (quoted) swapped += ch
    else if (ch === delimiter) swapped += ','
    else if (ch === ',') swapped += COMMA_HOLD
    else swapped += ch
  }
  const matrix = parseCsv(swapped).map((row) => row.map((cell) => cell.replaceAll(COMMA_HOLD, ',')))
  return fromMatrix(matrix)
}

const DELIMITERS = [',', '\t', ';', '|'] as const

export function detectDelimiter(input: string): string {
  const line = input.split('\n').find((l) => l.trim()) ?? ''
  let best = ','
  let bestCount = 0
  for (const candidate of DELIMITERS) {
    const count = line.split(candidate).length - 1
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

export function tableFromJson(input: string): Table {
  const parsed = JSON.parse(input) as unknown
  const list = Array.isArray(parsed) ? parsed : [parsed]
  const objects = list.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
  if (!objects.length) throw new Error('Expected an array of objects.')
  const headers = [...new Set(objects.flatMap((row) => Object.keys(row)))]
  const rows = objects.map((row) =>
    headers.map((key) => {
      const value = row[key]
      if (value == null) return ''
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
    }),
  )
  return { headers, rows }
}

export async function tableFromFile(file: File): Promise<Table> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) {
    return fromMatrix(await readXlsx(new Uint8Array(await file.arrayBuffer())))
  }
  const text = await file.text()
  if (name.endsWith('.json')) return tableFromJson(text)
  return tableFromCsv(text, detectDelimiter(text))
}

// --- inference and stats ---

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/
const NUMBER_LIKE = /^-?[\d,]*\.?\d+(?:[eE][+-]?\d+)?%?$/

export function toNumber(value: string): number | null {
  const clean = value.trim().replaceAll(',', '').replace(/%$/, '')
  if (!clean || !NUMBER_LIKE.test(value.trim())) return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}

export function columnType(rows: string[][], index: number): ColumnType {
  let numbers = 0
  let dates = 0
  let booleans = 0
  let filled = 0
  for (const row of rows) {
    const value = (row[index] ?? '').trim()
    if (!value) continue
    filled += 1
    if (toNumber(value) != null) numbers += 1
    else if (DATE_LIKE.test(value) && !Number.isNaN(Date.parse(value))) dates += 1
    else if (/^(true|false|yes|no)$/i.test(value)) booleans += 1
  }
  if (!filled) return 'text'
  if (numbers / filled > 0.85) return 'number'
  if (dates / filled > 0.85) return 'date'
  if (booleans / filled > 0.85) return 'boolean'
  return 'text'
}

export type ColumnStats = {
  type: ColumnType
  filled: number
  empty: number
  unique: number
  min?: number
  max?: number
  mean?: number
  median?: number
  sum?: number
}

export function columnStats(table: Table, index: number): ColumnStats {
  const type = columnType(table.rows, index)
  const values = table.rows.map((r) => (r[index] ?? '').trim())
  const filled = values.filter(Boolean)
  const stats: ColumnStats = {
    type,
    filled: filled.length,
    empty: values.length - filled.length,
    unique: new Set(filled).size,
  }
  if (type === 'number') {
    const nums = filled.map(toNumber).filter((n): n is number => n != null).sort((a, b) => a - b)
    if (nums.length) {
      const sum = nums.reduce((a, b) => a + b, 0)
      const mid = Math.floor(nums.length / 2)
      stats.min = nums[0]
      stats.max = nums[nums.length - 1]
      stats.sum = sum
      stats.mean = sum / nums.length
      stats.median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
    }
  }
  return stats
}

// --- operations ---

export function sortTable(table: Table, index: number, dir: SortDir): Table {
  const type = columnType(table.rows, index)
  const sign = dir === 'asc' ? 1 : -1
  const rows = [...table.rows].sort((a, b) => {
    const x = (a[index] ?? '').trim()
    const y = (b[index] ?? '').trim()
    // Empty cells sort last in both directions rather than clumping at the top.
    if (!x && !y) return 0
    if (!x) return 1
    if (!y) return -1
    if (type === 'number') return sign * ((toNumber(x) ?? 0) - (toNumber(y) ?? 0))
    if (type === 'date') return sign * (Date.parse(x) - Date.parse(y))
    return sign * x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' })
  })
  return { ...table, rows }
}

export function filterTable(table: Table, query: string, column: number | null): Table {
  const q = query.trim().toLowerCase()
  if (!q) return table
  const rows = table.rows.filter((row) =>
    column == null
      ? row.some((cell) => cell.toLowerCase().includes(q))
      : (row[column] ?? '').toLowerCase().includes(q),
  )
  return { ...table, rows }
}

export function dedupeRows(table: Table, columns?: number[]): Table {
  const seen = new Set<string>()
  const rows: string[][] = []
  for (const row of table.rows) {
    const key = JSON.stringify(columns?.length ? columns.map((c) => row[c] ?? '') : row)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }
  return { ...table, rows }
}

export function dropEmptyRows(table: Table): Table {
  return { ...table, rows: table.rows.filter((row) => row.some((cell) => cell.trim())) }
}

export function trimCells(table: Table): Table {
  return { ...table, rows: table.rows.map((row) => row.map((cell) => cell.trim().replace(/\s+/g, ' '))) }
}

export function removeColumn(table: Table, index: number): Table {
  return {
    headers: table.headers.filter((_, i) => i !== index),
    rows: table.rows.map((row) => row.filter((_, i) => i !== index)),
  }
}

export function renameColumn(table: Table, index: number, name: string): Table {
  const headers = [...table.headers]
  headers[index] = name
  return { ...table, headers }
}

export function moveColumn(table: Table, index: number, delta: number): Table {
  const to = index + delta
  if (to < 0 || to >= table.headers.length) return table
  const swap = <T,>(list: T[]) => {
    const out = [...list]
    const [item] = out.splice(index, 1)
    out.splice(to, 0, item)
    return out
  }
  return { headers: swap(table.headers), rows: table.rows.map(swap) }
}

// --- export ---

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function tableToCsv(table: Table): string {
  return [table.headers.map(csvCell).join(','), ...table.rows.map((r) => r.map(csvCell).join(','))].join('\n')
}

export function tableToJson(table: Table): string {
  const rows = table.rows.map((row) => {
    const out: Record<string, string> = {}
    table.headers.forEach((h, i) => {
      out[h] = row[i] ?? ''
    })
    return out
  })
  return JSON.stringify(rows, null, 2)
}

export function tableToXlsx(table: Table, sheetName = 'Sheet1'): Uint8Array {
  return buildXlsx([table.headers, ...table.rows], sheetName)
}

export function tableToMarkdown(table: Table): string {
  const esc = (v: string) => v.replaceAll('|', '\\|').replaceAll('\n', ' ')
  const head = `| ${table.headers.map(esc).join(' | ')} |`
  const rule = `| ${table.headers.map(() => '---').join(' | ')} |`
  const body = table.rows.map((r) => `| ${table.headers.map((_, i) => esc(r[i] ?? '')).join(' | ')} |`)
  return [head, rule, ...body].join('\n')
}
