/**
 * HTML ↔ Markdown, plus small formatters for HTML, CSS, and SQL.
 *
 * HTML is parsed with the browser (or jsdom in tests) and sanitised on the
 * way back to Markdown, so a pasted page cannot carry a script into the
 * editor. The formatters indent; they are not Prettier.
 */

import { sanitizeHtml } from './markdown'

const SQL_BREAK = [
  'select',
  'from',
  'where',
  'group by',
  'order by',
  'having',
  'limit',
  'offset',
  'insert into',
  'values',
  'update',
  'set',
  'delete from',
  'inner join',
  'left join',
  'right join',
  'join',
  'union',
  'and',
  'or',
]

export function formatSql(input: string): string {
  let sql = input.replace(/\s+/g, ' ').trim()
  const sorted = [...SQL_BREAK].sort((a, b) => b.length - a.length)
  for (const word of sorted) {
    const pattern = new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`, 'gi')
    sql = sql.replace(pattern, (match) => `\n${match.toUpperCase()}`)
  }
  return sql
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/^(AND|OR)\b/.test(line) ? `  ${line}` : line))
    .join('\n')
}

export function formatCss(input: string): string {
  const flat = input.replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  let out = ''
  let depth = 0
  let buffer = ''
  const flush = () => {
    const text = buffer.trim()
    buffer = ''
    if (!text) return
    const colon = text.indexOf(':')
    const pretty = colon > 0 ? `${text.slice(0, colon).trim()}: ${text.slice(colon + 1).trim()}` : text
    out += `${'  '.repeat(depth)}${pretty}\n`
  }
  for (const ch of flat) {
    if (ch === '{') {
      flush()
      out += `${'  '.repeat(depth)}{\n`
      depth += 1
    } else if (ch === '}') {
      flush()
      depth = Math.max(0, depth - 1)
      out += `${'  '.repeat(depth)}}\n`
    } else if (ch === ';') {
      buffer += ';'
      flush()
    } else buffer += ch
  }
  flush()
  return out.trim()
}

function elementChildren(node: ParentNode): Element[] {
  return [...node.children]
}

function serialize(node: Element, level: number): string {
  const pad = '  '.repeat(level)
  const tag = node.tagName.toLowerCase()
  const attrs = [...node.attributes].map((attr) => ` ${attr.name}="${attr.value.replaceAll('"', '&quot;')}"`).join('')
  const children = elementChildren(node)
  const text =
    node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE
      ? (node.textContent ?? '').trim()
      : ''
  if (!children.length && !text) return `${pad}<${tag}${attrs}></${tag}>`
  if (!children.length) return `${pad}<${tag}${attrs}>${text.replaceAll('<', '&lt;')}</${tag}>`
  const inner = children.map((child) => serialize(child, level + 1)).join('\n')
  return `${pad}<${tag}${attrs}>\n${inner}\n${pad}</${tag}>`
}

export function formatJs(input: string): string {
  const flat = input.replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  let out = ''
  let depth = 0
  let quote: "'" | '"' | '`' | '' = ''
  for (let i = 0; i < flat.length; i += 1) {
    const ch = flat[i]
    if (quote) {
      out += ch
      if (ch === '\\') {
        out += flat[i + 1] ?? ''
        i += 1
      } else if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      out += ch
      continue
    }
    if (ch === '{' || ch === '[') {
      depth += 1
      out += `${ch}\n${'  '.repeat(depth)}`
    } else if (ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1)
      out += `\n${'  '.repeat(depth)}${ch}`
    } else if (ch === ';') out += `;\n${'  '.repeat(depth)}`
    else out += ch
  }
  return out
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, all) => line.trim() || (all[index - 1] ?? '').trim())
    .join('\n')
    .trim()
}

function collapseOutsideStrings(input: string, comment: 'js' | 'css'): string {
  let out = ''
  let quote: "'" | '"' | '`' | '' = ''
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    const next = input[i + 1]
    if (!quote && comment === 'js' && ch === '/' && next === '/') {
      i = input.indexOf('\n', i)
      if (i < 0) break
      continue
    }
    if (!quote && ch === '/' && next === '*') {
      const end = input.indexOf('*/', i + 2)
      i = end < 0 ? input.length : end + 1
      continue
    }
    if (quote) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i += 1
      } else if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch
    out += ch
  }
  return out.replace(/\s+/g, ' ').trim()
}

