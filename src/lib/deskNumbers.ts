import { formatQuantity, readNumber, type Formula } from './formula'

const ROMAN: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export function toRoman(value: number): string {
  const n = Math.trunc(value)
  if (n < 1 || n > 3999) throw new Error('Roman numerals here cover 1 to 3999.')
  let rest = n
  let out = ''
  for (const [amount, glyph] of ROMAN) {
    while (rest >= amount) {
      out += glyph
      rest -= amount
    }
  }
  return out
}

export function fromRoman(input: string): number {
  const text = input.trim().toUpperCase()
  if (!/^[IVXLCDM]+$/.test(text)) throw new Error('Use the letters I, V, X, L, C, D, and M.')
  let total = 0
  for (let i = 0; i < text.length; i += 1) {
    const value = ROMAN.find((row) => row[1] === text[i])?.[0]
    const next = ROMAN.find((row) => row[1] === text[i + 1])?.[0] ?? 0
    if (!value) throw new Error('Use the letters I, V, X, L, C, D, and M.')
    total += value < next ? -value : value
  }
  if (toRoman(total) !== text) throw new Error('That is not a standard Roman numeral.')
  return total
}

export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y) {
    const next = x % y
    x = y
    y = next
  }
  return x
}

export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n
  return ((a < 0n ? -a : a) / gcd(a, b)) * (b < 0n ? -b : b)
}

function parseInts(raw: string): bigint[] {
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  if (!parts.length) throw new Error('Enter at least one integer.')
  return parts.map((part) => {
    if (!/^-?\d+$/.test(part)) throw new Error(`“${part}” is not an integer.`)
    return BigInt(part)
  })
}

export function factorize(value: number): string {
  let n = Math.trunc(value)
  if (n < 2 || n > 1_000_000_000) throw new Error('Enter an integer from 2 to 1,000,000,000.')
  const factors: number[] = []
  for (let d = 2; d * d <= n; d += d === 2 ? 1 : 2) {
    while (n % d === 0) {
      factors.push(d)
      n /= d
    }
  }
  if (n > 1) factors.push(n)
  return factors.map(String).join(' × ')
}

export function factorial(value: number): string {
  const n = Math.trunc(value)
  if (n < 0 || n > 1000) throw new Error('Enter an integer from 0 to 1000.')
  let result = 1n
  for (let i = 2n; i <= BigInt(n); i += 1n) result *= i
  return result.toString()
}

export function combinations(n: number, k: number): string {
  const nn = Math.trunc(n)
  const kk = Math.trunc(k)
  if (nn < 0 || kk < 0 || nn > 1000) throw new Error('Enter n and k from 0 to 1000.')
  if (kk > nn) return '0'
  const take = Math.min(kk, nn - kk)
  let result = 1n
  for (let i = 1; i <= take; i += 1) {
    result = (result * BigInt(nn - take + i)) / BigInt(i)
  }
  return result.toString()
}

type Fraction = { n: bigint; d: bigint }

function simplify(n: bigint, d: bigint): Fraction {
  if (d === 0n) throw new Error('A fraction cannot have a denominator of zero.')
  if (d < 0n) {
    n = -n
    d = -d
  }
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}

export function parseFraction(input: string): Fraction {
  const text = input.trim()
  if (/^-?\d+$/.test(text)) return { n: BigInt(text), d: 1n }
  const mixed = /^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(text)
  if (mixed) {
    const whole = BigInt(mixed[1])
    const sign = whole < 0n ? -1n : 1n
    return simplify(whole * BigInt(mixed[3]) + sign * BigInt(mixed[2]), BigInt(mixed[3]))
  }
  const slash = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(text)
  if (!slash) throw new Error('Use a fraction like 3/4 or a mixed number like 1 1/2.')
  return simplify(BigInt(slash[1]), BigInt(slash[2]))
}

export function formatFraction(value: Fraction): string {
  const simple = simplify(value.n, value.d)
  if (simple.d === 1n) return simple.n.toString()
  return `${simple.n}/${simple.d}`
}

