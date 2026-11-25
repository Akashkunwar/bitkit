import { base64ToBytes, bytesToBase64, encodeTextBase64 } from './encode'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const NATO: Record<string, string> = {
  A: 'Alfa',
  B: 'Bravo',
  C: 'Charlie',
  D: 'Delta',
  E: 'Echo',
  F: 'Foxtrot',
  G: 'Golf',
  H: 'Hotel',
  I: 'India',
  J: 'Juliett',
  K: 'Kilo',
  L: 'Lima',
  M: 'Mike',
  N: 'November',
  O: 'Oscar',
  P: 'Papa',
  Q: 'Quebec',
  R: 'Romeo',
  S: 'Sierra',
  T: 'Tango',
  U: 'Uniform',
  V: 'Victor',
  W: 'Whiskey',
  X: 'X-ray',
  Y: 'Yankee',
  Z: 'Zulu',
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
}

const NATO_FROM = new Map(Object.entries(NATO).map(([letter, word]) => [word.toLowerCase(), letter]))

export const PASSPHRASE_WORDS = [
  'abacus',
  'acid',
  'across',
  'action',
  'actor',
  'adapt',
  'adult',
  'again',
  'agent',
  'agree',
  'ahead',
  'alarm',
  'album',
  'alert',
  'alien',
  'allow',
  'alone',
  'alter',
  'amber',
  'among',
  'angel',
  'anger',
  'angle',
  'apart',
  'apple',
  'apply',
  'arena',
  'argue',
  'arise',
  'armor',
  'arrow',
  'asset',
  'atlas',
  'atom',
  'attic',
  'audio',
  'audit',
  'autumn',
  'awake',
  'award',
  'bacon',
  'badge',
  'baker',
  'balance',
  'bamboo',
  'banana',
  'bandit',
  'banner',
  'barrel',
  'basic',
  'basin',
  'basket',
  'beach',
  'beacon',
  'bean',
  'beauty',
  'begin',
  'being',
  'belief',
  'belong',
  'bench',
  'berry',
  'beyond',
  'bicycle',
  'binder',
  'birch',
  'bird',
  'black',
  'blanket',
  'blast',
  'blaze',
  'blend',
  'bless',
  'blind',
  'block',
  'bloom',
  'blossom',
  'board',
  'boat',
  'bold',
  'bonus',
  'border',
  'bottle',
  'bounce',
  'boxer',
  'brain',
  'brass',
  'brave',
  'bread',
  'breeze',
  'brick',
  'bridge',
  'brief',
  'bright',
  'bring',
  'brisk',
  'bronze',
  'brother',
  'brown',
  'brush',
  'bucket',
  'budget',
  'build',
  'bulb',
  'bunch',
  'bundle',
  'bunny',
  'burden',
  'burger',
  'burst',
  'butter',
  'cabin',
  'cable',
  'cactus',
  'camera',
  'camp',
  'canal',
  'candle',
  'candy',
  'canyon',
  'carbon',
  'cargo',
  'carpet',
  'carrot',
  'carve',
  'castle',
  'catch',
  'cause',
  'cedar',
  'ceiling',
  'cellar',
  'cement',
  'center',
  'cereal',
  'chain',
  'chair',
  'chalk',
  'chance',
  'change',
  'channel',
  'chapter',
  'charge',
  'charm',
  'chart',
  'chase',
  'cheap',
  'check',
  'cheese',
  'cherry',
  'chest',
  'chief',
  'child',
  'chili',
  'chimney',
  'choice',
  'chorus',
  'circle',
  'circus',
  'citizen',
  'citrus',
  'claim',
  'clap',
  'class',
  'classic',
  'clay',
  'clean',
  'clear',
  'clerk',
  'click',
  'cliff',
  'climb',
  'clinic',
  'clock',
  'close',
  'cloth',
  'cloud',
  'clover',
  'coach',
  'coast',
  'cocoa',
  'coffee',
  'coin',
  'cold',
  'collar',
  'colony',
  'color',
  'column',
  'comet',
  'comfort',
  'comic',
  'common',
  'compass',
  'concert',
  'copper',
  'coral',
  'corner',
  'cotton',
  'couch',
  'couple',
  'course',
  'cousin',
  'cover',
  'craft',
  'crane',
  'crate',
  'cream',
  'credit',
  'creek',
  'cricket',
  'crisp',
  'critic',
  'crowd',
  'crown',
  'crystal',
  'cube',
  'cucumber',
  'cup',
  'custom',
  'cycle',
  'daisy',
  'dance',
  'danger',
  'daring',
  'dawn',
  'daylight',
  'dealer',
  'debate',
  'decade',
  'decide',
  'decor',
  'delay',
  'delta',
  'denim',
  'desert',
  'design',
  'detail',
  'device',
  'diary',
  'dinner',
  'direct',
  'disco',
  'diver',
  'doctor',
  'domain',
  'donkey',
  'donor',
  'double',
  'dragon',
  'drawer',
  'dream',
  'dress',
  'drift',
  'driver',
  'drum',
  'dryer',
  'dune',
] as const

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  while (out.length % 8) out += '='
  return out
}

