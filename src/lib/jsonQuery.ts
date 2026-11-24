type FilterOp = '==' | '!=' | '<' | '<=' | '>' | '>='
type Literal = string | number | boolean | null

type Segment =
  | { kind: 'prop'; key: string }
  | { kind: 'index'; index: number }
  | { kind: 'wild' }
  | { kind: 'filter'; key: string; op: FilterOp; value: Literal }

const OPS = ['==', '!=', '<=', '>=', '<', '>'] as const

function parseLiteral(raw: string): Literal {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1)
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  throw new Error(`Cannot read the value ${raw}. Quote text, or use a number, true, false, or null.`)
}

function parseFilter(inner: string): Segment {
  const match = inner.match(/^\?\(\s*@\.([\p{L}\p{N}_]+)\s*(==|!=|<=|>=|<|>)\s*(.+)\)$/u)
  if (!match || !OPS.includes(match[2] as FilterOp)) {
    throw new Error('A filter looks like [?(@.price<10)] or [?(@.name=="kit")].')
  }
  return { kind: 'filter', key: match[1], op: match[2] as FilterOp, value: parseLiteral(match[3].trim()) }
}

export function parseJsonPath(path: string): Segment[] {
  const query = path.trim()
  if (!query.startsWith('$')) throw new Error('Start the query with $.')
  const segments: Segment[] = []
  let i = 1
  while (i < query.length) {
    const char = query[i]
    if (char === '.') {
      i += 1
      if (query[i] === '.') throw new Error('Deep scan (..) is not supported. Name each step.')
      const start = i
      while (i < query.length && /[\p{L}\p{N}_$]/u.test(query[i])) i += 1
      if (i === start) throw new Error('Expected a name after the dot.')
      segments.push({ kind: 'prop', key: query.slice(start, i) })
      continue
    }
    if (char === '[') {
      const end = query.indexOf(']', i)
      if (end < 0) throw new Error('A bracket is missing its ].')
      const inner = query.slice(i + 1, end).trim()
      i = end + 1
      if (inner === '*') segments.push({ kind: 'wild' })
      else if (/^\d+$/.test(inner)) segments.push({ kind: 'index', index: Number(inner) })
      else if ((inner.startsWith("'") && inner.endsWith("'")) || (inner.startsWith('"') && inner.endsWith('"'))) {
        segments.push({ kind: 'prop', key: inner.slice(1, -1) })
      } else if (inner.startsWith('?')) segments.push(parseFilter(inner))
      else throw new Error(`Cannot read “[${inner}]”.`)
      continue
    }
    throw new Error(`Unexpected “${char}” in the query.`)
  }
  return segments
}

function matches(item: unknown, segment: Extract<Segment, { kind: 'filter' }>): boolean {
  if (!item || typeof item !== 'object') return false
  const left = (item as Record<string, unknown>)[segment.key]
  const right = segment.value
  if (segment.op === '==') return left === right
  if (segment.op === '!=') return left !== right
  if (typeof left !== 'number' || typeof right !== 'number') return false
  if (segment.op === '<') return left < right
  if (segment.op === '<=') return left <= right
  if (segment.op === '>') return left > right
  return left >= right
}

function step(values: unknown[], segment: Segment): unknown[] {
  const next: unknown[] = []
  for (const value of values) {
    if (segment.kind === 'prop') {
      if (value && typeof value === 'object' && !Array.isArray(value) && segment.key in value) {
        next.push((value as Record<string, unknown>)[segment.key])
      }
    } else if (segment.kind === 'index') {
      if (Array.isArray(value) && segment.index < value.length) next.push(value[segment.index])
    } else if (segment.kind === 'wild') {
      if (Array.isArray(value)) next.push(...value)
      else if (value && typeof value === 'object') next.push(...Object.values(value))
    } else if (Array.isArray(value)) {
      for (const item of value) if (matches(item, segment)) next.push(item)
    }
  }
  return next
}

/** A small JSONPath: property, index, `[*]`, and one comparison filter. */
export function queryJson(data: unknown, path: string): unknown[] {
  return parseJsonPath(path).reduce(step, [data])
}

export function formatQueryResult(matches: unknown[]): string {
  if (!matches.length) return ''
  const value = matches.length === 1 ? matches[0] : matches
  return JSON.stringify(value, null, 2) ?? ''
}
