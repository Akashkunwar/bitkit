export type JsonError = {
  message: string
  line: number
  column: number
  position: number
}

export type JsonStats = {
  bytes: number
  keys: number
  depth: number
  arrays: number
  objects: number
}

/**
 * Minimal RFC 8259 scanner used purely to locate the first syntax error,
 * since engine error messages don't reliably include a position.
 */
function findErrorPosition(s: string): number {
  let i = 0
  const ws = () => {
    while (i < s.length && ' \t\n\r'.includes(s[i])) i += 1
  }
  const fail = (): never => {
    throw i
  }
  const literal = (word: string) => {
    if (s.startsWith(word, i)) i += word.length
    else fail()
  }
  const string = () => {
    if (s[i] !== '"') fail()
    i += 1
    while (i < s.length && s[i] !== '"') {
      if (s[i] === '\\') {
        i += 1
        if ('"\\/bfnrt'.includes(s[i])) i += 1
        else if (s[i] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(s.slice(i + 1, i + 5))) fail()
          i += 5
        } else fail()
      } else if (s.charCodeAt(i) < 0x20) fail()
      else i += 1
    }
    if (s[i] !== '"') fail()
    i += 1
  }
  const number = () => {
    const m = s.slice(i).match(/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/)
    if (!m || !m[0]) fail()
    else i += m[0].length
  }
  const value = () => {
    ws()
    const ch = s[i]
    if (ch === '{') {
      i += 1
      ws()
      if (s[i] === '}') {
        i += 1
        return
      }
      for (;;) {
        ws()
        string()
        ws()
        if (s[i] !== ':') fail()
        i += 1
        value()
        ws()
        if (s[i] === ',') {
          i += 1
          continue
        }
        if (s[i] === '}') {
          i += 1
          return
        }
        fail()
      }
    } else if (ch === '[') {
      i += 1
      ws()
      if (s[i] === ']') {
        i += 1
        return
      }
      for (;;) {
        value()
        ws()
        if (s[i] === ',') {
          i += 1
          continue
        }
        if (s[i] === ']') {
          i += 1
          return
        }
        fail()
      }
    } else if (ch === '"') string()
    else if (ch === 't') literal('true')
    else if (ch === 'f') literal('false')
    else if (ch === 'n') literal('null')
    else number()
  }
  try {
    value()
    ws()
    if (i < s.length) return i
    return 0
  } catch (pos) {
    return typeof pos === 'number' ? Math.min(pos, s.length) : 0
  }
}

function positionFromMessage(input: string, message: string): number {
  // V8: "... at position 12 (line 2 column 3)" — Firefox: "... at line 2 column 3 of the JSON data"
  const posMatch = message.match(/position (\d+)/)
  if (posMatch) return Number(posMatch[1])
  const lineMatch = message.match(/line (\d+) column (\d+)/)
  if (lineMatch) {
    const line = Number(lineMatch[1])
    const column = Number(lineMatch[2])
    const lines = input.split('\n')
    let pos = 0
    for (let i = 0; i < line - 1 && i < lines.length; i += 1) pos += lines[i].length + 1
    return pos + column - 1
  }
  return findErrorPosition(input)
}

export function locate(input: string, position: number): { line: number; column: number } {
  let line = 1
  let column = 1
  for (let i = 0; i < position && i < input.length; i += 1) {
    if (input[i] === '\n') {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }
  return { line, column }
}

export function validateJson(input: string): { value: unknown; error: null } | { value: null; error: JsonError } {
  try {
    return { value: JSON.parse(input) as unknown, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSON'
    const position = positionFromMessage(input, message)
    const { line, column } = locate(input, position)
    return { value: null, error: { message, line, column, position } }
  }
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return Object.fromEntries(entries.map(([k, v]) => [k, sortValue(v)]))
  }
  return value
}

export type FormatOptions = {
  indent: '2' | '4' | 'tab'
  sortKeys?: boolean
}

export function formatJson(input: string, options: FormatOptions): string {
  const parsed = JSON.parse(input) as unknown
  const value = options.sortKeys ? sortValue(parsed) : parsed
  const indent = options.indent === 'tab' ? '\t' : Number(options.indent)
  return JSON.stringify(value, null, indent)
}

export function minifyJson(input: string): string {
  return JSON.stringify(JSON.parse(input) as unknown)
}

export function jsonStats(input: string): JsonStats {
  const stats: JsonStats = {
    bytes: new TextEncoder().encode(input).length,
    keys: 0,
    depth: 0,
    arrays: 0,
    objects: 0,
  }
  const walk = (value: unknown, depth: number) => {
    stats.depth = Math.max(stats.depth, depth)
    if (Array.isArray(value)) {
      stats.arrays += 1
      for (const item of value) walk(item, depth + 1)
    } else if (value && typeof value === 'object') {
      stats.objects += 1
      const entries = Object.entries(value as Record<string, unknown>)
      stats.keys += entries.length
      for (const [, v] of entries) walk(v, depth + 1)
    }
  }
  walk(JSON.parse(input) as unknown, 1)
  return stats
}

/** Escapes a string for embedding a JSON document inside a JS string literal, or unescapes it. */
export function escapeForString(input: string): string {
  return JSON.stringify(input)
}

export function unescapeString(input: string): string {
  const trimmed = input.trim()
  const wrapped = trimmed.startsWith('"') ? trimmed : `"${trimmed.replaceAll('"', '\\"')}"`
  return JSON.parse(wrapped) as string
}
