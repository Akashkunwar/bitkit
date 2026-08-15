export type RegexHit = {
  index: number
  text: string
  groups: string[]
}

export type RegexResult = {
  flags: string
  hits: RegexHit[]
  replaced: string
  error: string | null
}

export function emptyRegexResult(flags: string, text: string): RegexResult {
  return { flags, hits: [], replaced: text, error: null }
}

export function runRegex(pattern: string, flags: string, text: string, replace = ''): RegexResult {
  const cleanFlags = [...new Set((flags || 'g').split('').filter((f) => 'gimsuy'.includes(f)))].join('')
  const withG = cleanFlags.includes('g') ? cleanFlags : `${cleanFlags}g`
  try {
    const re = new RegExp(pattern, withG)
    const hits: RegexHit[] = []
    let match: RegExpExecArray | null
    const clone = new RegExp(pattern, withG)
    while ((match = clone.exec(text))) {
      hits.push({
        index: match.index,
        text: match[0],
        groups: match.slice(1),
      })
      if (match[0] === '' && clone.lastIndex === match.index) clone.lastIndex += 1
      if (hits.length > 2000) break
    }
    return { flags: withG, hits, replaced: text.replace(re, replace), error: null }
  } catch (err) {
    return {
      flags: withG,
      hits: [],
      replaced: text,
      error: err instanceof Error ? err.message : 'Invalid regular expression.',
    }
  }
}
