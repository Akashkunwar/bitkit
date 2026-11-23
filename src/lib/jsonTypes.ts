/**
 * Infer a TypeScript type or a Zod schema from a JSON value.
 *
 * Arrays are merged: a list of objects becomes one object type, with a
 * property optional when it is missing from some elements. `null` becomes
 * `null` in TypeScript and `z.null()` in Zod rather than being dropped.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function indent(level: number): string {
  return '  '.repeat(level)
}

function mergeValues(values: unknown[]): unknown {
  if (!values.length) return []
  if (values.every((value) => isRecord(value) || value == null)) {
    const keys = new Set<string>()
    for (const value of values) if (isRecord(value)) Object.keys(value).forEach((key) => keys.add(key))
    const merged: Record<string, unknown> = {}
    for (const key of keys) {
      const present = values
        .filter((value) => isRecord(value) && key in value)
        .map((value) => (value as Record<string, unknown>)[key])
      const missing = values.some((value) => !isRecord(value) || !(key in value))
      const inner = present.length > 1 ? mergeValues(present) : present[0]
      merged[key] = missing ? { __optional: inner } : inner
    }
    return merged
  }
  return values.find((value) => value != null) ?? values[0]
}

function typeOf(value: unknown, level: number): string {
  if (value == null) return 'null'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) {
    if (!value.length) return 'unknown[]'
    const merged = mergeValues(value)
    const inner = typeOf(Array.isArray(merged) ? merged[0] : merged, level)
    return `${inner}[]`
  }
  if (isRecord(value) && '__optional' in value && Object.keys(value).length === 1) {
    return typeOf(value.__optional, level)
  }
  if (isRecord(value)) {
    const keys = Object.keys(value)
    if (!keys.length) return 'Record<string, never>'
    const lines = keys.map((key) => {
      const raw = value[key]
      const optional = isRecord(raw) && '__optional' in raw && Object.keys(raw).length === 1
      const prop = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
      return `${indent(level + 1)}${prop}${optional ? '?' : ''}: ${typeOf(optional ? raw.__optional : raw, level + 1)}`
    })
    return `{\n${lines.join('\n')}\n${indent(level)}}`
  }
  return 'unknown'
}

export function jsonToTypeScript(value: unknown, name = 'Root'): string {
  const safe = /^[A-Za-z_$][\w$]*$/.test(name) ? name : 'Root'
  return `export type ${safe} = ${typeOf(value, 0)}\n`
}

function zodOf(value: unknown, level: number): string {
  if (value == null) return 'z.null()'
  if (typeof value === 'string') return 'z.string()'
  if (typeof value === 'number') return Number.isInteger(value) ? 'z.number()' : 'z.number()'
  if (typeof value === 'boolean') return 'z.boolean()'
  if (Array.isArray(value)) {
    if (!value.length) return 'z.array(z.unknown())'
    const merged = mergeValues(value)
    return `z.array(${zodOf(Array.isArray(merged) ? merged[0] : merged, level)})`
  }
  if (isRecord(value) && '__optional' in value && Object.keys(value).length === 1) {
    return `${zodOf(value.__optional, level)}.optional()`
  }
  if (isRecord(value)) {
    const keys = Object.keys(value)
    if (!keys.length) return 'z.object({})'
    const lines = keys.map((key) => {
      const raw = value[key]
      const optional = isRecord(raw) && '__optional' in raw && Object.keys(raw).length === 1
      const inner = zodOf(optional ? raw.__optional : raw, level + 1)
      return `${indent(level + 1)}${JSON.stringify(key)}: ${optional ? `${inner}.optional()` : inner}`
    })
    return `z.object({\n${lines.join(',\n')}\n${indent(level)}})`
  }
  return 'z.unknown()'
}

export function jsonToZod(value: unknown, name = 'root'): string {
  const safe = /^[A-Za-z_$][\w$]*$/.test(name) ? name : 'root'
  return `import { z } from 'zod'\n\nexport const ${safe} = ${zodOf(value, 0)}\nexport type ${safe[0].toUpperCase()}${safe.slice(1)} = z.infer<typeof ${safe}>\n`
}
