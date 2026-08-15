export type BoxStyle = 'light' | 'heavy' | 'double' | 'rounded' | 'ascii' | 'markdown'

type Glyphs = {
  h: string
  v: string
  tl: string
  tr: string
  bl: string
  br: string
  /** T-junctions: top, bottom, left, right, and the four-way cross. */
  tj: string
  bj: string
  lj: string
  rj: string
  x: string
}

const STYLES: Record<Exclude<BoxStyle, 'markdown'>, Glyphs> = {
  light:   { h: '─', v: '│', tl: '┌', tr: '┐', bl: '└', br: '┘', tj: '┬', bj: '┴', lj: '├', rj: '┤', x: '┼' },
  heavy:   { h: '━', v: '┃', tl: '┏', tr: '┓', bl: '┗', br: '┛', tj: '┳', bj: '┻', lj: '┣', rj: '┫', x: '╋' },
  double:  { h: '═', v: '║', tl: '╔', tr: '╗', bl: '╚', br: '╝', tj: '╦', bj: '╩', lj: '╠', rj: '╣', x: '╬' },
  rounded: { h: '─', v: '│', tl: '╭', tr: '╮', bl: '╰', br: '╯', tj: '┬', bj: '┴', lj: '├', rj: '┤', x: '┼' },
  ascii:   { h: '-', v: '|', tl: '+', tr: '+', bl: '+', br: '+', tj: '+', bj: '+', lj: '+', rj: '+', x: '+' },
}

export const BOX_STYLES: { value: BoxStyle; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'double', label: 'Double' },
  { value: 'ascii', label: 'ASCII' },
  { value: 'markdown', label: 'Markdown' },
]

export type Align = 'left' | 'center' | 'right'

/**
 * Display width. CJK and emoji occupy two terminal cells, so measuring by
 * code-unit length would misalign every column that contains them.
 */
export function displayWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code >= 0x1100 && (
      code <= 0x115f ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f9ff)
    )) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

function pad(text: string, width: number, align: Align): string {
  const gap = Math.max(0, width - displayWidth(text))
  if (align === 'right') return ' '.repeat(gap) + text
  if (align === 'center') {
    const left = Math.floor(gap / 2)
    return ' '.repeat(left) + text + ' '.repeat(gap - left)
  }
  return text + ' '.repeat(gap)
}

export type TableOptions = {
  style: BoxStyle
  header: boolean
  align: Align
  padding: number
}

export function drawTable(rows: string[][], options: TableOptions): string {
  const grid = rows.filter((row) => row.length)
  if (!grid.length) return ''
  const columns = Math.max(...grid.map((r) => r.length))
  const normalised = grid.map((row) => {
    const out = [...row]
    while (out.length < columns) out.push('')
    return out
  })

  const widths = Array.from({ length: columns }, (_, c) =>
    Math.max(...normalised.map((row) => displayWidth(row[c] ?? ''))),
  )

  if (options.style === 'markdown') {
    const rule = widths.map((w) => '-'.repeat(Math.max(3, w)))
    const line = (cells: string[]) =>
      `| ${cells.map((cell, i) => pad(cell, widths[i], options.align)).join(' | ')} |`
    const body = normalised.map(line)
    if (options.header && body.length) body.splice(1, 0, `| ${rule.join(' | ')} |`)
    return body.join('\n')
  }

  const g = STYLES[options.style]
  const p = ' '.repeat(options.padding)
  const segment = (w: number) => g.h.repeat(w + options.padding * 2)
  const border = (left: string, join: string, right: string) =>
    left + widths.map(segment).join(join) + right

  const line = (cells: string[]) =>
    g.v + cells.map((cell, i) => p + pad(cell, widths[i], options.align) + p).join(g.v) + g.v

  const out = [border(g.tl, g.tj, g.tr)]
  normalised.forEach((row, i) => {
    out.push(line(row))
    if (options.header && i === 0 && normalised.length > 1) out.push(border(g.lj, g.x, g.rj))
  })
  out.push(border(g.bl, g.bj, g.br))
  return out.join('\n')
}

export function drawBox(text: string, style: BoxStyle, padding = 1, align: Align = 'left'): string {
  const g = STYLES[style === 'markdown' ? 'light' : style]
  const lines = text.split('\n')
  const width = Math.max(1, ...lines.map(displayWidth))
  const p = ' '.repeat(padding)
  const bar = g.h.repeat(width + padding * 2)
  const body = lines.map((l) => g.v + p + pad(l, width, align) + p + g.v)
  return [g.tl + bar + g.tr, ...body, g.bl + bar + g.br].join('\n')
}

export type TreeNode = { label: string; children: TreeNode[] }

/**
 * Parses an indented outline into a tree. Indent width is inferred from the
 * first indented line, so tabs, two spaces, or four all work.
 */
export function parseOutline(input: string): TreeNode[] {
  const lines = input.split('\n').filter((l) => l.trim())
  if (!lines.length) return []

  const depths = lines.map((line) => {
    const match = /^[\t ]*/.exec(line)?.[0] ?? ''
    return match.replace(/\t/g, '    ').length
  })
  const unit = depths.filter((d) => d > 0).sort((a, b) => a - b)[0] || 1

  const roots: TreeNode[] = []
  const stack: { node: TreeNode; depth: number }[] = []

  lines.forEach((line, i) => {
    const depth = Math.round(depths[i] / unit)
    const node: TreeNode = { label: line.trim().replace(/^[-*+]\s*/, ''), children: [] }
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
    if (stack.length) stack[stack.length - 1].node.children.push(node)
    else roots.push(node)
    stack.push({ node, depth })
  })
  return roots
}

export function drawTree(nodes: TreeNode[], style: BoxStyle = 'light'): string {
  const ascii = style === 'ascii'
  const branch = ascii ? '|-- ' : '├── '
  const last = ascii ? '`-- ' : '└── '
  const pipe = ascii ? '|   ' : '│   '
  const blank = '    '

  const walk = (list: TreeNode[], prefix: string): string[] =>
    list.flatMap((node, i) => {
      const isLast = i === list.length - 1
      const head = prefix + (isLast ? last : branch) + node.label
      const rest = walk(node.children, prefix + (isLast ? blank : pipe))
      return [head, ...rest]
    })

  return nodes.flatMap((root) => [root.label, ...walk(root.children, '')]).join('\n')
}

export function parseRows(input: string, delimiter: string): string[][] {
  return input
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => line.split(delimiter === '\\t' ? '\t' : delimiter).map((c) => c.trim()))
}
