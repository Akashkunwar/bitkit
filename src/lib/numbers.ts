export type Base = 2 | 8 | 10 | 16

export const BASES: { value: Base; label: string; prefix: string }[] = [
  { value: 2, label: 'Binary', prefix: '0b' },
  { value: 8, label: 'Octal', prefix: '0o' },
  { value: 10, label: 'Decimal', prefix: '' },
  { value: 16, label: 'Hex', prefix: '0x' },
]

const DIGITS: Record<Base, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^\d+$/,
  16: /^[0-9a-fA-F]+$/,
}

/** Parses a value in the given base, tolerating prefixes, separators, and sign. */
export function parseInBase(input: string, base: Base): bigint | null {
  let text = input.trim().replaceAll('_', '').replaceAll(' ', '')
  if (!text) return null
  let negative = false
  if (text.startsWith('-')) {
    negative = true
    text = text.slice(1)
  }
  const prefix = { 2: '0b', 8: '0o', 10: '', 16: '0x' }[base]
  if (prefix && text.toLowerCase().startsWith(prefix)) text = text.slice(prefix.length)
  if (!text || !DIGITS[base].test(text)) return null
  try {
    // BigInt understands 0b/0o/0x literals, which covers every base but ten.
    const value = BigInt(`${prefix}${text}`)
    return negative ? -value : value
  } catch {
    return null
  }
}

export function toBase(value: bigint, base: Base, group = true): string {
  const negative = value < 0n
  const text = (negative ? -value : value).toString(base)
  const grouped = group ? groupDigits(text, base) : text
  return negative ? `-${grouped}` : grouped
}

function groupDigits(text: string, base: Base): string {
  const size = base === 2 ? 4 : base === 16 ? 4 : 3
  if (base === 10) {
    return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  const chunks: string[] = []
  for (let i = text.length; i > 0; i -= size) chunks.unshift(text.slice(Math.max(0, i - size), i))
  return chunks.join(' ')
}

export type BitWidth = 8 | 16 | 32 | 64

export const BIT_WIDTHS: BitWidth[] = [8, 16, 32, 64]

function mask(width: BitWidth): bigint {
  return (1n << BigInt(width)) - 1n
}

/** Wraps a value into an unsigned field of the given width. */
export function wrap(value: bigint, width: BitWidth): bigint {
  return ((value % (1n << BigInt(width))) + (1n << BigInt(width))) % (1n << BigInt(width))
}

/** Reads an unsigned field as a two's-complement signed integer. */
export function asSigned(value: bigint, width: BitWidth): bigint {
  const wrapped = wrap(value, width)
  const half = 1n << BigInt(width - 1)
  return wrapped >= half ? wrapped - (1n << BigInt(width)) : wrapped
}

export type BitOp = 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr' | 'ushr'

export const BIT_OPS: { value: BitOp; label: string; unary?: boolean }[] = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
  { value: 'xor', label: 'XOR' },
  { value: 'not', label: 'NOT', unary: true },
  { value: 'shl', label: 'Shift left' },
  { value: 'shr', label: 'Shift right (arithmetic)' },
  { value: 'ushr', label: 'Shift right (logical)' },
]

export function applyBitOp(a: bigint, b: bigint, op: BitOp, width: BitWidth): bigint {
  const x = wrap(a, width)
  const y = wrap(b, width)
  switch (op) {
    case 'and':
      return wrap(x & y, width)
    case 'or':
      return wrap(x | y, width)
    case 'xor':
      return wrap(x ^ y, width)
    case 'not':
      return wrap(~x & mask(width), width)
    case 'shl':
      return wrap(x << y, width)
    case 'shr':
      // Arithmetic shift preserves the sign bit, so operate on the signed view.
      return wrap(asSigned(x, width) >> y, width)
    case 'ushr':
      return wrap(x >> y, width)
  }
}

/** Bits as booleans, most significant first. */
export function bitsOf(value: bigint, width: BitWidth): boolean[] {
  const wrapped = wrap(value, width)
  const out: boolean[] = []
  for (let i = width - 1; i >= 0; i -= 1) out.push(((wrapped >> BigInt(i)) & 1n) === 1n)
  return out
}

export function popcount(value: bigint, width: BitWidth): number {
  return bitsOf(value, width).filter(Boolean).length
}

export function toggleBit(value: bigint, index: number, width: BitWidth): bigint {
  return wrap(wrap(value, width) ^ (1n << BigInt(index)), width)
}

/** Bytes of the value, most significant first, for endianness display. */
export function bytesOf(value: bigint, width: BitWidth): string[] {
  const wrapped = wrap(value, width)
  const out: string[] = []
  for (let i = width / 8 - 1; i >= 0; i -= 1) {
    out.push(((wrapped >> BigInt(i * 8)) & 0xffn).toString(16).padStart(2, '0'))
  }
  return out
}
