/**
 * 1D barcode encoders: Code 128, EAN-13, EAN-8, UPC-A, and Code 39.
 *
 * Each encoder returns the symbol as a run of module widths starting with a
 * bar (bar, space, bar, …), which draws identically as SVG or on a canvas.
 * Tests decode every symbology with ZXing, so a typo in a pattern table
 * fails the build instead of printing an unscannable label.
 */

export type Symbology = 'code128' | 'ean13' | 'ean8' | 'upca' | 'code39'

export type Encoded = {
  /** Alternating bar and space widths in modules, starting with a bar. */
  widths: number[]
  /** Human-readable text printed under the bars. */
  text: string
}

export class BarcodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BarcodeError'
  }
}

// ---------- Code 128 ----------

/** Bar/space widths for values 0–106; each symbol is 11 modules, stop is 13. */
export const CODE128 = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
]

const START_B = 104
const START_C = 105
const TO_B = 100
const TO_C = 99
const STOP = 106

/** Length of the run of digits starting at `i`. */
function digitRun(value: string, i: number): number {
  let n = 0
  while (i + n < value.length && value.charCodeAt(i + n) >= 48 && value.charCodeAt(i + n) <= 57) n += 1
  return n
}

/**
 * Code 128 values for `value`, switching to subset C for runs of four or
 * more digits (two digits per symbol) and subset B for everything else.
 */
export function code128Values(value: string): number[] {
  if (!value) throw new BarcodeError('Enter some text to encode.')
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code < 32 || code > 126)
      throw new BarcodeError(`Code 128 cannot encode “${ch}”. Use plain ASCII letters, digits, and symbols.`)
  }
  const values: number[] = []
  let i = 0
  const leadRun = digitRun(value, 0)
  let subset: 'B' | 'C' = leadRun >= 4 ? 'C' : 'B'
  values.push(subset === 'C' ? START_C : START_B)
  while (i < value.length) {
    const run = digitRun(value, i)
    if (subset === 'C') {
      if (run >= 2) {
        values.push(Number(value.slice(i, i + 2)))
        i += 2
        continue
      }
      values.push(TO_B)
      subset = 'B'
      continue
    }
    // Worth switching to C for an even run of 4+, or a run of 4+ that ends the value.
    if (run >= 4 && (run % 2 === 0 || i + run === value.length)) {
      if (run % 2 === 1) {
        values.push(value.charCodeAt(i) - 32)
        i += 1
      }
      values.push(TO_C)
      subset = 'C'
      continue
    }
    values.push(value.charCodeAt(i) - 32)
    i += 1
  }
  const checksum = values.reduce((sum, v, index) => sum + v * (index === 0 ? 1 : index), 0) % 103
  values.push(checksum, STOP)
  return values
}

function encodeCode128(value: string): Encoded {
  const widths = code128Values(value).flatMap((v) => [...CODE128[v]].map(Number))
  return { widths, text: value }
}

// ---------- EAN / UPC ----------

const EAN_L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
]
const EAN_G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
]
const EAN_R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
]
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

/**
 * GS1 check digit: weights alternate 3, 1 from the rightmost data digit.
 * Covers EAN-13, EAN-8, and UPC-A with one rule.
 */
export function gs1CheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < digits.length; i += 1) {
    const fromRight = digits.length - 1 - i
    sum += Number(digits[i]) * (fromRight % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

/** Accepts the data digits alone (check digit computed) or with a check digit (verified). */
function withCheckDigit(input: string, dataLength: number, name: string): string {
  const digits = input.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(digits)) throw new BarcodeError(`${name} takes digits only.`)
  if (digits.length === dataLength) return digits + gs1CheckDigit(digits)
  if (digits.length === dataLength + 1) {
    const expected = gs1CheckDigit(digits.slice(0, dataLength))
    if (Number(digits[dataLength]) !== expected) {
      throw new BarcodeError(`The check digit should be ${expected}, not ${digits[dataLength]}.`)
    }
    return digits
  }
  throw new BarcodeError(`${name} needs ${dataLength} digits (or ${dataLength + 1} with the check digit).`)
}

/** Converts a bit string ("1011…") into alternating run widths starting with a bar. */
export function bitsToWidths(bits: string): number[] {
  const widths: number[] = []
  let current = bits[0]
  let run = 0
  if (current !== '1') throw new BarcodeError('A symbol must start with a bar.')
  for (const bit of bits) {
    if (bit === current) run += 1
    else {
      widths.push(run)
      current = bit
      run = 1
    }
  }
  widths.push(run)
  return widths
}

function encodeEan13(input: string): Encoded {
  const digits = withCheckDigit(input, 12, 'EAN-13')
  const parity = EAN_PARITY[Number(digits[0])]
  let bits = '101'
  for (let i = 1; i <= 6; i += 1) {
    const d = Number(digits[i])
    bits += parity[i - 1] === 'L' ? EAN_L[d] : EAN_G[d]
  }
  bits += '01010'
  for (let i = 7; i <= 12; i += 1) bits += EAN_R[Number(digits[i])]
  bits += '101'
  return { widths: bitsToWidths(bits), text: digits }
}

function encodeEan8(input: string): Encoded {
  const digits = withCheckDigit(input, 7, 'EAN-8')
  let bits = '101'
  for (let i = 0; i < 4; i += 1) bits += EAN_L[Number(digits[i])]
  bits += '01010'
  for (let i = 4; i < 8; i += 1) bits += EAN_R[Number(digits[i])]
  bits += '101'
  return { widths: bitsToWidths(bits), text: digits }
}

function encodeUpcA(input: string): Encoded {
  const digits = withCheckDigit(input, 11, 'UPC-A')
  // UPC-A is EAN-13 with a leading zero, which selects all-L parity.
  const ean = encodeEan13(`0${digits}`)
  return { widths: ean.widths, text: digits }
}

// ---------- Code 39 ----------

/** Nine elements per character (bar, space, …), n = narrow, w = wide; exactly three wide. */
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '*': 'nwnnwnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
}

