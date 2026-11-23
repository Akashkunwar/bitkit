/**
 * Line cleanup and a small find-and-replace. Kept pure so the text bench
 * can offer them without growing a second parser.
 */

export type LineOp = 'sort' | 'sort-desc' | 'unique' | 'trim' | 'reverse' | 'shuffle' | 'number' | 'blank'

function mix(seed: number): number {
  let s = seed >>> 0 || 1
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0
  return s
}

export function transformLines(input: string, op: LineOp, seed = 1): string {
  const lines = input.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
  switch (op) {
    case 'sort':
      return [...lines].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).join('\n')
    case 'sort-desc':
      return [...lines].sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })).join('\n')
    case 'unique': {
      const seen = new Set<string>()
      return lines
        .filter((line) => {
          if (seen.has(line)) return false
          seen.add(line)
          return true
        })
        .join('\n')
    }
    case 'trim':
      return lines.map((line) => line.trim()).join('\n')
    case 'reverse':
      return [...lines].reverse().join('\n')
    case 'shuffle': {
      const next = [...lines]
      let s = seed
      for (let i = next.length - 1; i > 0; i -= 1) {
        s = mix(s)
        const j = s % (i + 1)
        const swap = next[i]
        next[i] = next[j]
        next[j] = swap
      }
      return next.join('\n')
    }
    case 'number':
      return lines.map((line, index) => `${index + 1}. ${line}`).join('\n')
    case 'blank':
      return lines.filter((line) => line.trim()).join('\n')
  }
}

export function findReplace(
  input: string,
  find: string,
  replace: string,
  options: { regex?: boolean; caseSensitive?: boolean } = {},
): string {
  if (!find) return input
  if (options.regex) {
    let pattern: RegExp
    try {
      pattern = new RegExp(find, options.caseSensitive ? 'g' : 'gi')
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'That regular expression is not valid.')
    }
    return input.replace(pattern, replace)
  }
  if (!options.caseSensitive) {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return input.replace(new RegExp(escaped, 'gi'), replace)
  }
  return input.split(find).join(replace)
}