export function minifyJs(input: string): string {
  return collapseOutsideStrings(input, 'js').replace(/\s*([{}();,:=+\-*/<>])\s*/g, '$1')
}

export function minifyCss(input: string): string {
  return collapseOutsideStrings(input, 'css')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
}

export function minifyHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function formatHtml(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const doc = new DOMParser().parseFromString(trimmed, 'text/html')
  const full = /^<!doctype/i.test(trimmed) || /<html[\s>]/i.test(trimmed)
  if (full) return `<!DOCTYPE html>\n${serialize(doc.documentElement, 0)}\n`
  const blocks = elementChildren(doc.body)
  if (!blocks.length) return trimmed
  return blocks.map((node) => serialize(node, 0)).join('\n')
}

function inlineToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\s+/g, ' ')
  if (!(node instanceof HTMLElement)) return ''
  const tag = node.tagName.toLowerCase()
  const inner = [...node.childNodes].map((child) => inlineToMd(child)).join('')
  if (tag === 'strong' || tag === 'b') return `**${inner}**`
  if (tag === 'em' || tag === 'i') return `*${inner}*`
  if (tag === 'code') return `\`${inner}\``
  if (tag === 'br') return '\n'
  if (tag === 'a') {
    const href = node.getAttribute('href') ?? ''
    return href ? `[${inner || href}](${href})` : inner
  }
  return inner
}

function blockToMd(node: Node, listIndex: number | null): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').trim()
    return text ? `${text}\n\n` : ''
  }
  if (!(node instanceof HTMLElement)) return ''
  const tag = node.tagName.toLowerCase()
  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1])
    return `${'#'.repeat(level)} ${inlineToMd(node).trim()}\n\n`
  }
  if (tag === 'p') return `${inlineToMd(node).trim()}\n\n`
  if (tag === 'pre') {
    const text = node.textContent ?? ''
    return `\`\`\`\n${text.replace(/\n$/, '')}\n\`\`\`\n\n`
  }
  if (tag === 'blockquote') {
    const inner = [...node.childNodes]
      .map((child) => blockToMd(child, null))
      .join('')
      .trim()
    return `${inner
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')}\n\n`
  }
  if (tag === 'ul' || tag === 'ol') {
    const ordered = tag === 'ol'
    const items = [...node.children].filter((child) => child.tagName.toLowerCase() === 'li')
    return (
      items
        .map((item, index) => {
          const marker = ordered ? `${index + 1}. ` : '- '
          const text = [...item.childNodes]
            .map((child) => (child instanceof HTMLElement && /^(ul|ol)$/i.test(child.tagName) ? '' : inlineToMd(child)))
            .join('')
            .trim()
          return `${marker}${text}`
        })
        .join('\n') + '\n\n'
    )
  }
  if (tag === 'table') {
    const rows = [...node.querySelectorAll('tr')].map((row) =>
      [...row.children].map((cell) => inlineToMd(cell).trim().replaceAll('|', '\\|')),
    )
    if (!rows.length) return ''
    const head = rows[0]
    const line = head.map(() => '---').join(' | ')
    const body = rows.slice(1).map((row) => `| ${row.join(' | ')} |`)
    return `| ${head.join(' | ')} |\n| ${line} |\n${body.join('\n')}\n\n`
  }
  if (tag === 'img') {
    const alt = node.getAttribute('alt') ?? ''
    const src = node.getAttribute('src') ?? ''
    return src.startsWith('data:') ? '' : `![${alt}](${src})\n\n`
  }
  if (tag === 'li') return `${listIndex == null ? '- ' : `${listIndex}. `}${inlineToMd(node).trim()}\n`
  return [...node.childNodes].map((child) => blockToMd(child, null)).join('')
}

export function htmlToMarkdown(input: string): string {
  const clean = sanitizeHtml(input)
  const doc = new DOMParser().parseFromString(clean, 'text/html')
  const md = [...doc.body.childNodes].map((node) => blockToMd(node, null)).join('')
  return md.replace(/\n{3,}/g, '\n\n').trim()
}

export function markdownDocument(title: string, bodyHtml: string): string {
  const safeTitle = title.replace(/[<&]/g, (ch) => (ch === '<' ? '&lt;' : '&amp;'))
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  body { font: 16px/1.55 ui-sans-serif, system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #1c1915; }
  pre, code { font-family: ui-monospace, monospace; }
  pre { background: #f4f1ea; padding: 0.8rem 1rem; overflow: auto; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #d9d3c7; padding: 0.35rem 0.6rem; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`
}