export function decodeBase32(input: string): Uint8Array {
  const clean = input.trim().replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase()
  if (!clean) return new Uint8Array()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index < 0) throw new Error('That is not Base32.')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Uint8Array.from(out)
}

export function encodeBase58(bytes: Uint8Array): string {
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1
  let n = 0n
  for (const byte of bytes) n = (n << 8n) | BigInt(byte)
  let out = ''
  while (n > 0n) {
    out = BASE58[Number(n % 58n)] + out
    n /= 58n
  }
  return '1'.repeat(zeros) + out
}

export function decodeBase58(input: string): Uint8Array {
  const text = input.trim()
  if (!text) return new Uint8Array()
  let zeros = 0
  while (text[zeros] === '1') zeros += 1
  let n = 0n
  for (const char of text) {
    const index = BASE58.indexOf(char)
    if (index < 0) throw new Error('That is not Base58.')
    n = n * 58n + BigInt(index)
  }
  const body: number[] = []
  while (n > 0n) {
    body.push(Number(n & 255n))
    n >>= 8n
  }
  body.reverse()
  return Uint8Array.from([...Array(zeros).fill(0), ...body])
}

function adaptBias(delta: number, numPoints: number, first: boolean): number {
  let next = first ? Math.floor(delta / 700) : delta >> 1
  next += Math.floor(next / numPoints)
  let k = 0
  while (next > 455) {
    next = Math.floor(next / 35)
    k += 36
  }
  return k + Math.floor((36 * next) / (next + 38))
}

function digitToBasic(digit: number): string {
  return String.fromCharCode(digit + (digit < 26 ? 97 : 22))
}

function basicToDigit(char: string): number {
  const code = char.toLowerCase().charCodeAt(0)
  if (code >= 48 && code <= 57) return code - 22
  if (code >= 97 && code <= 122) return code - 97
  return -1
}

/** RFC 3492 punycode of one Unicode label, without the xn-- prefix. */
export function punyEncode(input: string): string {
  const points = Array.from(input).map((char) => char.codePointAt(0) ?? 0)
  const output: string[] = []
  let n = 128
  let delta = 0
  let bias = 72
  let handled = 0
  for (const point of points) {
    if (point < 128) {
      output.push(String.fromCharCode(point))
      handled += 1
    }
  }
  const basic = handled
  if (handled > 0) output.push('-')
  while (handled < points.length) {
    let min = 0x110000
    for (const point of points) if (point >= n && point < min) min = point
    delta += (min - n) * (handled + 1)
    n = min
    for (const point of points) {
      if (point < n) delta += 1
      if (point === n) {
        let q = delta
        for (let k = 36; ; k += 36) {
          const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias
          if (q < t) break
          output.push(digitToBasic(t + ((q - t) % (36 - t))))
          q = Math.floor((q - t) / (36 - t))
        }
        output.push(digitToBasic(q))
        bias = adaptBias(delta, handled + 1, handled === basic)
        delta = 0
        handled += 1
      }
    }
    delta += 1
    n += 1
  }
  return output.join('')
}

export function punyDecode(input: string): string {
  const text = input.trim().toLowerCase()
  const split = text.lastIndexOf('-')
  const output: number[] = []
  if (split > 0) {
    for (const char of text.slice(0, split)) {
      if (char.charCodeAt(0) > 127) throw new Error('Punycode basic letters have to be ASCII.')
      output.push(char.charCodeAt(0))
    }
  }
  let i = 0
  let n = 128
  let bias = 72
  let index = split > 0 ? split + 1 : 0
  while (index < text.length) {
    const old = i
    let w = 1
    for (let k = 36; ; k += 36) {
      if (index >= text.length) throw new Error('That punycode is incomplete.')
      const digit = basicToDigit(text[index])
      index += 1
      if (digit < 0) throw new Error('That is not punycode.')
      i += digit * w
      const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias
      if (digit < t) break
      w *= 36 - t
    }
    const length = output.length + 1
    bias = adaptBias(i - old, length, old === 0)
    n += Math.floor(i / length)
    i %= length
    output.splice(i, 0, n)
    i += 1
  }
  return String.fromCodePoint(...output)
}

