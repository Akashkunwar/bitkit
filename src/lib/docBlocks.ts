/**
 * A small, format-neutral document model.
 *
 * Word files, spreadsheets, HTML, and Markdown all get parsed into these
 * blocks, and every exporter (PDF, DOCX, HTML, Markdown, plain text) works
 * from them. That way "Word to PDF" and "PDF to Word" share one spine instead
 * of each growing its own half-converter.
 *
 * Runs carry only bold/italic/mono. Colour, size, and floats are deliberately
 * dropped: pretending to preserve a full Word layout would be a lie, and the
 * honest promise is "the text, its structure, and its emphasis".
 */

export type Run = { text: string; bold?: boolean; italic?: boolean; mono?: boolean }

export type DocBlock =
  | { kind: 'h'; level: 1 | 2 | 3 | 4; runs: Run[] }
  | { kind: 'p'; runs: Run[] }
  | { kind: 'li'; runs: Run[]; depth: number; marker: string }
  | { kind: 'pre'; text: string }
  | { kind: 'table'; rows: string[][]; header: boolean }
  | { kind: 'break' }

export function run(text: string, style: Omit<Run, 'text'> = {}): Run {
  return { text, ...style }
}

export function runsOf(text: string): Run[] {
  return text ? [{ text }] : []
}

export function plain(runs: Run[]): string {
  return runs.map((r) => r.text).join('')
}

export function blockText(block: DocBlock): string {
  if (block.kind === 'pre') return block.text
  if (block.kind === 'table') return block.rows.map((row) => row.join('\t')).join('\n')
  if (block.kind === 'break') return ''
  return plain(block.runs)
}

/** Word count across every block, used for the "what did I get" summary. */
export function countWords(blocks: DocBlock[]): number {
  return blocks.reduce((n, block) => {
    const words = blockText(block).trim().split(/\s+/).filter(Boolean)
    return n + words.length
  }, 0)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function runsToHtml(runs: Run[]): string {
  return runs
    .map((r) => {
      let html = escapeHtml(r.text)
      if (r.mono) html = `<code>${html}</code>`
      if (r.italic) html = `<em>${html}</em>`
      if (r.bold) html = `<strong>${html}</strong>`
      return html
    })
    .join('')
}

export function blocksToHtml(blocks: DocBlock[]): string {
  const out: string[] = []
  // One entry per open list level, so nesting and ordered/unordered both survive.
  const stack: ('ul' | 'ol')[] = []

  const closeLists = (target: number) => {
    while (stack.length > target) {
      out.push(`</${stack.pop()}>`)
      // Closing a nested list also closes the item that contained it.
      if (stack.length) out.push('</li>')
    }
  }

  for (const block of blocks) {
    if (block.kind === 'li') {
      const want = block.depth + 1
      const tag = block.marker === '\u2022' ? 'ul' : 'ol'
      closeLists(want)
      while (stack.length < want) {
        // A deeper level belongs *inside* the item above it, so reopen that item.
        if (stack.length && out[out.length - 1] === '</li>') out.pop()
        out.push(`<${tag}>`)
        stack.push(tag)
      }
      out.push(`<li>${runsToHtml(block.runs)}`)
      out.push('</li>')
      continue
    }

    closeLists(0)
    if (block.kind === 'h') out.push(`<h${block.level}>${runsToHtml(block.runs)}</h${block.level}>`)
    else if (block.kind === 'p') out.push(`<p>${runsToHtml(block.runs)}</p>`)
    else if (block.kind === 'pre') out.push(`<pre><code>${escapeHtml(block.text)}</code></pre>`)
    else if (block.kind === 'break') out.push('<hr />')
    else {
      const rows = block.rows
        .map((row, i) => {
          const tag = block.header && i === 0 ? 'th' : 'td'
          return `<tr>${row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join('')}</tr>`
        })
        .join('')
      out.push(`<table>${rows}</table>`)
    }
  }
  closeLists(0)
  return out.join('')
}

function runsToMarkdown(runs: Run[]): string {
  return runs
    .map((r) => {
      const text = r.text.replace(/([*_`])/g, '\\$1')
      if (!text.trim()) return r.text
      if (r.mono) return `\`${r.text}\``
      if (r.bold && r.italic) return `***${text}***`
      if (r.bold) return `**${text}**`
      if (r.italic) return `_${text}_`
      return text
    })
    .join('')
}

export function blocksToMarkdown(blocks: DocBlock[]): string {
  const out: string[] = []
  for (const block of blocks) {
    if (block.kind === 'h') out.push(`${'#'.repeat(block.level)} ${runsToMarkdown(block.runs)}`)
    else if (block.kind === 'p') out.push(runsToMarkdown(block.runs))
    else if (block.kind === 'li') out.push(`${'  '.repeat(block.depth)}${block.marker === '•' ? '-' : block.marker} ${runsToMarkdown(block.runs)}`)
    else if (block.kind === 'pre') out.push(`\`\`\`\n${block.text}\n\`\`\``)
    else if (block.kind === 'break') out.push('---')
    else {
      const [head, ...rest] = block.rows
      if (!head) continue
      const escape = (cell: string) => cell.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
      // The whole table is one block: a blank line between rows would end it.
      out.push(
        [
          `| ${head.map(escape).join(' | ')} |`,
          `| ${head.map(() => '---').join(' | ')} |`,
          ...rest.map((row) => `| ${row.map(escape).join(' | ')} |`),
        ].join('\n'),
      )
    }
  }
  return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export function blocksToText(blocks: DocBlock[]): string {
  const out: string[] = []
  for (const block of blocks) {
    if (block.kind === 'li') out.push(`${'  '.repeat(block.depth)}${block.marker} ${plain(block.runs)}`)
    else if (block.kind === 'break') out.push('—'.repeat(20))
    else out.push(blockText(block))
  }
  return out.join('\n\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n'
}

/** First heading, else first non-empty paragraph — used to name the output file. */
export function documentTitle(blocks: DocBlock[], fallback = 'document'): string {
  const heading = blocks.find((b) => b.kind === 'h')
  if (heading) {
    const text = plain((heading as Extract<DocBlock, { kind: 'h' }>).runs).trim()
    if (text) return text.slice(0, 80)
  }
  const para = blocks.find((b) => b.kind === 'p' && plain(b.runs).trim().length > 3)
  if (para) return plain((para as Extract<DocBlock, { kind: 'p' }>).runs).trim().slice(0, 60)
  return fallback
}
