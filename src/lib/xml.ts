import { csvToJson } from './textbench'

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;'
    if (ch === '<') return '&lt;'
    if (ch === '>') return '&gt;'
    if (ch === '"') return '&quot;'
    return '&apos;'
  })
}

function tagName(name: string): string {
  const clean = name.replace(/[^A-Za-z0-9_.-]/g, '_').replace(/^[^A-Za-z_]+/, '')
  return clean || 'item'
}

function node(value: unknown, tag: string, pad: string): string {
  const name = tagName(tag)
  if (value === null || value === undefined) return `${pad}<${name}></${name}>`
  if (Array.isArray(value)) {
    return value.map((item) => node(item, 'item', pad)).join('\n')
  }
  if (typeof value === 'object') {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => node(child, key, `${pad}  `))
      .join('\n')
    return inner ? `${pad}<${name}>\n${inner}\n${pad}</${name}>` : `${pad}<${name}></${name}>`
  }
  return `${pad}<${name}>${escapeXml(String(value))}</${name}>`
}

export function jsonToXml(value: unknown): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${node(value, 'root', '')}\n`
}

function scalar(text: string): unknown {
  const value = text.trim()
  if (value === 'true') return true
  if (value === 'false') return false
  if (value !== '' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return Number(value)
  return text
}

function elementValue(el: Element): unknown {
  const children = [...el.children]
  if (!children.length) return scalar(el.textContent ?? '')
  const map: Record<string, unknown> = {}
  for (const child of children) {
    const key = child.tagName
    const value = elementValue(child)
    if (key in map) {
      const prev = map[key]
      map[key] = Array.isArray(prev) ? [...prev, value] : [prev, value]
    } else {
      map[key] = value
    }
  }
  return map
}

/** The root element becomes the object. Attributes are dropped. */
export function xmlToJson(input: string): unknown {
  const doc = new DOMParser().parseFromString(input, 'application/xml')
  const root = doc.documentElement
  if (!root || doc.querySelector('parsererror')) {
    throw new Error('That is not XML.')
  }
  const value = elementValue(root)
  // jsonToXml wraps everything in <root>. Other documents keep their root tag.
  if (root.tagName === 'root') return value
  return { [root.tagName]: value }
}

/** Header row becomes tags. One `<row>` per record, inside `<table>`. */
export function csvToXml(input: string): string {
  const rows = csvToJson(input)
  if (!rows.length) throw new Error('That CSV has no data rows.')
  return jsonToXml({ table: { row: rows } })
}