export function convertHost(input: string, decode: boolean): string {
  const trimmed = input.trim()
  let host = trimmed
  if (trimmed.includes('://')) {
    try {
      host = new URL(trimmed).hostname
    } catch {
      throw new Error('That URL could not be read.')
    }
  }
  return host
    .split('.')
    .map((label) => {
      if (!label) return label
      if (decode) return label.toLowerCase().startsWith('xn--') ? punyDecode(label.slice(4)) : label
      const ascii = Array.from(label).every((char) => (char.codePointAt(0) ?? 0) < 128)
      return ascii ? label : `xn--${punyEncode(label)}`
    })
    .join('.')
}

export function caesar(input: string, shift: number): string {
  const amount = ((Math.trunc(shift) % 26) + 26) % 26
  return Array.from(input)
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code >= 65 && code <= 90) return String.fromCharCode(65 + ((code - 65 + amount) % 26))
      if (code >= 97 && code <= 122) return String.fromCharCode(97 + ((code - 97 + amount) % 26))
      return char
    })
    .join('')
}

export function atbash(input: string): string {
  return Array.from(input)
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code >= 65 && code <= 90) return String.fromCharCode(90 - (code - 65))
      if (code >= 97 && code <= 122) return String.fromCharCode(122 - (code - 97))
      return char
    })
    .join('')
}

export function xorHex(input: string, key: string): string {
  if (!key) throw new Error('Enter a key.')
  const data = new TextEncoder().encode(input)
  const secret = new TextEncoder().encode(key)
  return [...data].map((byte, index) => (byte ^ secret[index % secret.length]).toString(16).padStart(2, '0')).join('')
}

export function xorFromHex(input: string, key: string): string {
  if (!key) throw new Error('Enter a key.')
  const clean = input.replace(/\s+/g, '')
  if (!/^[0-9a-f]*$/i.test(clean) || clean.length % 2 !== 0) throw new Error('Paste an even-length hex string.')
  const secret = new TextEncoder().encode(key)
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i += 1)
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16) ^ secret[i % secret.length]
  return new TextDecoder().decode(bytes)
}

export function toNato(input: string): string {
  const words: string[] = []
  for (const char of input.toUpperCase()) {
    if (char === ' ') {
      words.push('/')
      continue
    }
    const word = NATO[char]
    if (word) words.push(word)
  }
  return words.join(' ')
}

export function fromNato(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === '/') return ' '
      const letter = NATO_FROM.get(word.toLowerCase().replace(/ray$/i, 'ray'))
      if (!letter) throw new Error(`“${word}” is not a NATO word.`)
      return letter
    })
    .join('')
}

export function encodeQuotedPrintable(input: string): string {
  const bytes = new TextEncoder().encode(input)
  const chars = [...bytes].map((byte) => {
    const plain = byte === 9 || (byte >= 32 && byte <= 126 && byte !== 61)
    return plain ? String.fromCharCode(byte) : `=${byte.toString(16).toUpperCase().padStart(2, '0')}`
  })
  let line = ''
  const lines: string[] = []
  for (const char of chars) {
    if (line.length + char.length > 75) {
      lines.push(`${line}=`)
      line = ''
    }
    line += char
  }
  lines.push(line)
  return lines.join('\r\n')
}

export function decodeQuotedPrintable(input: string): string {
  const joined = input.replace(/=\r?\n/g, '')
  const bytes: number[] = []
  for (let i = 0; i < joined.length; i += 1) {
    if (joined[i] === '=' && /^[0-9A-F]{2}/i.test(joined.slice(i + 1, i + 3))) {
      bytes.push(Number.parseInt(joined.slice(i + 1, i + 3), 16))
      i += 2
    } else bytes.push(joined.charCodeAt(i) & 255)
  }
  return new TextDecoder().decode(Uint8Array.from(bytes))
}

