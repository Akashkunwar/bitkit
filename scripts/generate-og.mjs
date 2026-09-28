/**
 * Builds public/og.png — the 1200x630 card link previews use.
 *
 * The wordmark is drawn from a small hand-defined bitmap font rather than a
 * real typeface: only six glyphs are needed, no font dependency is pulled in,
 * and blocky letterforms suit a product called BitKit.
 *
 * Run: npm run og
 */
import { deflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(HERE, '..', 'public')

const W = 1200
const H = 630

// Counted from the registry, like the sitemap, so the card cannot go stale.
const registry = readFileSync(resolve(HERE, '..', 'src/registry.ts'), 'utf8')
const TOOL_TOTAL = [...registry.matchAll(/^\s{4}path: '([^']+)',$/gm)].length
if (!TOOL_TOTAL) throw new Error('No tool paths found in src/registry.ts — has its shape changed?')

// --- PNG encoding (same approach as generate-icons.mjs) -------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

const crc32 = (buf) => {
  let crc = 0xffffffff
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2 // RGB, no alpha needed for a full-bleed card
  const raw = Buffer.alloc(height * (width * 3 + 1))
  for (let y = 0; y < height; y += 1) {
    const start = y * (width * 3 + 1)
    raw[start] = 0
    rgb.copy(raw, start + 1, y * width * 3, (y + 1) * width * 3)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Canvas ---------------------------------------------------------------

// The Dark theme's tokens (src/styles/tokens.css): ink, and the lime
// highlighter with the near-black that sits on it.
const BG = [0x0e, 0x0f, 0x0c]
const INK = [0xec, 0xed, 0xe5]
const MUTED = [0xa2, 0xa4, 0x95]
const LIME = [0xc9, 0xf1, 0x50]
const MARK_INK = [0x16, 0x16, 0x13]

const buf = Buffer.alloc(W * H * 3)

function put(x, y, colour, alpha = 1) {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 3
  for (let c = 0; c < 3; c += 1) {
    buf[i + c] = Math.round(buf[i + c] * (1 - alpha) + colour[c] * alpha)
  }
}

function fill(colour) {
  for (let i = 0; i < W * H; i += 1) {
    buf[i * 3] = colour[0]
    buf[i * 3 + 1] = colour[1]
    buf[i * 3 + 2] = colour[2]
  }
}

function rect(x, y, w, h, colour, alpha = 1) {
  for (let py = Math.round(y); py < Math.round(y + h); py += 1) {
    for (let px = Math.round(x); px < Math.round(x + w); px += 1) put(px, py, colour, alpha)
  }
}

function roundedRect(x, y, w, h, r, colour, alpha = 1) {
  const SS = 3
  for (let py = Math.floor(y); py < Math.ceil(y + h); py += 1) {
    for (let px = Math.floor(x); px < Math.ceil(x + w); px += 1) {
      let hits = 0
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const qx = px + (sx + 0.5) / SS
          const qy = py + (sy + 0.5) / SS
          const cx = Math.abs(qx - (x + w / 2)) - (w / 2 - r)
          const cy = Math.abs(qy - (y + h / 2)) - (h / 2 - r)
          const d = Math.min(Math.max(cx, cy), 0) + Math.hypot(Math.max(cx, 0), Math.max(cy, 0)) - r
          if (d <= 0) hits += 1
        }
      }
      if (hits) put(px, py, colour, alpha * (hits / (SS * SS)))
    }
  }
}

// --- Bitmap font: 5 wide x 7 tall, one string per row ---------------------

const GLYPHS = {
  "'": ['..1..', '..1..', '.....', '.....', '.....', '.....', '.....'],
  ',': ['.....', '.....', '.....', '.....', '.11..', '.11..', '1....'],
  '-': ['.....', '.....', '.....', '11111', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.11..', '.11..'],
  0: ['.111.', '1...1', '1..11', '1.1.1', '11..1', '1...1', '.111.'],
  1: ['..1..', '.11..', '..1..', '..1..', '..1..', '..1..', '.111.'],
  2: ['.111.', '1...1', '....1', '...1.', '..1..', '.1...', '11111'],
  3: ['1111.', '....1', '....1', '.111.', '....1', '....1', '1111.'],
  4: ['1...1', '1...1', '1...1', '11111', '....1', '....1', '....1'],
  5: ['11111', '1....', '1....', '1111.', '....1', '1...1', '.111.'],
  6: ['.111.', '1....', '1....', '1111.', '1...1', '1...1', '.111.'],
  7: ['11111', '....1', '...1.', '..1..', '.1...', '.1...', '.1...'],
  8: ['.111.', '1...1', '1...1', '.111.', '1...1', '1...1', '.111.'],
  9: ['.111.', '1...1', '1...1', '.1111', '....1', '....1', '.111.'],
  ':': ['.....', '.11..', '.11..', '.....', '.11..', '.11..', '.....'],
  A: ['.111.', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
  B: ['1111.', '1...1', '1...1', '1111.', '1...1', '1...1', '1111.'],
  C: ['.1111', '1....', '1....', '1....', '1....', '1....', '.1111'],
  D: ['1111.', '1...1', '1...1', '1...1', '1...1', '1...1', '1111.'],
  E: ['11111', '1....', '1....', '1111.', '1....', '1....', '11111'],
  F: ['11111', '1....', '1....', '1111.', '1....', '1....', '1....'],
  G: ['.1111', '1....', '1....', '1..11', '1...1', '1...1', '.111.'],
  H: ['1...1', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
  I: ['11111', '..1..', '..1..', '..1..', '..1..', '..1..', '11111'],
  J: ['..111', '...1.', '...1.', '...1.', '...1.', '1..1.', '.11..'],
  K: ['1...1', '1..1.', '1.1..', '11...', '1.1..', '1..1.', '1...1'],
  L: ['1....', '1....', '1....', '1....', '1....', '1....', '11111'],
  M: ['1...1', '11.11', '1.1.1', '1...1', '1...1', '1...1', '1...1'],
  N: ['1...1', '11..1', '1.1.1', '1..11', '1...1', '1...1', '1...1'],
  O: ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
  P: ['1111.', '1...1', '1...1', '1111.', '1....', '1....', '1....'],
  Q: ['.111.', '1...1', '1...1', '1...1', '1.1.1', '1..1.', '.11.1'],
  R: ['1111.', '1...1', '1...1', '1111.', '1.1..', '1..1.', '1...1'],
  S: ['.1111', '1....', '1....', '.111.', '....1', '....1', '1111.'],
  T: ['11111', '..1..', '..1..', '..1..', '..1..', '..1..', '..1..'],
  U: ['1...1', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
  V: ['1...1', '1...1', '1...1', '1...1', '1...1', '.1.1.', '..1..'],
  W: ['1...1', '1...1', '1...1', '1...1', '1.1.1', '11.11', '1...1'],
  X: ['1...1', '1...1', '.1.1.', '..1..', '.1.1.', '1...1', '1...1'],
  Y: ['1...1', '1...1', '.1.1.', '..1..', '..1..', '..1..', '..1..'],
  Z: ['11111', '....1', '...1.', '..1..', '.1...', '1....', '11111'],
}

function drawText(text, x, y, scale, colour) {
  let cursor = x
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch]
    if (!glyph) {
      cursor += scale * 3
      continue
    }
    glyph.forEach((row, ry) => {
      ;[...row].forEach((cell, rx) => {
        if (cell === '1') rect(cursor + rx * scale, y + ry * scale, scale, scale, colour)
      })
    })
    cursor += scale * 6
  }
  return cursor
}

// --- Compose --------------------------------------------------------------

fill(BG)

// Module-grid texture: the bits the mark is made of.
for (let y = 40; y < H; y += 26) {
  for (let x = 40; x < W; x += 26) put(x, y, INK, 0.07)
}

// The mark, scaled up from the 64-unit artboard.
const MARK = 132
const mx = 96
const my = 112
const u = MARK / 64
roundedRect(mx, my, MARK, MARK, 14 * u, LIME)
const cells = [
  [12, 12, 1],
  [35, 12, 0.22],
  [12, 35, 0.22],
  [35, 35, 1],
]
for (const [cx, cy, alpha] of cells) {
  roundedRect(mx + cx * u, my + cy * u, 17 * u, 17 * u, 4 * u, MARK_INK, alpha)
}

// Wordmark, then the tagline on a highlighter stroke, as in the app's hero.
const wordY = my + MARK + 58
drawText('BITKIT', mx, wordY, 15, INK)

const tagY = wordY + 15 * 7 + 60
const tag = `${TOOL_TOTAL} PRIVATE BROWSER TOOLS`
rect(mx - 12, tagY - 12, tag.length * 5 * 6 + 18, 5 * 7 + 24, LIME)
drawText(tag, mx, tagY, 5, MARK_INK)
drawText('NOTHING LEAVES YOUR DEVICE', mx, tagY + 5 * 7 + 34, 5, MUTED)

writeFileSync(resolve(PUBLIC, 'og.png'), encodePng(W, H, buf))
console.log('wrote public/og.png (1200x630)')
