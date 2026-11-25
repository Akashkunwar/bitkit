const LEET: Record<string, string> = {
  a: '4',
  e: '3',
  i: '1',
  o: '0',
  s: '5',
  t: '7',
}

export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '')
}

export function toCodePoints(input: string): string {
  return Array.from(input)
    .map((char) => {
      const point = char.codePointAt(0) ?? 0
      return `U+${point.toString(16).toUpperCase().padStart(4, '0')}`
    })
    .join(' ')
}

export function fromCodePoints(input: string): string {
  const parts = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  if (!parts.length) throw new Error('Enter code points such as U+00E9 or 00E9.')
  return parts
    .map((part) => {
      const hex = part.replace(/^U\+/i, '').replace(/^0x/i, '')
      if (!/^[0-9a-f]+$/i.test(hex)) throw new Error(`“${part}” is not a code point.`)
      const value = Number.parseInt(hex, 16)
      if (value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff))
        throw new Error(`U+${hex.toUpperCase()} is not a character.`)
      return String.fromCodePoint(value)
    })
    .join('')
}

export function stripFormatChars(input: string): string {
  return input.replace(/[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g, '')
}

export function stripMarks(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '')
}

export function pigLatin(input: string): string {
  return input.replace(/[A-Za-z]+/g, (word) => {
    const lower = word.toLowerCase()
    const cluster = lower.match(/^[^aeiou]+/)?.[0] ?? ''
    let next: string
    if (!cluster) next = `${lower}way`
    else if (cluster === lower) next = `${lower}ay`
    else next = `${lower.slice(cluster.length)}${cluster}ay`
    if (word[0] === word[0].toUpperCase()) return next[0].toUpperCase() + next.slice(1)
    return next
  })
}

export function toLeet(input: string): string {
  return Array.from(input)
    .map((char) => LEET[char.toLowerCase()] ?? char)
    .join('')
}

export function isPalindrome(input: string): boolean {
  const letters = Array.from(input.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()).filter((char) =>
    /\p{L}|\p{N}/u.test(char),
  )
  return letters.join('') === letters.reverse().join('')
}

export function acronym(input: string): string {
  const words = input.match(/[\p{L}\p{N}]+/gu) ?? []
  if (!words.length) throw new Error('Enter some words.')
  return words.map((word) => word[0].toUpperCase()).join('')
}

export function anagrams(input: string): string {
  const letters = Array.from(input.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()).filter((char) =>
    /\p{L}/u.test(char),
  )
  if (letters.length < 2) throw new Error('Enter at least two letters.')
  if (letters.length > 7) throw new Error('Seven letters is the limit, so the list stays readable.')
  const unique = new Set<string>()
  const current = [...letters]
  const walk = (start: number) => {
    if (unique.size >= 24) return
    if (start === current.length) {
      unique.add(current.join(''))
      return
    }
    const used = new Set<string>()
    for (let i = start; i < current.length; i += 1) {
      if (used.has(current[i])) continue
      used.add(current[i])
      const swap = current[start]
      current[start] = current[i]
      current[i] = swap
      walk(start + 1)
      current[i] = current[start]
      current[start] = swap
    }
  }
  walk(0)
  return [...unique].join('\n')
}

export function extractEmails(input: string): string {
  const found = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []
  return unique(found).join('\n')
}

export function extractUrls(input: string): string {
  const found = input.match(/https?:\/\/[^\s<>"']+/gi) ?? []
  return unique(found.map((url) => url.replace(/[),.;]+$/, ''))).join('\n')
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

export type GlyphOp = {
  id: string
  label: string
  hint: string
  run: (input: string) => string
}

export const GLYPH_OPS: GlyphOp[] = [
  { id: 'accents', label: 'Remove accents', hint: 'É becomes E. Letters stay; marks go.', run: stripAccents },
  { id: 'points', label: 'To code points', hint: 'Each character as U+XXXX.', run: toCodePoints },
  { id: 'chars', label: 'From code points', hint: 'U+00E9 or 00E9, separated by spaces.', run: fromCodePoints },
  { id: 'nfc', label: 'Normalize NFC', hint: 'Canonical composition.', run: (input) => input.normalize('NFC') },
  { id: 'nfd', label: 'Normalize NFD', hint: 'Canonical decomposition.', run: (input) => input.normalize('NFD') },
  {
    id: 'nfkc',
    label: 'Normalize NFKC',
    hint: 'Compatibility composition. This can change lookalike characters.',
    run: (input) => input.normalize('NFKC'),
  },
  { id: 'marks', label: 'Strip combining marks', hint: 'Removes accents and zalgo stacks.', run: stripMarks },
  {
    id: 'format',
    label: 'Strip invisible characters',
    hint: 'Removes zero-width spaces, bidi marks, soft hyphens, and the byte-order mark.',
    run: stripFormatChars,
  },
  { id: 'pig', label: 'Pig Latin', hint: 'English consonant clusters move to the end.', run: pigLatin },
  { id: 'leet', label: 'Leet', hint: 'A small letter-to-digit swap: a e i o s t.', run: toLeet },
  {
    id: 'palindrome',
    label: 'Palindrome',
    hint: 'Ignores case, spaces, and punctuation.',
    run: (input) => (isPalindrome(input) ? 'Yes' : 'No'),
  },
  { id: 'acronym', label: 'Acronym', hint: 'The first letter of each word.', run: acronym },
  {
    id: 'anagram',
    label: 'Letter arrangements',
    hint: 'Up to 24 distinct rearrangements of two to seven letters.',
    run: anagrams,
  },
  { id: 'emails', label: 'Extract emails', hint: 'One address per line. Nothing is looked up.', run: extractEmails },
  { id: 'urls', label: 'Extract URLs', hint: 'http and https links, one per line.', run: extractUrls },
]