export async function gzipBase64(input: string): Promise<string> {
  const compressed = await pipeBytes(new TextEncoder().encode(input), new CompressionStream('gzip'))
  return bytesToBase64(compressed)
}

export async function gunzipBase64(input: string): Promise<string> {
  const bytes = await pipeBytes(base64ToBytes(input), new DecompressionStream('gzip'))
  return new TextDecoder().decode(bytes)
}

async function pipeBytes(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes)
  const response = new Response(new Blob([copy]).stream().pipeThrough(stream))
  return new Uint8Array(await response.arrayBuffer())
}

export async function sriHash(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-384', new TextEncoder().encode(input))
  return `sha384-${bytesToBase64(new Uint8Array(digest))}`
}

export async function hmacSha256(message: string, key: string): Promise<string> {
  if (!key) throw new Error('Enter a key.')
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function basicAuthHeader(user: string, password: string): string {
  return `Authorization: Basic ${encodeTextBase64(`${user}:${password}`)}`
}

export function toDataUri(mime: string, text: string): string {
  const type = mime.trim() || 'text/plain'
  return `data:${type};base64,${encodeTextBase64(text)}`
}

export function fromDataUri(input: string): string {
  const match = /^data:([^,]*),(.*)$/s.exec(input.trim())
  if (!match) throw new Error('Paste a data URI that starts with data:.')
  const meta = match[1]
  const body = match[2]
  if (/;base64/i.test(meta)) return new TextDecoder().decode(base64ToBytes(body))
  return decodeURIComponent(body)
}

export function jsonToTypes(source: string): string {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new Error('That JSON could not be parsed.')
  }
  return `export type Root = ${typeOf(value)}`
}

function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return arrayType(value)
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return typeof value
    case 'object':
      return objectType(value as Record<string, unknown>)
    default:
      return 'unknown'
  }
}

function arrayType(items: unknown[]): string {
  if (!items.length) return 'unknown[]'
  const objects = items.every((item) => item && typeof item === 'object' && !Array.isArray(item))
  if (!objects) return `${union(items.map(typeOf))}[]`
  const keys = new Set<string>()
  for (const item of items) for (const key of Object.keys(item as object)) keys.add(key)
  const lines = [...keys].map((key) => {
    const present = items.filter((item) => Object.prototype.hasOwnProperty.call(item, key))
    const optional = present.length < items.length ? '?' : ''
    return `  ${propertyName(key)}${optional}: ${union(present.map((item) => typeOf((item as Record<string, unknown>)[key])))}`
  })
  return `{\n${lines.join('\n')}\n}[]`
}

function objectType(value: Record<string, unknown>): string {
  const lines = Object.entries(value).map(([key, child]) => `  ${propertyName(key)}: ${typeOf(child)}`)
  return `{\n${lines.join('\n')}\n}`
}

function union(types: string[]): string {
  return [...new Set(types)].join(' | ')
}

function propertyName(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
}

