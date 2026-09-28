/**
 * A small, safe expression evaluator for the calculator — no `eval`, no
 * `Function`. Tokenise, parse by precedence into a tree, then evaluate.
 *
 * Grammar, lowest precedence first:
 *   expr     := term (('+' | '-') term)*
 *   term     := unary (('*' | '/' | 'mod' | implicit) unary)*
 *   unary    := ('+' | '-') unary | power
 *   power    := postfix ('^' unary)?           right-associative; -2^2 = -4
 *   postfix  := primary ('!' | '%')*
 *   primary  := number | name | name '(' args ')' | '(' expr ')'
 *
 * Implicit multiplication covers 2π, 3(4+1), (1+2)(3+4), and 2sin(30).
 * Percent follows everyday calculators: 50% is 0.5, but in `a + b%` and
 * `a - b%` the percentage is of `a`, so 200 + 10% = 220.
 */

export type AngleMode = 'deg' | 'rad'

export class CalcError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalcError'
  }
}

type Token =
  | { type: 'num'; value: number }
  | { type: 'name'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'name'; name: string }
  | { kind: 'call'; name: string; args: Node[] }
  | { kind: 'unary'; op: '-' | '+'; arg: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'postfix'; op: '!' | '%'; arg: Node }

const SYMBOLS: Record<string, string> = {
  '×': '*',
  '·': '*',
  '÷': '/',
  '−': '-',
  '–': '-',
  // Padded so a symbol never fuses with its neighbour: √16 is not "sqrt16".
  '√': ' sqrt ',
  π: ' pi ',
  τ: ' tau ',
  φ: ' phi ',
  '²': '^2',
  '³': '^3',
}

export function tokenize(input: string): Token[] {
  const source = input.replace(/[×·÷−–√πτφ²³]/g, (ch) => SYMBOLS[ch] ?? ch)
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (/[0-9.]/.test(ch)) {
      const match = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(i))
      if (!match) throw new CalcError(`Unexpected “${ch}”.`)
      tokens.push({ type: 'num', value: Number(match[0]) })
      i += match[0].length
      continue
    }
    if (/[a-z_]/i.test(ch)) {
      const match = /^[a-z_][a-z0-9_]*/i.exec(source.slice(i))!
      tokens.push({ type: 'name', value: match[0].toLowerCase() })
      i += match[0].length
      continue
    }
    if (ch === '*' && source[i + 1] === '*') {
      tokens.push({ type: 'op', value: '^' })
      i += 2
      continue
    }
    if ('+-*/^!%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i += 1
      continue
    }
    if (ch === '(' || ch === '[') {
      tokens.push({ type: 'lparen' })
      i += 1
      continue
    }
    if (ch === ')' || ch === ']') {
      tokens.push({ type: 'rparen' })
      i += 1
      continue
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' })
      i += 1
      continue
    }
    throw new CalcError(`Unexpected “${ch}”.`)
  }
  return tokens
}

const FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'sqrt',
  'cbrt',
  'root',
  'abs',
  'ln',
  'log',
  'log2',
  'exp',
  'floor',
  'ceil',
  'round',
  'sign',
  'min',
  'max',
  'pow',
  'hypot',
  'ncr',
  'npr',
  'gcd',
  'lcm',
  'fact',
])

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
}

