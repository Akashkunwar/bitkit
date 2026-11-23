/**
 * Small text transforms for the text bench: bionic reading, repeat,
 * character reverse, binary, character codes, and an IPv4 address as bits.
 */

export type BionicPiece = { text: string; bold: boolean }

const WORD = /[\p{L}\p{N}]+/gu

/** How many characters of a word carry the fixation mark. */
export function fixationLength(word: string): number {
  const n = [...word].length
  if (n <= 1) return n
  if (n <= 3) return 1
  if (n <= 5) return 2
  return Math.ceil(n * 0.4)
}

/** Split text into bold fixation marks and the rest of each word. */
export function bionicPieces(input: string): BionicPiece[] {
  const pieces: BionicPiece[] = []
  let last = 0
  for (const match of input.matchAll(WORD)) {
    const index = match.index ?? 0
    if (index > last) pieces.push({ text: input.slice(last, index), bold: false })
    const chars = [...match[0]]
    const cut = fixationLength(match[0])
    pieces.push({ text: chars.slice(0, cut).join(''), bold: true })
    const rest = chars.slice(cut).join('')
    if (rest) pieces.push({ text: rest, bold: false })
    last = index + match[0].length
  }
  if (last < input.length) pieces.push({ text: input.slice(last), bold: false })
  return pieces
}

export function repeatText(input: string, times: number, separator = ''): string {
  const n = Math.min(200, Math.max(0, Math.floor(times)))
  return Array.from({ length: n }, () => input).join(separator)
}

export function reverseText(input: string): string {
  return [...input].reverse().join('')
}

export function textToBinary(input: string): string {
  return [...new TextEncoder().encode(input)].map((byte) => byte.toString(2).padStart(8, '0')).join(' ')
}

export function binaryToText(input: string): string {
  const bits = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  if (!bits.length) return ''
  if (bits.some((bit) => !/^[01]{1,8}$/.test(bit))) {
    throw new Error('Binary needs groups of up to 8 bits, separated by spaces.')
  }
  return new TextDecoder().decode(Uint8Array.from(bits.map((bit) => Number.parseInt(bit, 2))))
}

export function textToCodes(input: string): string {
  return [...input].map((ch) => ch.codePointAt(0) ?? 0).join(' ')
}

export function codesToText(input: string): string {
  const parts = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  if (!parts.length) return ''
  const codes = parts.map((part) => {
    const n = Number(part)
    if (!Number.isInteger(n) || n < 0 || n > 0x10ffff) {
      throw new Error(`“${part}” is not a character code.`)
    }
    return n
  })
  return String.fromCodePoint(...codes)
}

/** An IPv4 address as four groups of 8 bits. */
export function ipv4ToBinary(input: string): string {
  const parts = input.trim().split('.')
  if (parts.length !== 4) throw new Error('Enter an IPv4 address like 192.168.0.1.')
  return parts
    .map((part) => {
      if (!/^\d{1,3}$/.test(part)) throw new Error('Each part of the address must be 0–255.')
      const n = Number(part)
      if (n > 255) throw new Error('Each part of the address must be 0–255.')
      return n.toString(2).padStart(8, '0')
    })
    .join('.')
}
