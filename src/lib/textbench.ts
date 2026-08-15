export type CaseMode =
  | 'lower'
  | 'upper'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'slug'
  | 'squeeze'

const WORD = /[A-Za-z0-9]+/g

export function wordsOf(input: string): string[] {
  return input.match(WORD) ?? []
}

export function applyCase(input: string, mode: CaseMode): string {
  switch (mode) {
    case 'lower':
      return input.toLowerCase()
    case 'upper':
      return input.toUpperCase()
    case 'title':
      return input.replace(WORD, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    case 'sentence':
      return input
        .toLowerCase()
        .replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase())
    case 'camel': {
      const w = wordsOf(input).map((p) => p.toLowerCase())
      return w.map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('')
    }
    case 'pascal':
      return wordsOf(input)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('')
    case 'snake':
      return wordsOf(input).map((p) => p.toLowerCase()).join('_')
    case 'kebab':
      return wordsOf(input).map((p) => p.toLowerCase()).join('-')
    case 'slug':
      return wordsOf(input).map((p) => p.toLowerCase()).join('-')
    case 'squeeze':
      return input.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  }
}

export type TextStats = {
  chars: number
  charsNoSpace: number
  words: number
  sentences: number
  lines: number
  bytes: number
}

export function textStats(input: string): TextStats {
  const words = input.trim() ? input.trim().split(/\s+/).length : 0
  const sentences = input.trim() ? (input.match(/[.!?]+/g) ?? []).length || 1 : 0
  return {
    chars: input.length,
    charsNoSpace: input.replace(/\s/g, '').length,
    words,
    sentences,
    lines: input ? input.split(/\n/).length : 0,
    bytes: new TextEncoder().encode(input).length,
  }
}

/**
 * Parses a whole CSV document into rows of cells. Scanning the full text
 * (rather than pre-splitting on newlines) is what lets a quoted cell contain
 * a line break, which is legal per RFC 4180 and common in exported data.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i += 1
        } else quoted = false
      } else cur += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cur)
      cur = ''
    } else if (ch === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else cur += ch
  }
  row.push(cur)
  rows.push(row)
  return rows.filter((cells) => cells.some((cell) => cell.trim()))
}

export function csvToJson(input: string): Record<string, string>[] {
  const rows = parseCsv(input)
  if (!rows.length) return []
  const seen = new Map<string, number>()
  const headers = rows[0].map((raw, i) => {
    const base = raw.trim() || `field${i + 1}`
    const hits = seen.get(base) ?? 0
    seen.set(base, hits + 1)
    // Duplicate headers would otherwise silently overwrite each other.
    return hits ? `${base}_${hits + 1}` : base
  })
  return rows.slice(1).map((cells) => {
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    return row
  })
}

export function jsonToCsv(input: string): string {
  const parsed = JSON.parse(input) as unknown
  const rows = Array.isArray(parsed) ? parsed : [parsed]
  if (!rows.length) return ''
  const keys = [...new Set(rows.flatMap((row) => (row && typeof row === 'object' ? Object.keys(row) : [])))]
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  return [keys.join(','), ...rows.map((row) => keys.map((k) => esc((row as Record<string, unknown>)[k])).join(','))].join('\n')
}

const LOREM = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'ut',
  'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris',
  'nisi', 'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat',
]

export function loremParagraphs(count: number, seed = 1): string {
  const n = Math.min(12, Math.max(1, count))
  const out: string[] = []
  let s = seed
  for (let p = 0; p < n; p += 1) {
    const words: string[] = []
    const len = 18 + ((s * 7) % 20)
    for (let i = 0; i < len; i += 1) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      words.push(LOREM[s % LOREM.length])
    }
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
    out.push(`${words.join(' ')}.`)
  }
  return out.join('\n\n')
}

const FIRST = ['Asha', 'Rohan', 'Maya', 'Kabir', 'Nina', 'Arjun', 'Leila', 'Omar', 'Priya', 'Sam']
const LAST = ['Shah', 'Iyer', 'Khan', 'Patel', 'Das', 'Chen', 'Okoye', 'Silva', 'Berg', 'Cole']

export function dummyPeople(count: number, seed = 3): { name: string; email: string; phone: string }[] {
  const n = Math.min(25, Math.max(1, count))
  const out = []
  let s = seed
  for (let i = 0; i < n; i += 1) {
    s = (s * 1664525 + 1013904223) >>> 0
    const first = FIRST[s % FIRST.length]
    const last = LAST[(s >>> 8) % LAST.length]
    out.push({
      name: `${first} ${last}`,
      email: `${first}.${last}${s % 90}@example.com`.toLowerCase(),
      phone: `+91 98${String(s % 100000000).padStart(8, '0')}`,
    })
  }
  return out
}
