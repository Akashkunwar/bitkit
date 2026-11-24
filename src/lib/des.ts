import { base64ToBytes, bytesToBase64 } from './encode'

const IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24,
  16, 8, 57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31,
  23, 15, 7,
]
const FP = [
  40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21,
  61, 29, 36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49,
  17, 57, 25,
]
const E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22,
  23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
]
const P = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25,
]
const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55,
  47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
]
const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30,
  40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
]
const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
const S = [
  [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1,
    14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
  ],
  [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14,
    7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
  ],
  [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6,
    4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12,
  ],
  [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6,
    9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14,
  ],
  [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1,
    11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3,
  ],
  [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14,
    15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13,
  ],
  [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4,
    11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12,
  ],
  [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11,
    4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11,
  ],
]

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = []
  for (const byte of bytes) for (let i = 7; i >= 0; i -= 1) bits.push((byte >> i) & 1)
  return bits
}

function bitsToBytes(bits: number[]): Uint8Array {
  const out = new Uint8Array(bits.length / 8)
  for (let i = 0; i < bits.length; i += 1) if (bits[i]) out[i >> 3] |= 1 << (7 - (i & 7))
  return out
}

function perm(bits: number[], table: number[]): number[] {
  return table.map((index) => bits[index - 1])
}

function xor(a: number[], b: number[]): number[] {
  return a.map((bit, index) => bit ^ b[index])
}

function rotl28(bits: number[], n: number): number[] {
  return bits.slice(n).concat(bits.slice(0, n))
}

function subKeys(key: Uint8Array): number[][] {
  const permuted = perm(bytesToBits(key), PC1)
  let c = permuted.slice(0, 28)
  let d = permuted.slice(28)
  const keys: number[][] = []
  for (const shift of SHIFTS) {
    c = rotl28(c, shift)
    d = rotl28(d, shift)
    keys.push(perm(c.concat(d), PC2))
  }
  return keys
}

function sbox(chunk: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < 8; i += 1) {
    const six = chunk.slice(i * 6, i * 6 + 6)
    const row = (six[0] << 1) | six[5]
    const col = (six[1] << 3) | (six[2] << 2) | (six[3] << 1) | six[4]
    const value = S[i][row * 16 + col]
    out.push((value >> 3) & 1, (value >> 2) & 1, (value >> 1) & 1, value & 1)
  }
  return out
}

function round(right: number[], key: number[]): number[] {
  return perm(sbox(xor(perm(right, E), key)), P)
}

/** One DES block. `key` is 8 bytes. Matches the FIPS known-answer test. */
export function desBlock(block: Uint8Array, key: Uint8Array, decrypt = false): Uint8Array {
  if (block.length !== 8 || key.length !== 8) throw new Error('DES uses an 8-byte block and an 8-byte key.')
  const bits = perm(bytesToBits(block), IP)
  let left = bits.slice(0, 32)
  let right = bits.slice(32)
  const keys = subKeys(key)
  for (let i = 0; i < 16; i += 1) {
    const next = xor(left, round(right, keys[decrypt ? 15 - i : i]))
    left = right
    right = next
  }
  return bitsToBytes(perm(right.concat(left), FP))
}

function keyBytes(password: string): Uint8Array {
  const encoded = new TextEncoder().encode(password)
  if (encoded.length > 8) {
    throw new Error(
      'A DES password can only be 8 bytes. Extra characters are not used — switch to AES for a real passphrase.',
    )
  }
  const key = new Uint8Array(8)
  key.set(encoded)
  return key
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(8)
  for (let i = 0; i < 8; i += 1) out[i] = a[i] ^ b[i]
  return out
}

/** CBC encrypt. The result is base64 of an 8-byte IV plus the ciphertext. */
export function desEncrypt(text: string, password: string): string {
  if (!password) throw new Error('Enter a password.')
  const key = keyBytes(password)
  const plain = new TextEncoder().encode(text)
  const pad = 8 - (plain.length % 8)
  const padded = new Uint8Array(plain.length + pad)
  padded.set(plain)
  padded.fill(pad, plain.length)
  const iv = crypto.getRandomValues(new Uint8Array(8))
  const out = new Uint8Array(8 + padded.length)
  out.set(iv)
  let prev: Uint8Array = new Uint8Array(iv)
  for (let offset = 0; offset < padded.length; offset += 8) {
    const block = desBlock(xorBytes(padded.subarray(offset, offset + 8), prev), key)
    out.set(block, 8 + offset)
    prev = new Uint8Array(block)
  }
  return bytesToBase64(out)
}

export function desDecrypt(payload: string, password: string): string {
  if (!password) throw new Error('Enter a password.')
  const raw = base64ToBytes(payload.trim())
  if (raw.length < 16 || raw.length % 8 !== 0) throw new Error('That is not a DES message from this tool.')
  const key = keyBytes(password)
  const iv = raw.subarray(0, 8)
  const body = raw.subarray(8)
  const plain = new Uint8Array(body.length)
  let prev: Uint8Array = new Uint8Array(iv)
  for (let offset = 0; offset < body.length; offset += 8) {
    const block = body.subarray(offset, offset + 8)
    plain.set(xorBytes(desBlock(new Uint8Array(block), key, true), prev), offset)
    prev = new Uint8Array(block)
  }
  const pad = plain[plain.length - 1]
  if (pad < 1 || pad > 8) throw new Error('Wrong password, or the message was damaged.')
  for (let i = 1; i <= pad; i += 1) {
    if (plain[plain.length - i] !== pad) throw new Error('Wrong password, or the message was damaged.')
  }
  return new TextDecoder().decode(plain.subarray(0, plain.length - pad))
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}