export const CODE39_TABLE = CODE39

function encodeCode39(input: string): Encoded {
  const value = input.toUpperCase()
  if (!value) throw new BarcodeError('Enter some text to encode.')
  for (const ch of value) {
    if (ch === '*' || !(ch in CODE39)) {
      throw new BarcodeError(`Code 39 cannot encode “${ch}”. Use A–Z, 0–9, space, and - . $ / + %.`)
    }
  }
  const widths: number[] = []
  const wide = 3
  const chars = `*${value}*`
  ;[...chars].forEach((ch, i) => {
    for (const element of CODE39[ch]) widths.push(element === 'w' ? wide : 1)
    // Narrow inter-character gap, which is a space, so it extends the run.
    if (i < chars.length - 1) widths.push(1)
  })
  return { widths, text: value }
}

// ---------- Dispatch ----------

export const SYMBOLOGIES: { id: Symbology; label: string; hint: string; example: string }[] = [
  {
    id: 'code128',
    label: 'Code 128',
    hint: 'Any text — shipping labels, inventory, IDs.',
    example: 'BITKIT-2026-0042',
  },
  { id: 'ean13', label: 'EAN-13', hint: 'Retail products worldwide. 12 digits + check.', example: '400638133393' },
  { id: 'upca', label: 'UPC-A', hint: 'Retail products in North America. 11 digits + check.', example: '03600029145' },
  { id: 'ean8', label: 'EAN-8', hint: 'Small retail packages. 7 digits + check.', example: '9638507' },
  { id: 'code39', label: 'Code 39', hint: 'Uppercase letters and digits; older scanners.', example: 'PART-1234' },
]

export function encodeBarcode(symbology: Symbology, value: string): Encoded {
  switch (symbology) {
    case 'code128':
      return encodeCode128(value)
    case 'ean13':
      return encodeEan13(value)
    case 'ean8':
      return encodeEan8(value)
    case 'upca':
      return encodeUpcA(value)
    case 'code39':
      return encodeCode39(value)
  }
}

export type RenderOptions = {
  moduleWidth: number
  height: number
  /** Blank margin either side, in modules. EAN/UPC scanners need about 10. */
  quietZone: number
  showText: boolean
  foreground: string
  background: string
}

/** Barcode as a standalone SVG string. */
export function barcodeSvg(encoded: Encoded, options: RenderOptions): string {
  const { moduleWidth: m, height, quietZone, showText, foreground, background } = options
  const modules = encoded.widths.reduce((a, b) => a + b, 0)
  const width = (modules + quietZone * 2) * m
  const textSize = Math.max(10, Math.round(m * 9))
  const total = height + (showText ? textSize + 6 : 0)
  let x = quietZone * m
  const rects: string[] = []
  encoded.widths.forEach((w, i) => {
    if (i % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${w * m}" height="${height}"/>`)
    x += w * m
  })
  const escaped = encoded.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const label = showText
    ? `<text x="${width / 2}" y="${height + textSize + 2}" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${textSize}" letter-spacing="${m}" fill="${foreground}">${escaped}</text>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${total}" viewBox="0 0 ${width} ${total}" shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="${background}"/>` +
    `<g fill="${foreground}">${rects.join('')}</g>${label}</svg>`
  )
}