function applyFraction(op: string, a: Fraction, b: Fraction): Fraction {
  if (op === 'add') return simplify(a.n * b.d + b.n * a.d, a.d * b.d)
  if (op === 'sub') return simplify(a.n * b.d - b.n * a.d, a.d * b.d)
  if (op === 'mul') return simplify(a.n * b.n, a.d * b.d)
  if (op === 'div') return simplify(a.n * b.d, a.d * b.n)
  throw new Error('Choose an operation.')
}

export type Stats = {
  count: number
  sum: number
  min: number
  max: number
  mean: number
  median: number
  modes: number[]
  range: number
  pstdev: number
  sstdev: number | null
}

export function parseNumberList(input: string): number[] {
  const parts = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  if (!parts.length) throw new Error('Enter at least one number.')
  return parts.map((part) => {
    const n = Number(part)
    if (!Number.isFinite(n)) throw new Error(`“${part}” is not a number.`)
    return n
  })
}

export function describeNumbers(values: number[]): Stats {
  if (!values.length) throw new Error('Enter at least one number.')
  const sorted = [...values].sort((a, b) => a - b)
  const count = values.length
  const sum = values.reduce((total, value) => total + value, 0)
  const mean = sum / count
  const mid = Math.floor(count / 2)
  const median = count % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const freq = new Map<number, number>()
  for (const value of values) freq.set(value, (freq.get(value) ?? 0) + 1)
  const most = Math.max(...freq.values())
  const modes = most > 1 ? [...freq].filter((row) => row[1] === most).map((row) => row[0]) : []
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0)
  return {
    count,
    sum,
    min: sorted[0],
    max: sorted[count - 1],
    mean,
    median,
    modes,
    range: sorted[count - 1] - sorted[0],
    pstdev: Math.sqrt(variance / count),
    sstdev: count > 1 ? Math.sqrt(variance / (count - 1)) : null,
  }
}

function roots(
  a: number,
  b: number,
  c: number,
): Formula['run'] extends never ? never : { label: string; value: string }[] {
  if (a === 0) throw new Error('The coefficient a cannot be zero.')
  const d = b * b - 4 * a * c
  if (d > 0) {
    const root = Math.sqrt(d)
    return [
      { label: 'Discriminant', value: formatQuantity(d) },
      { label: 'x₁', value: formatQuantity((-b + root) / (2 * a)) },
      { label: 'x₂', value: formatQuantity((-b - root) / (2 * a)) },
    ]
  }
  if (d === 0) {
    return [
      { label: 'Discriminant', value: '0' },
      { label: 'x', value: formatQuantity(-b / (2 * a)) },
    ]
  }
  const real = -b / (2 * a)
  const imag = Math.sqrt(-d) / (2 * a)
  const sign = imag < 0 ? '−' : '+'
  return [
    { label: 'Discriminant', value: formatQuantity(d) },
    { label: 'x', value: `${formatQuantity(real)} ${sign} ${formatQuantity(Math.abs(imag))}i` },
  ]
}

