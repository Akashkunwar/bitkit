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
