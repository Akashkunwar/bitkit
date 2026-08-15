import { dump as yamlDump, load as yamlLoad } from 'js-yaml'
import { parse as tomlParse, stringify as tomlStringify } from 'smol-toml'

export type ConfigFormat = 'json' | 'yaml' | 'toml'

export const CONFIG_FORMATS: { value: ConfigFormat; label: string; ext: string }[] = [
  { value: 'json', label: 'JSON', ext: 'json' },
  { value: 'yaml', label: 'YAML', ext: 'yaml' },
  { value: 'toml', label: 'TOML', ext: 'toml' },
]

export function detectFormat(input: string, filename?: string): ConfigFormat {
  const name = filename?.toLowerCase() ?? ''
  if (name.endsWith('.json')) return 'json'
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'yaml'
  if (name.endsWith('.toml')) return 'toml'

  const trimmed = input.trim()
  // A `[table]` header occupies its own line, which a JSON array never does —
  // check it before the leading-bracket heuristic or every TOML file with a
  // table at the top reads as JSON.
  if (/^\s*\[{1,2}[^\][]+\]{1,2}\s*$/m.test(trimmed)) return 'toml'
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
  if (/^\s*[\w.-]+\s*=\s*/m.test(trimmed)) return 'toml'
  return 'yaml'
}

export function parseConfig(input: string, format: ConfigFormat): unknown {
  if (!input.trim()) return null
  if (format === 'json') return JSON.parse(input) as unknown
  if (format === 'yaml') return yamlLoad(input) as unknown
  return tomlParse(input) as unknown
}

/**
 * TOML has no top-level scalars or arrays and cannot express a null, so a
 * document that would silently lose data is rejected with a clear reason
 * rather than emitted in a broken form.
 */
function assertTomlEncodable(value: unknown): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('TOML needs a table at the top level — an object with named keys.')
  }
  const walk = (node: unknown, path: string): void => {
    if (node === null) throw new Error(`TOML has no null. Remove or change “${path || 'the root'}”.`)
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`))
      return
    }
    if (typeof node === 'object') {
      for (const [key, item] of Object.entries(node as Record<string, unknown>)) {
        walk(item, path ? `${path}.${key}` : key)
      }
    }
  }
  walk(value, '')
}

export function formatConfig(value: unknown, format: ConfigFormat, indent = 2): string {
  if (value == null && format !== 'json') return ''
  if (format === 'json') return JSON.stringify(value, null, indent)
  if (format === 'yaml') {
    return yamlDump(value, { indent, lineWidth: 100, noRefs: true, sortKeys: false })
  }
  assertTomlEncodable(value)
  return tomlStringify(value)
}

export type ConvertResult = { output: string; error: string | null }

export function convertConfig(
  input: string,
  from: ConfigFormat,
  to: ConfigFormat,
  indent = 2,
): ConvertResult {
  try {
    const value = parseConfig(input, from)
    return { output: formatConfig(value, to, indent), error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not convert that document.'
    return { output: '', error: message }
  }
}
