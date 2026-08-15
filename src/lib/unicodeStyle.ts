/**
 * Styles text by swapping letters for their Mathematical Alphanumeric Symbols
 * equivalents. Nothing here is real formatting — it is substitute characters,
 * which is why it survives in places that strip markup (social bios, usernames).
 *
 * The cost is real: screen readers announce these badly or not at all, and
 * search will not match them. Warn rather than hide that.
 */

export type StyleId =
  | 'bold'
  | 'italic'
  | 'boldItalic'
  | 'script'
  | 'scriptBold'
  | 'fraktur'
  | 'doubleStruck'
  | 'sansBold'
  | 'sansItalic'
  | 'mono'
  | 'circled'
  | 'squared'
  | 'fullwidth'
  | 'smallCaps'
  | 'upsideDown'
  | 'strike'
  | 'underline'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'

/** Base code points for [A, a, 0]; null means that range has no mapping. */
type Ranges = { upper: number | null; lower: number | null; digit: number | null }

const RANGES: Partial<Record<StyleId, Ranges>> = {
  bold: { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
  italic: { upper: 0x1d434, lower: 0x1d44e, digit: null },
  boldItalic: { upper: 0x1d468, lower: 0x1d482, digit: null },
  script: { upper: 0x1d49c, lower: 0x1d4b6, digit: null },
  scriptBold: { upper: 0x1d4d0, lower: 0x1d4ea, digit: null },
  fraktur: { upper: 0x1d504, lower: 0x1d51e, digit: null },
  doubleStruck: { upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8 },
  sansBold: { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  sansItalic: { upper: 0x1d608, lower: 0x1d622, digit: null },
  mono: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
  fullwidth: { upper: 0xff21, lower: 0xff41, digit: 0xff10 },
  circled: { upper: 0x24b6, lower: 0x24d0, digit: null },
  squared: { upper: 0x1f130, lower: 0x1f130, digit: null },
}

/**
 * Several letters are "holes" in the maths blocks — Unicode had already
 * encoded them elsewhere as letterlike symbols. Without these the output
 * shows replacement boxes.
 */
const HOLES: Partial<Record<StyleId, Record<string, string>>> = {
  script: {
    B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ',
    M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ',
  },
  fraktur: {
    C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ',
  },
  doubleStruck: {
    C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ',
  },
  italic: { h: 'ℎ' },
}

const SMALL_CAPS: Record<string, string> = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ',
  h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ',
  o: 'ᴏ', p: 'ᴘ', q: 'q', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ',
  v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
}

const UPSIDE_DOWN: Record<string, string> = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ',
  i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b',
  r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
  '.': '˙', ',': "'", "'": ',', '"': '„', '?': '¿', '!': '¡',
  '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '&': '⅋',
  '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9',
  '7': 'ㄥ', '8': '8', '9': '6', '0': '0', '_': '‾',
}

const COMBINING: Partial<Record<StyleId, string>> = {
  strike: '\u0336',
  underline: '\u0332',
}

export const STYLES: { id: StyleId; label: string; sample: string }[] = [
  { id: 'bold', label: 'Bold', sample: 'Bold' },
  { id: 'italic', label: 'Italic', sample: 'Italic' },
  { id: 'boldItalic', label: 'Bold italic', sample: 'Bold italic' },
  { id: 'sansBold', label: 'Sans bold', sample: 'Sans bold' },
  { id: 'sansItalic', label: 'Sans italic', sample: 'Sans italic' },
  { id: 'script', label: 'Script', sample: 'Script' },
  { id: 'scriptBold', label: 'Script bold', sample: 'Script bold' },
  { id: 'fraktur', label: 'Fraktur', sample: 'Fraktur' },
  { id: 'doubleStruck', label: 'Double struck', sample: 'Double struck' },
  { id: 'mono', label: 'Monospace', sample: 'Monospace' },
  { id: 'fullwidth', label: 'Fullwidth', sample: 'Fullwidth' },
  { id: 'circled', label: 'Circled', sample: 'Circled' },
  { id: 'squared', label: 'Squared', sample: 'Squared' },
  { id: 'smallCaps', label: 'Small caps', sample: 'Small caps' },
  { id: 'upsideDown', label: 'Upside down', sample: 'Upside down' },
  { id: 'strike', label: 'Strikethrough', sample: 'Strikethrough' },
  { id: 'underline', label: 'Underline', sample: 'Underline' },
]

function mapChar(ch: string, style: StyleId): string {
  const hole = HOLES[style]?.[ch]
  if (hole) return hole

  if (style === 'smallCaps') return SMALL_CAPS[ch.toLowerCase()] ?? ch
  if (style === 'upsideDown') return UPSIDE_DOWN[ch.toLowerCase()] ?? ch

  const range = RANGES[style]
  if (!range) return ch

  const upperIndex = UPPER.indexOf(ch)
  if (upperIndex >= 0 && range.upper != null) return String.fromCodePoint(range.upper + upperIndex)

  const lowerIndex = LOWER.indexOf(ch)
  if (lowerIndex >= 0 && range.lower != null) {
    // Squared has only one case; fold lowercase up to it.
    return String.fromCodePoint(range.lower + lowerIndex)
  }

  const digitIndex = DIGITS.indexOf(ch)
  if (digitIndex >= 0 && range.digit != null) return String.fromCodePoint(range.digit + digitIndex)

  return ch
}

export function applyStyle(input: string, style: StyleId): string {
  const combining = COMBINING[style]
  if (combining) {
    // A combining mark attaches to the character before it, so it goes after.
    return [...input].map((ch) => (ch === ' ' ? ch : ch + combining)).join('')
  }
  const chars = [...input]
  const mapped = chars.map((ch) => mapChar(ch, style))
  if (style === 'upsideDown') return mapped.reverse().join('')
  return mapped.join('')
}

/** Strips styling back to plain ASCII, including combining marks. */
export function toPlain(input: string): string {
  let out = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const decode = (base: number, alphabet: string) => {
    for (let i = 0; i < alphabet.length; i += 1) {
      out = out.replaceAll(String.fromCodePoint(base + i), alphabet[i])
    }
  }
  for (const range of Object.values(RANGES)) {
    if (range.upper != null) decode(range.upper, UPPER)
    if (range.lower != null) decode(range.lower, LOWER)
    if (range.digit != null) decode(range.digit, DIGITS)
  }
  for (const [plain, styled] of Object.entries(SMALL_CAPS)) out = out.replaceAll(styled, plain)
  return out
}
