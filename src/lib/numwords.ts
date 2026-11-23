export type WordScale = 'indian' | 'international'

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

const HINDI = [
  'शून्य',
  'एक',
  'दो',
  'तीन',
  'चार',
  'पाँच',
  'छह',
  'सात',
  'आठ',
  'नौ',
  'दस',
  'ग्यारह',
  'बारह',
  'तेरह',
  'चौदह',
  'पंद्रह',
  'सोलह',
  'सत्रह',
  'अठारह',
  'उन्नीस',
  'बीस',
  'इक्कीस',
  'बाईस',
  'तेईस',
  'चौबीस',
  'पच्चीस',
  'छब्बीस',
  'सत्ताईस',
  'अट्ठाईस',
  'उनतीस',
  'तीस',
  'इकतीस',
  'बत्तीस',
  'तैंतीस',
  'चौंतीस',
  'पैंतीस',
  'छत्तीस',
  'सैंतीस',
  'अड़तीस',
  'उनतालीस',
  'चालीस',
  'इकतालीस',
  'बयालीस',
  'तैंतालीस',
  'चौवालीस',
  'पैंतालीस',
  'छियालीस',
  'सैंतालीस',
  'अड़तालीस',
  'उनचास',
  'पचास',
  'इक्यावन',
  'बावन',
  'तिरपन',
  'चौवन',
  'पचपन',
  'छप्पन',
  'सत्तावन',
  'अट्ठावन',
  'उनसठ',
  'साठ',
  'इकसठ',
  'बासठ',
  'तिरसठ',
  'चौंसठ',
  'पैंसठ',
  'छियासठ',
  'सड़सठ',
  'अड़सठ',
  'उनहत्तर',
  'सत्तर',
  'इकहत्तर',
  'बहत्तर',
  'तिहत्तर',
  'चौहत्तर',
  'पचहत्तर',
  'छिहत्तर',
  'सतहत्तर',
  'अठहत्तर',
  'उन्यासी',
  'अस्सी',
  'इक्यासी',
  'बयासी',
  'तिरासी',
  'चौरासी',
  'पचासी',
  'छियासी',
  'सत्तासी',
  'अट्ठासी',
  'नवासी',
  'नब्बे',
  'इक्यानवे',
  'बानवे',
  'तिरानवे',
  'चौरानवे',
  'पंचानवे',
  'छियानवे',
  'सत्तानवे',
  'अट्ठानवे',
  'निन्यानवे',
]

function hindiBelowThousand(n: number): string {
  if (n < 100) return HINDI[n]
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  const head = `${HINDI[hundred]} सौ`
  return rest ? `${head} ${HINDI[rest]}` : head
}

function hindiIndian(n: number): string {
  if (n === 0) return HINDI[0]
  const parts: string[] = []
  const crore = Math.floor(n / 10_000_000)
  const lakh = Math.floor((n % 10_000_000) / 100_000)
  const thousand = Math.floor((n % 100_000) / 1000)
  const rest = n % 1000
  if (crore) parts.push(`${crore > 99 ? hindiIndian(crore) : hindiBelowThousand(crore)} करोड़`)
  if (lakh) parts.push(`${hindiBelowThousand(lakh)} लाख`)
  if (thousand) parts.push(`${hindiBelowThousand(thousand)} हज़ार`)
  if (rest) parts.push(hindiBelowThousand(rest))
  return parts.join(' ')
}

export type WordLanguage = 'en' | 'hi'

export function integerToWords(n: number, scale: WordScale = 'indian', language: WordLanguage = 'en'): string {
  if (!Number.isFinite(n)) throw new Error('That is not a number.')
  const whole = Math.abs(Math.trunc(n))
  if (whole > Number.MAX_SAFE_INTEGER) throw new Error('That number is too large to spell out exactly.')
  const words =
    language === 'hi'
      ? scale === 'indian'
        ? hindiIndian(whole)
        : internationalWords(whole)
      : scale === 'indian'
        ? indianWords(whole)
        : internationalWords(whole)
  if (language === 'hi' && n < 0) return `ऋण ${words}`
  return n < 0 ? `minus ${words}` : words
}

export type MoneyOptions = {
  scale?: WordScale
  language?: WordLanguage
  /** e.g. "rupees" / "paise", "dollars" / "cents". */
  major?: string
  minor?: string
  /** Adds the "Only" that cheques and invoices expect. */
  chequeStyle?: boolean
}

export function amountToWords(value: number, options: MoneyOptions = {}): string {
  const { scale = 'indian', language = 'en', major = 'rupees', minor = 'paise', chequeStyle = true } = options
  const majorWord = language === 'hi' && major === 'rupees' ? 'रुपये' : major
  const minorWord = language === 'hi' && minor === 'paise' ? 'पैसे' : minor
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

  const parts = [`${integerToWords(wholeFinal, scale, language)} ${majorWord}`]
  if (fractionFinal) {
    const join = language === 'hi' ? 'और' : 'and'
    parts.push(`${join} ${integerToWords(fractionFinal, scale, language)} ${minorWord}`)
  }
  let out = parts.join(' ')
  if (chequeStyle) out += language === 'hi' ? ' मात्र' : ' only'
  if (negative) out = language === 'hi' ? `ऋण ${out}` : `minus ${out}`
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