class Parser {
  private pos = 0
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    if (!this.tokens.length) throw new CalcError('Type an expression.')
    const node = this.expr()
    if (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]
      throw new CalcError(token.type === 'rparen' ? 'Unmatched “)”.' : 'Unexpected input after the expression.')
    }
    return node
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private isOp(value: string): boolean {
    const token = this.peek()
    return token?.type === 'op' && token.value === value
  }

  private expr(): Node {
    let left = this.term()
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.tokens[this.pos++] as { value: string }).value
      left = { kind: 'binary', op, left, right: this.term() }
    }
    return left
  }

  /** Whether the next token can start an operand, for implicit multiplication. */
  private startsOperand(): boolean {
    const token = this.peek()
    return !!token && (token.type === 'num' || token.type === 'name' || token.type === 'lparen')
  }

  private term(): Node {
    let left = this.unary()
    for (;;) {
      if (this.isOp('*') || this.isOp('/')) {
        const op = (this.tokens[this.pos++] as { value: string }).value
        left = { kind: 'binary', op, left, right: this.unary() }
      } else if (this.peek()?.type === 'name' && (this.peek() as { value: string }).value === 'mod') {
        this.pos += 1
        left = { kind: 'binary', op: 'mod', left, right: this.unary() }
      } else if (this.startsOperand()) {
        left = { kind: 'binary', op: '*', left, right: this.power() }
      } else {
        return left
      }
    }
  }

  private unary(): Node {
    if (this.isOp('-') || this.isOp('+')) {
      const op = (this.tokens[this.pos++] as { value: string }).value as '-' | '+'
      return { kind: 'unary', op, arg: this.unary() }
    }
    return this.power()
  }

  private power(): Node {
    const base = this.postfix()
    if (this.isOp('^')) {
      this.pos += 1
      return { kind: 'binary', op: '^', left: base, right: this.unary() }
    }
    return base
  }

  private postfix(): Node {
    let node = this.primary()
    while (this.isOp('!') || this.isOp('%')) {
      const op = (this.tokens[this.pos++] as { value: string }).value as '!' | '%'
      node = { kind: 'postfix', op, arg: node }
    }
    return node
  }

  private primary(): Node {
    const token = this.peek()
    if (!token) throw new CalcError('The expression ends too early.')
    if (token.type === 'num') {
      this.pos += 1
      return { kind: 'num', value: token.value }
    }
    if (token.type === 'lparen') {
      this.pos += 1
      const inner = this.expr()
      // Forgive a missing closing bracket at the very end, as calculators do.
      if (this.peek()?.type === 'rparen') this.pos += 1
      else if (this.pos < this.tokens.length) throw new CalcError('Expected “)”.')
      return inner
    }
    if (token.type === 'name') {
      this.pos += 1
      const name = token.value
      if (FUNCTIONS.has(name)) {
        if (this.peek()?.type === 'lparen') {
          this.pos += 1
          const args: Node[] = []
          if (this.peek()?.type !== 'rparen') {
            args.push(this.expr())
            while (this.peek()?.type === 'comma') {
              this.pos += 1
              args.push(this.expr())
            }
          }
          if (this.peek()?.type === 'rparen') this.pos += 1
          else if (this.pos < this.tokens.length) throw new CalcError(`Expected “)” after ${name}.`)
          return { kind: 'call', name, args }
        }
        // sin 30, sqrt 2: a function applied to the next operand.
        return { kind: 'call', name, args: [this.power()] }
      }
      return { kind: 'name', name }
    }
    if (token.type === 'rparen') throw new CalcError('Unmatched “)”.')
    if (token.type === 'comma') throw new CalcError('Unexpected comma.')
    throw new CalcError(`Unexpected “${token.value}”.`)
  }
}

/** Lanczos approximation, accurate to ~15 digits; x! = Γ(x + 1). */
function gamma(x: number): number {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x))
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  const z = x - 1
  let a = c[0]
  const t = z + g + 0.5
  for (let i = 1; i < g + 2; i += 1) a += c[i] / (z + i)
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * a
}

export function factorial(n: number): number {
  if (n < 0 && Number.isInteger(n)) throw new CalcError('Factorial is not defined for negative integers.')
  if (n > 170) return Infinity
  if (Number.isInteger(n)) {
    let result = 1
    for (let i = 2; i <= n; i += 1) result *= i
    return result
  }
  return gamma(n + 1)
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a))
  let y = Math.abs(Math.round(b))
  while (y) [x, y] = [y, x % y]
  return x
}

export type Scope = { ans?: number; angle?: AngleMode; vars?: Record<string, number> }

