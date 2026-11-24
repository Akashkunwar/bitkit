const MORSE: Record<string, string> = {
  a: '.-',
  b: '-...',
  c: '-.-.',
  d: '-..',
  e: '.',
  f: '..-.',
  g: '--.',
  h: '....',
  i: '..',
  j: '.---',
  k: '-.-',
  l: '.-..',
  m: '--',
  n: '-.',
  o: '---',
  p: '.--.',
  q: '--.-',
  r: '.-.',
  s: '...',
  t: '-',
  u: '..-',
  v: '...-',
  w: '.--',
  x: '-..-',
  y: '-.--',
  z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  '!': '-.-.--',
  '/': '-..-.',
  '@': '.--.-.',
}

const FROM_MORSE = new Map(Object.entries(MORSE).map(([letter, code]) => [code, letter]))

export type DensityRow = { word: string; count: number; share: number }

/** Words of two or more letters, most frequent first. Share is of all counted words. */
export function keywordDensity(input: string, limit = 30): DensityRow[] {
  const words = input.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []
  const counts = new Map<string, number>()
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, limit))
    .map(([word, count]) => ({ word, count, share: words.length ? count / words.length : 0 }))
}

export function rot13(input: string): string {
  return input.replace(/[a-z]/gi, (ch) => {
    const base = ch === ch.toLowerCase() ? 97 : 65
    return String.fromCharCode(base + ((ch.charCodeAt(0) - base + 13) % 26))
  })
}

export function vigenere(input: string, key: string, decode = false): string {
  const letters = key.toLowerCase().replace(/[^a-z]/g, '')
  if (!letters) throw new Error('The key needs at least one letter.')
  let index = 0
  return [...input]
    .map((ch) => {
      const lower = ch.toLowerCase()
      if (lower < 'a' || lower > 'z') return ch
      const shift = letters.charCodeAt(index % letters.length) - 97
      index += 1
      const base = ch === lower ? 97 : 65
      const code = lower.charCodeAt(0) - 97
      const next = decode ? (code - shift + 26) % 26 : (code + shift) % 26
      return String.fromCharCode(base + next)
    })
    .join('')
}

/** Letters become codes. Words are separated by ` / `. */
export function morseEncode(input: string): string {
  const words = input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      [...word]
        .filter((ch) => MORSE[ch])
        .map((ch) => MORSE[ch])
        .join(' '),
    )
    .filter(Boolean)
  if (!words.length) throw new Error('Nothing in that text has a Morse code.')
  return words.join(' / ')
}

export function morseDecode(input: string): string {
  const words = input
    .trim()
    .split('/')
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => {
          const letter = FROM_MORSE.get(code)
          if (!letter) throw new Error(`“${code}” is not a Morse letter.`)
          return letter
        })
        .join(''),
    )
  return words.join(' ').trim()
}

/** Unit lengths for a beep: dot 1, dash 3, gap inside a letter 1, between letters 3, between words 7. */
export function morseUnits(code: string): number[] {
  const units: number[] = []
  const words = code.split('/')
  words.forEach((word, wordIndex) => {
    const letters = word.trim().split(/\s+/).filter(Boolean)
    letters.forEach((letter, letterIndex) => {
      ;[...letter].forEach((mark, markIndex) => {
        if (mark !== '.' && mark !== '-') return
        units.push(mark === '.' ? 1 : 3)
        if (markIndex < letter.length - 1) units.push(-1)
      })
      if (letterIndex < letters.length - 1) units.push(-3)
    })
    if (wordIndex < words.length - 1) units.push(-7)
  })
  return units
}

export type UrlParts = {
  href: string
  protocol: string
  host: string
  pathname: string
  search: string
  hash: string
  params: { key: string; value: string }[]
}

export function parseUrlParts(input: string): UrlParts {
  const raw = input.trim()
  if (!raw) throw new Error('Paste a URL.')
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    url = new URL(`https://${raw}`)
  }
  return {
    href: url.href,
    protocol: url.protocol,
    host: url.host,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    params: [...url.searchParams.entries()].map(([key, value]) => ({ key, value })),
  }
}
