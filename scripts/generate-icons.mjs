/**
 * Rasterizes the BitKit mark to the PNGs a PWA install prompt needs.
 *
 * Browsers accept an SVG favicon, but Chrome's install flow still wants raster
 * 192/512 icons, and maskable icons need their own safe-zone padding. Rather
 * than add a headless-browser or native rasterizer dependency, the mark is
 * simple enough (rounded rects + a linear gradient) to draw directly into a
 * pixel buffer and encode with Node's built-in zlib.
 *
 * Run: npm run icons
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(HERE, '..', 'public')

// --- PNG encoding ---------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // Scanlines are stored with filter type 0; the image is small enough that
  // smarter filtering would not pay for itself.
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1)
    raw[rowStart] = 0
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Drawing --------------------------------------------------------------

/** Signed distance from a point to a rounded rectangle; negative means inside. */
function roundedRectDistance(px, py, x, y, w, h, r) {
  const cx = Math.abs(px - (x + w / 2)) - (w / 2 - r)
  const cy = Math.abs(py - (y + h / 2)) - (h / 2 - r)
  const dx = Math.max(cx, 0)
  const dy = Math.max(cy, 0)
  return Math.min(Math.max(cx, cy), 0) + Math.hypot(dx, dy) - r
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

const GRADIENT_FROM = [0x12, 0xa5, 0x8e]
const GRADIENT_TO = [0x0a, 0x6e, 0x60]
const MARK = [0xff, 0xff, 0xff]

/**
 * Draws the mark on a `size` px canvas. `inset` shrinks the artwork within the
 * canvas, which is how the maskable variant keeps clear of the safe zone.
 * `bleed` fills the whole canvas with the background instead of rounding it.
 */
function drawIcon(size, { inset = 0, bleed = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const SS = 4 // supersampling factor per axis, for antialiased edges
  const art = size * (1 - inset * 2)
  const origin = size * inset
  const unit = art / 64

  // The mark: a 2x2 module grid with two bits "on" and two dimmed,
  // matching public/favicon.svg.
  const bars = [
    { x: 11, y: 11, w: 18, h: 18, r: 5, alpha: 1 },
    { x: 35, y: 11, w: 18, h: 18, r: 5, alpha: 0.42 },
    { x: 11, y: 35, w: 18, h: 18, r: 5, alpha: 0.42 },
    { x: 35, y: 35, w: 18, h: 18, r: 5, alpha: 1 },
  ]

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgCoverage = 0
      // Weighted by each block's alpha so dimmed modules blend correctly.
      let markCoverage = 0
      let gradientAccum = 0

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS

          let inBackground
          if (bleed) {
            inBackground = true
          } else {
            inBackground = roundedRectDistance(px, py, origin, origin, art, art, unit * 15) <= 0
          }
          if (!inBackground) continue
          bgCoverage += 1
          gradientAccum += Math.min(1, Math.max(0, (px / size + py / size) / 2))

          for (const bar of bars) {
            const d = roundedRectDistance(
              px,
              py,
              origin + bar.x * unit,
              origin + bar.y * unit,
              bar.w * unit,
              bar.h * unit,
              bar.r * unit,
            )
            if (d <= 0) {
              markCoverage += bar.alpha
              break
            }
          }
        }
      }

      const total = SS * SS
      const i = (y * size + x) * 4
      if (!bgCoverage) {
        rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0
        continue
      }
      const t = gradientAccum / bgCoverage
      const bg = mix(GRADIENT_FROM, GRADIENT_TO, t)
      const markRatio = markCoverage / bgCoverage
      const colour = mix(bg, MARK, markRatio)
      rgba[i] = colour[0]
      rgba[i + 1] = colour[1]
      rgba[i + 2] = colour[2]
      rgba[i + 3] = Math.round((bgCoverage / total) * 255)
    }
  }
  return encodePng(size, size, rgba)
}

mkdirSync(PUBLIC, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, opts: {} },
  { file: 'icon-512.png', size: 512, opts: {} },
  { file: 'apple-touch-icon.png', size: 180, opts: {} },
  // Maskable icons are cropped to a circle by some launchers, so the artwork
  // is inset and the background bleeds to the edges.
  { file: 'icon-maskable-512.png', size: 512, opts: { inset: 0.14, bleed: true } },
  { file: 'favicon-32.png', size: 32, opts: {} },
]

for (const { file, size, opts } of targets) {
  writeFileSync(resolve(PUBLIC, file), drawIcon(size, opts))
  console.log(`wrote public/${file} (${size}x${size})`)
}