function evaluate(node: Node, scope: Required<Pick<Scope, 'angle'>> & Scope): number {
  const toRad = (x: number) => (scope.angle === 'deg' ? (x * Math.PI) / 180 : x)
  const fromRad = (x: number) => (scope.angle === 'deg' ? (x * 180) / Math.PI : x)
  // Trig at exact multiples of 90° should be exact, not 6.1e-17.
  const clean = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x)
  const ev = (n: Node) => evaluate(n, scope)

  switch (node.kind) {
    case 'num':
      return node.value
    case 'name': {
      if (node.name === 'ans') {
        if (scope.ans === undefined) throw new CalcError('There is no previous answer yet.')
        return scope.ans
      }
      if (node.name in CONSTANTS) return CONSTANTS[node.name]
      if (scope.vars && node.name in scope.vars) return scope.vars[node.name]
      if (FUNCTIONS.has(node.name)) throw new CalcError(`${node.name} needs a value, like ${node.name}(2).`)
      throw new CalcError(`Unknown name “${node.name}”.`)
    }
    case 'unary':
      return node.op === '-' ? -ev(node.arg) : ev(node.arg)
    case 'postfix':
      return node.op === '!' ? factorial(ev(node.arg)) : ev(node.arg) / 100
    case 'binary': {
      // a ± b% means a changed by b percent of itself.
      if ((node.op === '+' || node.op === '-') && node.right.kind === 'postfix' && node.right.op === '%') {
        const base = ev(node.left)
        const pct = ev(node.right.arg) / 100
        return node.op === '+' ? base * (1 + pct) : base * (1 - pct)
      }
      const a = ev(node.left)
      const b = ev(node.right)
      switch (node.op) {
        case '+':
          return a + b
        case '-':
          return a - b
        case '*':
          return a * b
        case '/':
          if (b === 0) throw new CalcError('Cannot divide by zero.')
          return a / b
        case 'mod':
          if (b === 0) throw new CalcError('Cannot take mod 0.')
          return ((a % b) + b) % b
        case '^':
          return a ** b
      }
      throw new CalcError(`Unknown operator ${node.op}.`)
    }
    case 'call': {
      const args = node.args.map(ev)
      const need = (count: number) => {
        if (args.length !== count) {
          throw new CalcError(`${node.name} takes ${count} value${count === 1 ? '' : 's'}.`)
        }
      }
      const one = () => {
        need(1)
        return args[0]
      }
      switch (node.name) {
        case 'sin':
          return clean(Math.sin(toRad(one())))
        case 'cos':
          return clean(Math.cos(toRad(one())))
        case 'tan': {
          const x = one()
          if (scope.angle === 'deg' && Math.abs(x % 180) === 90) throw new CalcError('tan is undefined at 90°.')
          return clean(Math.tan(toRad(x)))
        }
        case 'asin':
          return fromRad(Math.asin(one()))
        case 'acos':
          return fromRad(Math.acos(one()))
        case 'atan':
          return fromRad(Math.atan(one()))
        case 'sinh':
          return Math.sinh(one())
        case 'cosh':
          return Math.cosh(one())
        case 'tanh':
          return Math.tanh(one())
        case 'sqrt': {
          const x = one()
          if (x < 0) throw new CalcError('Square root of a negative number is not real.')
          return Math.sqrt(x)
        }
        case 'cbrt':
          return Math.cbrt(one())
        case 'root': {
          need(2)
          const [x, n] = args
          if (x < 0 && n % 2 === 1) return -(Math.abs(x) ** (1 / n))
          return x ** (1 / n)
        }
        case 'abs':
          return Math.abs(one())
        case 'ln': {
          const x = one()
          if (x <= 0) throw new CalcError('ln needs a positive number.')
          return Math.log(x)
        }
        case 'log': {
          if (args.length === 2) return Math.log(args[0]) / Math.log(args[1])
          const x = one()
          if (x <= 0) throw new CalcError('log needs a positive number.')
          return Math.log10(x)
        }
        case 'log2':
          return Math.log2(one())
        case 'exp':
          return Math.exp(one())
        case 'floor':
          return Math.floor(one())
        case 'ceil':
          return Math.ceil(one())
        case 'round': {
          if (args.length === 2) {
            const factor = 10 ** args[1]
            return Math.round(args[0] * factor) / factor
          }
          return Math.round(one())
        }
        case 'sign':
          return Math.sign(one())
        case 'fact':
          return factorial(one())
        case 'min':
          if (!args.length) throw new CalcError('min needs at least one value.')
          return Math.min(...args)
        case 'max':
          if (!args.length) throw new CalcError('max needs at least one value.')
          return Math.max(...args)
        case 'pow':
          need(2)
          return args[0] ** args[1]
        case 'hypot':
          return Math.hypot(...args)
        case 'ncr':
        case 'npr': {
          need(2)
          const [n, r] = args
          if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || n < 0 || r > n) {
            throw new CalcError(`${node.name === 'ncr' ? 'nCr' : 'nPr'} needs whole numbers with 0 ≤ r ≤ n.`)
          }
          let result = 1
          for (let i = 0; i < r; i += 1) result *= n - i
          return node.name === 'npr' ? result : result / factorial(r)
        }
        case 'gcd':
          if (args.length < 2) throw new CalcError('gcd needs two or more values.')
          return args.reduce((a, b) => gcd(a, b))
        case 'lcm':
          if (args.length < 2) throw new CalcError('lcm needs two or more values.')
          return args.reduce((a, b) => Math.abs(Math.round(a) * Math.round(b)) / gcd(a, b))
      }
      throw new CalcError(`Unknown function “${node.name}”.`)
    }
  }
}

export function calculate(expression: string, scope: Scope = {}): number {
  const tree = new Parser(tokenize(expression)).parse()
  const value = evaluate(tree, { angle: 'deg', ...scope })
  if (Number.isNaN(value)) throw new CalcError('That has no real answer.')
  return value
}

/**
 * Display form: 12 significant digits (which hides binary noise such as
 * 0.1 + 0.2 = 0.30000000000000004), exponent notation for very large or
 * very small magnitudes, and optional digit grouping.
 */
export function formatNumber(value: number, options: { group?: boolean; locale?: string } = {}): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : value < 0 ? '−∞' : 'NaN'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e15 || abs < 1e-9) {
    const [mantissa, exponent] = value.toExponential(9).split('e')
    return `${String(Number(mantissa))}e${Number(exponent)}`
  }
  const rounded = Number(value.toPrecision(12))
  if (!options.group) return String(rounded)
  return rounded.toLocaleString(options.locale ?? 'en-US', { maximumFractionDigits: 10 })
}

/** Whether an expression is complete enough to preview while typing. */
export function tryCalculate(expression: string, scope: Scope = {}): number | null {
  if (!expression.trim()) return null
  try {
    const value = calculate(expression, scope)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}
