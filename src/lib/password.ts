export const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
} as const

export type CharsetKey = keyof typeof CHARSETS

const AMBIGUOUS = new Set('0O1lI|`\'"S5B8Z2')

export type PasswordOptions = {
  length: number
  sets: CharsetKey[]
  excludeAmbiguous?: boolean
  requireEachSet?: boolean
}

/** Unbiased random integer in [0, max) using rejection sampling. */
function randomInt(max: number): number {
  if (max <= 1) return 0
  // A single byte only covers max <= 256; beyond that the rejection window
  // collapses to zero and the loop never terminates. Widen to 32 bits.
  if (max > 256) {
    const limit = 2 ** 32 - ((2 ** 32) % max)
    const wide = new Uint32Array(1)
    for (;;) {
      crypto.getRandomValues(wide)
      if (wide[0] < limit) return wide[0] % max
    }
  }
  const range = 256 - (256 % max)
  const buf = new Uint8Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < range) return buf[0] % max
  }
}

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)]
}

export function buildAlphabet(sets: CharsetKey[], excludeAmbiguous?: boolean): string {
  let alphabet = sets.map((key) => CHARSETS[key]).join('')
  if (excludeAmbiguous) alphabet = [...alphabet].filter((ch) => !AMBIGUOUS.has(ch)).join('')
  return alphabet
}

export function generatePassword(options: PasswordOptions): string {
  const sets = options.sets.length ? options.sets : (['lower'] as CharsetKey[])
  const alphabet = buildAlphabet(sets, options.excludeAmbiguous)
  if (!alphabet.length) throw new Error('No characters available with these options.')
  const chars: string[] = []
  for (let i = 0; i < options.length; i += 1) chars.push(pick(alphabet))

  if (options.requireEachSet && options.length >= sets.length) {
    // Overwrite random distinct positions with one char from each required set.
    const positions = new Set<number>()
    while (positions.size < sets.length) positions.add(randomInt(options.length))
    const posList = [...positions]
    sets.forEach((key, i) => {
      const setAlphabet = buildAlphabet([key], options.excludeAmbiguous) || CHARSETS[key]
      chars[posList[i]] = pick(setAlphabet)
    })
  }
  return chars.join('')
}

export function entropyBits(length: number, alphabetSize: number): number {
  if (alphabetSize <= 1 || length <= 0) return 0
  return length * Math.log2(alphabetSize)
}

export type Strength = { bits: number; score: 0 | 1 | 2 | 3 | 4; label: string }

export function scoreStrength(bits: number): Strength {
  if (bits < 40) return { bits, score: 0, label: 'Very weak' }
  if (bits < 60) return { bits, score: 1, label: 'Weak' }
  if (bits < 80) return { bits, score: 2, label: 'Fair' }
  if (bits < 110) return { bits, score: 3, label: 'Strong' }
  return { bits, score: 4, label: 'Excellent' }
}

export function generateHexToken(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateBase64UrlToken(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...buf)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export function generateUuid(): string {
  return crypto.randomUUID()
}

/** PIN of given length, digits only. */
export function generatePin(length: number): string {
  let out = ''
  for (let i = 0; i < length; i += 1) out += String(randomInt(10))
  return out
}