export function formatXml(source: string): string {
  const doc = new DOMParser().parseFromString(source.trim(), 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('That XML could not be parsed.')
  const declaration = /^\s*<\?xml[^?]*\?>/i.exec(source)
  const body = elementToString(doc.documentElement, 0)
  return declaration ? `${declaration[0]}\n${body}` : body
}

function elementToString(node: Element, depth: number): string {
  const pad = '  '.repeat(depth)
  const attrs = [...node.attributes].map((attr) => ` ${attr.name}="${escapeXml(attr.value)}"`).join('')
  const children = [...node.childNodes].filter((child) => !(child.nodeType === 3 && !child.textContent?.trim()))
  if (!children.length) return `${pad}<${node.tagName}${attrs}/>`
  if (children.length === 1 && children[0].nodeType === 3) {
    return `${pad}<${node.tagName}${attrs}>${escapeXml(children[0].textContent ?? '')}</${node.tagName}>`
  }
  const inner = children
    .map((child) => {
      if (child.nodeType === 1) return elementToString(child as Element, depth + 1)
      if (child.nodeType === 3) return `${'  '.repeat(depth + 1)}${escapeXml(child.textContent?.trim() ?? '')}`
      if (child.nodeType === 8) return `${'  '.repeat(depth + 1)}<!--${child.textContent ?? ''}-->`
      return ''
    })
    .filter(Boolean)
    .join('\n')
  return `${pad}<${node.tagName}${attrs}>\n${inner}\n${pad}</${node.tagName}>`
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

export function explainChmod(input: string): { octal: string; symbolic: string } {
  const raw = input.trim()
  if (/^[0-7]{3}$/.test(raw) || /^[0-7]{4}$/.test(raw)) {
    const octal = raw.length === 3 ? `0${raw}` : raw
    return { octal, symbolic: symbolicFromOctal(octal) }
  }
  if (/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/.test(raw)) {
    return { octal: octalFromSymbolic(raw), symbolic: raw }
  }
  throw new Error('Use an octal mode like 755, or nine characters like rwxr-xr-x.')
}

function triplet(value: number): string {
  return `${value & 4 ? 'r' : '-'}${value & 2 ? 'w' : '-'}${value & 1 ? 'x' : '-'}`
}

function symbolicFromOctal(octal: string): string {
  return [...octal.slice(1)].map((digit) => triplet(Number(digit))).join('')
}

function octalFromSymbolic(symbolic: string): string {
  const chunks = [symbolic.slice(0, 3), symbolic.slice(3, 6), symbolic.slice(6, 9)]
  const mode = chunks
    .map((chunk) => (chunk[0] === 'r' ? 4 : 0) + (chunk[1] === 'w' ? 2 : 0) + (chunk[2] === 'x' ? 1 : 0))
    .join('')
  return `0${mode}`
}

const HTTP_STATUS: Record<number, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  413: 'Content Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

export function httpStatus(code: number): string {
  const name = HTTP_STATUS[code]
  if (!name) throw new Error('That code is not in the common set this tool lists.')
  return `${code} ${name}`
}

export function luhnValid(input: string): boolean {
  const digits = input.replace(/[\s-]/g, '')
  if (!/^\d{2,}$/.test(digits)) throw new Error('Enter digits, spaces, or hyphens.')
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = digits.charCodeAt(i) - 48
    if (double) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    double = !double
  }
  return sum % 10 === 0
}

export function isbnValid(input: string): { kind: string; valid: boolean } {
  const text = input.replace(/[\s-]/g, '')
  if (/^\d{13}$/.test(text)) {
    const sum = [...text].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0)
    return { kind: 'ISBN-13', valid: sum % 10 === 0 }
  }
  if (/^\d{9}[\dXx]$/.test(text)) {
    const sum = [...text].reduce((total, digit, index) => {
      const value = digit.toUpperCase() === 'X' ? 10 : Number(digit)
      return total + value * (10 - index)
    }, 0)
    return { kind: 'ISBN-10', valid: sum % 11 === 0 }
  }
  throw new Error('Enter an ISBN-10 or ISBN-13.')
}

export function hammingDistance(left: string, right: string): number {
  const a = Array.from(left)
  const b = Array.from(right)
  if (a.length !== b.length) throw new Error('Both strings need the same number of characters.')
  return a.reduce((total, char, index) => total + (char === b[index] ? 0 : 1), 0)
}

export function ulid(time = Date.now(), random = crypto.getRandomValues(new Uint8Array(10))): string {
  let clock = BigInt(time)
  let timePart = ''
  for (let i = 0; i < 10; i += 1) {
    timePart = CROCKFORD[Number(clock & 31n)] + timePart
    clock >>= 5n
  }
  let noise = 0n
  for (const byte of random) noise = (noise << 8n) | BigInt(byte)
  let randomPart = ''
  for (let i = 0; i < 16; i += 1) {
    randomPart = CROCKFORD[Number(noise & 31n)] + randomPart
    noise >>= 5n
  }
  return timePart + randomPart
}

export function randomMac(bytes = crypto.getRandomValues(new Uint8Array(6))): string {
  const next = new Uint8Array(bytes)
  next[0] = (next[0] | 0x02) & 0xfe
  return [...next].map((byte) => byte.toString(16).padStart(2, '0')).join(':')
}

export function makePassphrase(
  count: number,
  bytes = crypto.getRandomValues(new Uint8Array(count)),
): { phrase: string; bits: number } {
  if (!Number.isInteger(count) || count < 4 || count > 12) throw new Error('Choose 4 to 12 words.')
  if (PASSPHRASE_WORDS.length !== 256) throw new Error('The word list is not 256 words.')
  if (bytes.length < count) throw new Error('Not enough random bytes.')
  const phrase = [...bytes.slice(0, count)].map((byte) => PASSPHRASE_WORDS[byte]).join(' ')
  return { phrase, bits: count * 8 }
}
