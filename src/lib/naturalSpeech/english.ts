const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** Whole numbers as words, so the voice reads "2026" instead of the digits. */
export function englishCardinal(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n)
  if (n < 20) return ONES[n] ?? String(n)
  if (n < 100) {
    const tens = TENS[Math.floor(n / 10)]
    return n % 10 ? `${tens} ${ONES[n % 10]}` : tens
  }
  if (n < 1000) {
    const rest = n % 100
    return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` ${englishCardinal(rest)}` : ''}`
  }
  const scales: Array<[number, string]> = [
    [1_000_000_000, 'billion'],
    [1_000_000, 'million'],
    [1000, 'thousand'],
  ]
  for (const [div, name] of scales) {
    if (n >= div) {
      const rest = n % div
      return `${englishCardinal(Math.floor(n / div))} ${name}${rest ? ` ${englishCardinal(rest)}` : ''}`
    }
  }
  return String(n)
}

function speakDigits(digits: string): string {
  if (digits.length >= 10) return [...digits].map((d) => ONES[Number(d)]).join(' ')
  const n = Number(digits)
  if (!Number.isSafeInteger(n)) return [...digits].map((d) => ONES[Number(d)]).join(' ')
  return englishCardinal(n)
}

function speakNumber(raw: string): string {
  if (!raw.includes('.')) return speakDigits(raw)
  const [whole, frac] = raw.split('.')
  const points = [...frac].map((d) => ONES[Number(d)]).join(' ')
  return `${speakDigits(whole)} point ${points}`
}

export type DictionaryEntry = string | Record<string, string | null>

function dictionaryHit(dict: Record<string, DictionaryEntry> | undefined, word: string): string | null {
  if (!dict) return null
  const raw = dict[word] ?? dict[word.toLowerCase()]
  if (typeof raw === 'string') return raw || null
  if (raw && typeof raw === 'object') {
    const value = raw.DEFAULT
    return typeof value === 'string' && value ? value : null
  }
  return null
}

function startsWithVowel(word: string | null): boolean {
  if (!word) return false
  return /^[aeiou]/i.test(word.replace(/^[^A-Za-z]+/, ''))
}

/**
 * Misaki's English dictionary, which is the spelling Paradee's English voices
 * learned. A few function words are stored in their stressed form; the
 * unstressed one is what running speech uses.
 */
export function englishWord(
  gold: Record<string, DictionaryEntry>,
  silver: Record<string, DictionaryEntry> | null,
  word: string,
  next: string | null,
): string | null {
  const lower = word.toLowerCase()
  if (lower === 'a') return 'ɐ'
  if (lower === 'an') return 'ɐn'
  if (lower === 'the') return startsWithVowel(next) ? 'ði' : 'ðə'
  if (lower === 'to') {
    if (next == null) return dictionaryHit(gold, 'to') ?? 'tu'
    return startsWithVowel(next) ? 'tʊ' : 'tə'
  }
  return dictionaryHit(gold, word) ?? dictionaryHit(silver ?? undefined, word)
}

/**
 * Turn numerals into words before English phonemization. A long digit string
 * (a phone number, an id) is read one digit at a time.
 */
export function expandEnglishNumbers(text: string): string {
  const collapsed = text.replace(/(\d),(?=\d)/g, '$1')
  return collapsed.replace(/(\d+(?:\.\d+)?)(\s?%)?/g, (match, num: string, pct: string | undefined, offset: number) => {
    const spoken = speakNumber(num) + (pct ? ' percent' : '')
    const before = offset > 0 ? collapsed[offset - 1] : ''
    const after = collapsed[offset + match.length] ?? ''
    const padBefore = before && /\p{L}/u.test(before) ? ' ' : ''
    const padAfter = after && /\p{L}/u.test(after) ? ' ' : ''
    return `${padBefore}${spoken}${padAfter}`
  })
}
