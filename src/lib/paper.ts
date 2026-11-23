/**
 * Line wrapping for the paper tool. Drawing stays in the component;
 * this only decides which words share a line.
 */

export function wrapByMeasure(text: string, maxWidth: number, measure: (sample: string) => number): string[] {
  const lines: string[] = []
  for (const paragraph of text.replaceAll('\r\n', '\n').split('\n')) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (measure(next) <= maxWidth) line = next
      else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

export const PAPER = {
  width: 794,
  height: 1123,
  margin: 64,
  lineGap: 36,
} as const
