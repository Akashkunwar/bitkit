export type WordScale = 'indian' | 'international'

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function underThousand(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) {
    const rest = n % 10
    return TENS[Math.floor(n / 10)] + (rest ? `-${ONES[rest]}` : '')
  }
  const rest = n % 100
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${underThousand(rest)}` : ''}`
}

/** Indian grouping: thousand, lakh, crore, then crore stacks (arab is written as hundred crore). */
function indianWords(n: number): string {
  if (n === 0) return 'zero'
  const parts: string[] = []
  const crore = Math.floor(n / 10_000_000)
  const lakh = Math.floor((n % 10_000_000) / 100_000)
  const thousand = Math.floor((n % 100_000) / 1000)
  const rest = n % 1000

  if (crore) parts.push(`${crore > 99 ? indianWords(crore) : underThousand(crore)} crore`)
  if (lakh) parts.push(`${underThousand(lakh)} lakh`)
  if (thousand) parts.push(`${underThousand(thousand)} thousand`)
  if (rest) parts.push(rest < 100 && parts.length ? `and ${underThousand(rest)}` : underThousand(rest))
  return parts.join(' ')
}

const SHORT_SCALE = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion']

function internationalWords(n: number): string {
  if (n === 0) return 'zero'
  const groups: number[] = []
  let rest = n
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const value = groups[i]
    if (!value) continue
    const scale = SHORT_SCALE[i] ? ` ${SHORT_SCALE[i]}` : ''
    const lead = i === 0 && value < 100 && parts.length ? 'and ' : ''
    parts.push(`${lead}${underThousand(value)}${scale}`)
  }
  return parts.join(' ')
}

export function integerToWords(n: number, scale: WordScale = 'indian'): string {
  if (!Number.isFinite(n)) throw new Error('That is not a number.')
  const whole = Math.abs(Math.trunc(n))
  if (whole > Number.MAX_SAFE_INTEGER) throw new Error('That number is too large to spell out exactly.')
  const words = scale === 'indian' ? indianWords(whole) : internationalWords(whole)
  return n < 0 ? `minus ${words}` : words
}

export type MoneyOptions = {
  scale?: WordScale
  /** e.g. "rupees" / "paise", "dollars" / "cents". */
  major?: string
  minor?: string
  /** Adds the "Only" that cheques and invoices expect. */
  chequeStyle?: boolean
}

export function amountToWords(value: number, options: MoneyOptions = {}): string {
  const { scale = 'indian', major = 'rupees', minor = 'paise', chequeStyle = true } = options
  if (!Number.isFinite(value)) throw new Error('That is not a number.')
  const negative = value < 0
  const abs = Math.abs(value)
  const whole = Math.trunc(abs)
  // Rounded to two places first, so 1.005 does not become "zero paise".
  const fraction = Math.round((abs - whole) * 100)
  // Rounding can carry into the whole part (e.g. 1.999 -> 2 and 00).
  const carried = fraction === 100
  const wholeFinal = carried ? whole + 1 : whole
  const fractionFinal = carried ? 0 : fraction

  const parts = [`${integerToWords(wholeFinal, scale)} ${major}`]
  if (fractionFinal) parts.push(`and ${integerToWords(fractionFinal, scale)} ${minor}`)
  let out = parts.join(' ')
  if (chequeStyle) out += ' only'
  if (negative) out = `minus ${out}`
  return out
}

export function titleCase(input: string): string {
  return input.replace(/(^|[\s-])([a-z])/g, (_m, lead: string, ch: string) => lead + ch.toUpperCase())
}

/** Digit grouping: 12,34,567 for the Indian scale, 1,234,567 otherwise. */
export function groupDigits(value: number, scale: WordScale = 'indian'): string {
  const negative = value < 0
  const [whole, decimals] = Math.abs(value).toFixed(2).split('.')
  let grouped: string
  if (scale === 'indian') {
    const last3 = whole.slice(-3)
    const rest = whole.slice(0, -3)
    grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3
  } else {
    grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  const out = decimals === '00' ? grouped : `${grouped}.${decimals}`
  return negative ? `-${out}` : out
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', major: 'rupees', minor: 'paise', scale: 'indian' as WordScale },
  { code: 'USD', symbol: '$', major: 'dollars', minor: 'cents', scale: 'international' as WordScale },
  { code: 'EUR', symbol: '€', major: 'euros', minor: 'cents', scale: 'international' as WordScale },
  { code: 'GBP', symbol: '£', major: 'pounds', minor: 'pence', scale: 'international' as WordScale },
  { code: 'AED', symbol: 'د.إ', major: 'dirhams', minor: 'fils', scale: 'international' as WordScale },
]
