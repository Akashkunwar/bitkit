function linesOf(input: string): string[] {
  return input.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
}

function asSet(input: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of linesOf(input)) {
    if (seen.has(line)) continue
    seen.add(line)
    out.push(line)
  }
  return out
}

export function listDifference(left: string, right: string): string {
  const block = new Set(linesOf(right))
  return asSet(left)
    .filter((line) => !block.has(line))
    .join('\n')
}

export function listIntersection(left: string, right: string): string {
  const block = new Set(linesOf(right))
  return asSet(left)
    .filter((line) => block.has(line))
    .join('\n')
}

export function listDuplicates(input: string): string {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  const out: string[] = []
  for (const line of linesOf(input)) {
    if (seen.has(line)) {
      if (!dupes.has(line)) {
        dupes.add(line)
        out.push(line)
      }
    } else seen.add(line)
  }
  return out.join('\n')
}

export function withAffix(input: string, prefix: string, suffix: string): string {
  return linesOf(input)
    .map((line) => `${prefix}${line}${suffix}`)
    .join('\n')
}

export function toColumns(input: string, columns: number): string {
  if (!Number.isInteger(columns) || columns < 1 || columns > 12) throw new Error('Use 1 to 12 columns.')
  const items = linesOf(input).filter((line) => line.trim())
  const rows: string[] = []
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns).join('\t'))
  return rows.join('\n')
}

export function sliceLines(input: string, start: number, count: number): string {
  if (!Number.isInteger(start) || start < 1) throw new Error('Start at line 1 or later.')
  if (!Number.isInteger(count) || count < 1) throw new Error('Keep at least one line.')
  return linesOf(input)
    .slice(start - 1, start - 1 + count)
    .join('\n')
}

export function bulletLines(input: string, numbered: boolean): string {
  return linesOf(input)
    .map((line, index) => (numbered ? `${index + 1}. ${line}` : `• ${line}`))
    .join('\n')
}

export type ListOp = {
  id: string
  label: string
  hint: string
  second?: string
  extra?: { id: string; label: string; sample: string }
  run: (input: string, extra: string) => string
}

export const LIST_OPS: ListOp[] = [
  {
    id: 'diff',
    label: 'In A, not in B',
    hint: 'Lines from the first list that do not appear in the second.',
    second: 'List B',
    run: (input, extra) => listDifference(input, extra),
  },
  {
    id: 'both',
    label: 'In both',
    hint: 'Lines that appear in both lists.',
    second: 'List B',
    run: (input, extra) => listIntersection(input, extra),
  },
  {
    id: 'dupes',
    label: 'Duplicates only',
    hint: 'Lines that occur more than once.',
    run: (input) => listDuplicates(input),
  },
  {
    id: 'affix',
    label: 'Prefix and suffix',
    hint: 'Adds the same text to every line. Leave either side blank.',
    extra: { id: 'prefix', label: 'Prefix | suffix', sample: '- |' },
    run: (input, extra) => {
      const [prefix, suffix = ''] = extra.split('|')
      return withAffix(input, prefix ?? '', suffix)
    },
  },
  {
    id: 'columns',
    label: 'Columns',
    hint: 'Reads the list down the page and writes rows separated by tabs.',
    extra: { id: 'cols', label: 'Columns', sample: '3' },
    run: (input, extra) => toColumns(input, Number(extra)),
  },
  {
    id: 'slice',
    label: 'Slice',
    hint: 'A run of lines. Start is 1 for the first line.',
    extra: { id: 'slice', label: 'Start | count', sample: '2 | 3' },
    run: (input, extra) => {
      const [start, count] = extra.split('|').map((part) => Number(part.trim()))
      return sliceLines(input, start, count)
    },
  },
  { id: 'bullets', label: 'Bullets', hint: 'A bullet on every line.', run: (input) => bulletLines(input, false) },
  { id: 'numbers', label: 'Numbers', hint: '1. 2. 3. down the list.', run: (input) => bulletLines(input, true) },
]