export const NUMBER_FORMULAS: Formula[] = [
  {
    id: 'roman',
    label: 'Roman numerals',
    hint: 'Convert an integer from 1 to 3999, or a standard Roman numeral.',
    fields: [
      { id: 'value', label: 'Number or numeral', sample: '1994' },
      {
        id: 'dir',
        label: 'Direction',
        sample: 'to',
        options: [
          { value: 'to', label: 'Number to Roman' },
          { value: 'from', label: 'Roman to number' },
        ],
      },
    ],
    run: (raw) => {
      if (raw.dir === 'from') return [{ label: 'Number', value: String(fromRoman(raw.value ?? '')) }]
      return [{ label: 'Roman', value: toRoman(readNumber(raw.value, 'number')) }]
    },
  },
  {
    id: 'gcd',
    label: 'GCD and LCM',
    hint: 'Greatest common divisor and least common multiple of the integers you list.',
    fields: [{ id: 'values', label: 'Integers', sample: '24 36 60' }],
    run: (raw) => {
      const values = parseInts(raw.values ?? '')
      const divisor = values.reduce((acc, value) => gcd(acc, value))
      const multiple = values.reduce((acc, value) => lcm(acc, value))
      return [
        { label: 'GCD', value: divisor.toString() },
        { label: 'LCM', value: multiple.toString() },
      ]
    },
  },
  {
    id: 'factors',
    label: 'Prime factors',
    hint: 'Prime factorization of an integer up to one billion.',
    fields: [{ id: 'n', label: 'Integer', sample: '84' }],
    run: (raw) => [{ label: 'Factors', value: factorize(readNumber(raw.n, 'integer')) }],
  },
  {
    id: 'quad',
    label: 'Quadratic',
    hint: 'Roots of ax² + bx + c = 0.',
    fields: [
      { id: 'a', label: 'a', sample: '1' },
      { id: 'b', label: 'b', sample: '-3' },
      { id: 'c', label: 'c', sample: '2' },
    ],
    run: (raw) => roots(readNumber(raw.a, 'a'), readNumber(raw.b, 'b'), readNumber(raw.c, 'c')),
  },
  {
    id: 'count',
    label: 'Factorial, nCr, nPr',
    hint: 'n up to 1000. Permutations are n! / (n − k)!.',
    fields: [
      { id: 'n', label: 'n', sample: '10' },
      { id: 'k', label: 'k', sample: '3' },
    ],
    run: (raw) => {
      const n = readNumber(raw.n, 'n')
      const k = readNumber(raw.k, 'k')
      const choose = combinations(n, k)
      const arrange = combinations(n, k)
      const perm = (() => {
        const nn = Math.trunc(n)
        const kk = Math.trunc(k)
        if (kk > nn || kk < 0) return '0'
        let result = 1n
        for (let i = 0; i < kk; i += 1) result *= BigInt(nn - i)
        return result.toString()
      })()
      return [
        { label: 'n!', value: factorial(n) },
        { label: 'nCr', value: choose },
        { label: 'nPr', value: arrange === '0' ? '0' : perm },
      ]
    },
  },
  {
    id: 'fraction',
    label: 'Fractions',
    hint: 'Proper, improper, or mixed numbers such as 1 1/2.',
    fields: [
      { id: 'a', label: 'First', sample: '1/2' },
      {
        id: 'op',
        label: 'Operation',
        sample: 'add',
        options: [
          { value: 'add', label: 'Add' },
          { value: 'sub', label: 'Subtract' },
          { value: 'mul', label: 'Multiply' },
          { value: 'div', label: 'Divide' },
        ],
      },
      { id: 'b', label: 'Second', sample: '1/3' },
    ],
    run: (raw) => {
      const value = applyFraction(raw.op ?? 'add', parseFraction(raw.a ?? ''), parseFraction(raw.b ?? ''))
      const decimal = Number(value.n) / Number(value.d)
      return [
        { label: 'Result', value: formatFraction(value) },
        { label: 'Decimal', value: formatQuantity(decimal, 8) },
      ]
    },
  },
  {
    id: 'stats',
    label: 'Descriptive stats',
    hint: 'Separate numbers with spaces or new lines. Sample standard deviation uses n − 1.',
    fields: [{ id: 'data', label: 'Numbers', area: true, sample: '4 8 6 5 3 9 8' }],
    run: (raw) => {
      const stats = describeNumbers(parseNumberList(raw.data ?? ''))
      return [
        { label: 'Count', value: String(stats.count) },
        { label: 'Sum', value: formatQuantity(stats.sum) },
        { label: 'Mean', value: formatQuantity(stats.mean) },
        { label: 'Median', value: formatQuantity(stats.median) },
        { label: 'Mode', value: stats.modes.length ? stats.modes.map((mode) => formatQuantity(mode)).join(', ') : '—' },
        { label: 'Min', value: formatQuantity(stats.min) },
        { label: 'Max', value: formatQuantity(stats.max) },
        { label: 'Range', value: formatQuantity(stats.range) },
        { label: 'Stdev (sample)', value: stats.sstdev === null ? '—' : formatQuantity(stats.sstdev) },
        { label: 'Stdev (population)', value: formatQuantity(stats.pstdev) },
      ]
    },
  },
  {
    id: 'circle',
    label: 'Circle',
    hint: 'Area and circumference from the radius.',
    fields: [{ id: 'r', label: 'Radius', sample: '5' }],
    run: (raw) => {
      const r = readNumber(raw.r, 'radius')
      if (r < 0) throw new Error('Radius cannot be negative.')
      return [
        { label: 'Area', value: formatQuantity(Math.PI * r * r) },
        { label: 'Circumference', value: formatQuantity(2 * Math.PI * r) },
      ]
    },
  },
  {
    id: 'pythag',
    label: 'Pythagoras',
    hint: 'Hypotenuse of a right triangle, c = √(a² + b²).',
    fields: [
      { id: 'a', label: 'a', sample: '3' },
      { id: 'b', label: 'b', sample: '4' },
    ],
    run: (raw) => {
      const a = readNumber(raw.a, 'a')
      const b = readNumber(raw.b, 'b')
      return [{ label: 'c', value: formatQuantity(Math.sqrt(a * a + b * b)) }]
    },
  },
  {
    id: 'heron',
    label: 'Triangle area',
    hint: 'Heron’s formula from the three side lengths.',
    fields: [
      { id: 'a', label: 'a', sample: '3' },
      { id: 'b', label: 'b', sample: '4' },
      { id: 'c', label: 'c', sample: '5' },
    ],
    run: (raw) => {
      const a = readNumber(raw.a, 'a')
      const b = readNumber(raw.b, 'b')
      const c = readNumber(raw.c, 'c')
      if (a <= 0 || b <= 0 || c <= 0) throw new Error('Sides must be above zero.')
      if (a + b <= c || a + c <= b || b + c <= a) throw new Error('Those lengths do not form a triangle.')
      const s = (a + b + c) / 2
      return [{ label: 'Area', value: formatQuantity(Math.sqrt(s * (s - a) * (s - b) * (s - c))) }]
    },
  },
  {
    id: 'distance',
    label: 'Distance and slope',
    hint: 'Straight-line distance, midpoint, and slope between two points.',
    fields: [
      { id: 'x1', label: 'x₁', sample: '0' },
      { id: 'y1', label: 'y₁', sample: '0' },
      { id: 'x2', label: 'x₂', sample: '3' },
      { id: 'y2', label: 'y₂', sample: '4' },
    ],
    run: (raw) => {
      const x1 = readNumber(raw.x1, 'x₁')
      const y1 = readNumber(raw.y1, 'y₁')
      const x2 = readNumber(raw.x2, 'x₂')
      const y2 = readNumber(raw.y2, 'y₂')
      const dx = x2 - x1
      const dy = y2 - y1
      return [
        { label: 'Distance', value: formatQuantity(Math.sqrt(dx * dx + dy * dy)) },
        { label: 'Midpoint', value: `(${formatQuantity((x1 + x2) / 2)}, ${formatQuantity((y1 + y2) / 2)})` },
        { label: 'Slope', value: dx === 0 ? 'undefined' : formatQuantity(dy / dx) },
      ]
    },
  },
  {
    id: 'linear',
    label: 'Linear equation',
    hint: 'Solve ax + b = c for x.',
    fields: [
      { id: 'a', label: 'a', sample: '2' },
      { id: 'b', label: 'b', sample: '3' },
      { id: 'c', label: 'c', sample: '11' },
    ],
    run: (raw) => {
      const a = readNumber(raw.a, 'a')
      const b = readNumber(raw.b, 'b')
      const c = readNumber(raw.c, 'c')
      if (a === 0) throw new Error('a cannot be zero.')
      return [{ label: 'x', value: formatQuantity((c - b) / a) }]
    },
  },
]
