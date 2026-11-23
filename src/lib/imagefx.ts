import { decodeImage } from './image/compress'

export type Look = 'newspaper' | 'decade' | 'disposable' | 'digicam'

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter'

export type SeasonDrape = {
  id: SeasonId
  label: string
  colors: readonly [string, string, string, string]
}

export type Raster = {
  data: Uint8ClampedArray
  width: number
  height: number
  canvas: HTMLCanvasElement
}

const ASCII_RAMP = '@%#*+=-:. '
const OUTPUT_NAMES: Record<string, string> = {
  booth: 'photo-booth.png',
  newspaper: 'newspaper.png',
  decade: 'ten-year.png',
  disposable: 'disposable.png',
  digicam: 'digicam.png',
  fisheye: 'fisheye.png',
  live: 'still.png',
  sort: 'pixel-sort.png',
  season: 'season-drape.png',
  stroke: 'filled.svg',
  trace: 'trace.svg',
  ascii: 'frame.txt',
}

function palette(a: string, b: string, c: string, d: string): readonly [string, string, string, string] {
  return [a, b, c, d]
}

function toHex(channel: number): string {
  return channel.toString(16).padStart(2, '0')
}

function clampByte(value: number): number {
  if (value < 0) return 0
  if (value > 255) return 255
  return Math.round(value)
}

function lumaOf(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function hexToRgb(hex: string): [number, number, number] {
  const body = hex.replace('#', '')
  const value = Number.parseInt(body, 16)
  if (body.length !== 6 || Number.isNaN(value)) return [128, 128, 128]
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function hashUnit(x: number, y: number, seed: number): number {
  let n = Math.imul(x + seed * 13, 374761393) ^ Math.imul(y + 17, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function readAttr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))
  if (!match) return null
  return (match[1] ?? match[2] ?? '').trim()
}

function setAttr(attrs: string, name: string, value: string): string {
  const pattern = new RegExp(`(^|\\s)${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'i')
  if (pattern.test(attrs)) return attrs.replace(pattern, `$1${name}="${value}"`)
  return `${attrs} ${name}="${value}"`
}

function fittedSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height, 1)
  const scale = longest > maxSide ? maxSide / longest : 1
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function sourceSize(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  if ('naturalWidth' in source && source.naturalWidth > 0 && source.naturalHeight > 0) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  return { width: source.width, height: source.height }
}

function rasterFromCanvas(canvas: HTMLCanvasElement): Raster {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { data: image.data, width: canvas.width, height: canvas.height, canvas }
}

function isVideoBlob(file: Blob): boolean {
  const type = file.type.toLowerCase()
  const name = file instanceof File ? file.name.toLowerCase() : ''
  return type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/.test(name)
}

function isImageBlob(file: Blob): boolean {
  const type = file.type.toLowerCase()
  const name = file instanceof File ? file.name.toLowerCase() : ''
  if (type.startsWith('video/')) return false
  if (type.startsWith('image/')) return true
  if (!type) return !/\.(mp4|webm|mov|m4v|ogv)$/.test(name)
  return /\.(png|jpe?g|gif|webp|bmp|avif|heic|heif)$/i.test(name)
}

function shortDate(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function lookStamp(look: Look, now: Date): { kicker: string; date: string } {
  if (look === 'decade') {
    const past = new Date(now.getTime())
    past.setFullYear(past.getFullYear() - 10)
    return { kicker: '', date: shortDate(past) }
  }
  if (look === 'newspaper') {
    const months = [
      'JANUARY',
      'FEBRUARY',
      'MARCH',
      'APRIL',
      'MAY',
      'JUNE',
      'JULY',
      'AUGUST',
      'SEPTEMBER',
      'OCTOBER',
      'NOVEMBER',
      'DECEMBER',
    ]
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
    return {
      kicker: 'THE LOCAL TIMES',
      date: `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`,
    }
  }
  if (look === 'disposable') {
    const year = String(now.getFullYear()).slice(2)
    return { kicker: '', date: `${pad2(now.getMonth() + 1)} ${pad2(now.getDate())} '${year}` }
  }
  return { kicker: '', date: `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}` }
}

function paintStamp(ctx: CanvasRenderingContext2D, look: Look, width: number, height: number, now: Date): void {
  const stamp = lookStamp(look, now)
  ctx.save()
  if (look === 'newspaper') {
    const band = Math.max(36, Math.round(height * 0.14))
    ctx.fillStyle = '#f3efe4'
    ctx.fillRect(0, 0, width, band)
    ctx.fillStyle = '#161616'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let size = Math.max(16, Math.round(width * 0.055))
    ctx.font = `700 ${size}px Georgia, "Times New Roman", serif`
    while (size > 14 && ctx.measureText(stamp.kicker).width > width * 0.9) {
      size -= 2
      ctx.font = `700 ${size}px Georgia, "Times New Roman", serif`
    }
    ctx.fillText(stamp.kicker, width / 2, band * 0.38)
    ctx.font = `${Math.max(11, Math.round(width * 0.022))}px Georgia, "Times New Roman", serif`
    ctx.fillText(stamp.date, width / 2, band * 0.72)
    ctx.strokeStyle = '#161616'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(width * 0.06, band - 2)
    ctx.lineTo(width * 0.94, band - 2)
    ctx.stroke()
    ctx.restore()
    return
  }
  const text = stamp.date
  const size = Math.max(14, Math.round(width * 0.042))
  ctx.font = `700 ${size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  const x = width - Math.max(12, Math.round(width * 0.03))
  const y = height - Math.max(10, Math.round(height * 0.03))
  if (look === 'digicam') {
    ctx.lineWidth = Math.max(2, size / 8)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.strokeText(text, x, y)
    ctx.fillStyle = '#f2c14e'
  } else if (look === 'disposable') {
    ctx.fillStyle = '#ff4d1c'
  } else {
    ctx.fillStyle = 'rgba(92, 58, 28, 0.8)'
  }
  ctx.fillText(text, x, y)
  ctx.restore()
}

function channelOverlay(base: number, blend: number): number {
  if (base < 128) return (2 * base * blend) / 255
  return 255 - (2 * (255 - base) * (255 - blend)) / 255
}

async function loadVideoStill(file: Blob, maxSide: number): Promise<Raster> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.style.position = 'fixed'
  video.style.left = '-9999px'
  video.style.width = '1px'
  video.style.height = '1px'
  const url = URL.createObjectURL(file)
  document.body.append(video)
  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadeddata', () => resolve(), { once: true })
      video.addEventListener('error', () => reject(new Error('Could not read that video.')), { once: true })
      video.src = url
    })
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    if (duration > 0.2) {
      await new Promise<void>((resolve, reject) => {
        const target = Math.min(0.25, duration / 3)
        if (Math.abs(video.currentTime - target) < 0.01) {
          resolve()
          return
        }
        video.addEventListener('seeked', () => resolve(), { once: true })
        video.addEventListener('error', () => reject(new Error('Could not read a frame from that video.')), {
          once: true,
        })
        video.currentTime = target
      })
    }
    const width = video.videoWidth
    const height = video.videoHeight
    if (width < 1 || height < 1) throw new Error('Could not read a frame from that video.')
    const fit = fittedSize(width, height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = fit.width
    canvas.height = fit.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable in this browser.')
    ctx.drawImage(video, 0, 0, fit.width, fit.height)
    return rasterFromCanvas(canvas)
  } finally {
    URL.revokeObjectURL(url)
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.remove()
  }
}

/** Unique #rrggbb values. `colors` is capped; `total` is the full unique count. */
export function uniqueColors(data: Uint8ClampedArray, max = 12): { colors: string[]; total: number } {
  const counts = new Map<string, number>()
  for (let i = 0; i + 3 < data.length; i += 4) {
    const hex = `#${toHex(data[i])}${toHex(data[i + 1])}${toHex(data[i + 2])}`
    counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }
  const cap = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 12
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return { colors: ranked.slice(0, cap).map(([hex]) => hex), total: ranked.length }
}

/**
 * Source pixel index for a fisheye remap.
 * The center pixel `floor((width-1)/2), floor((height-1)/2)` maps to itself.
 * Other pixels sample closer to the center, so corners move.
 */
export function fisheyeIndex(x: number, y: number, width: number, height: number): number {
  const w = Math.max(1, Math.floor(Number.isFinite(width) ? Math.abs(width) : 1))
  const h = Math.max(1, Math.floor(Number.isFinite(height) ? Math.abs(height) : 1))
  const px = Number.isFinite(x) ? x : 0
  const py = Number.isFinite(y) ? y : 0
  const centerX = Math.floor((w - 1) / 2)
  const centerY = Math.floor((h - 1) / 2)
  if (px === centerX && py === centerY) return centerY * w + centerX

  const cx = (w - 1) / 2
  const cy = (h - 1) / 2
  const dx = px - cx
  const dy = py - cy
  const maxR = Math.hypot(cx, cy) || 1
  const radius = Math.min(1, Math.hypot(dx, dy) / maxR)
  const factor = 1 - 0.62 * radius * radius
  let sx = Math.round(cx + dx * factor)
  let sy = Math.round(cy + dy * factor)
  if (sx < 0) sx = 0
  else if (sx > w - 1) sx = w - 1
  if (sy < 0) sy = 0
  else if (sy > h - 1) sy = h - 1
  if (sx === px && sy === py) {
    const stepX = cx === px ? 0 : cx > px ? 1 : -1
    const stepY = cy === py ? 0 : cy > py ? 1 : -1
    if (Math.abs(dx) >= Math.abs(dy)) sx = Math.min(w - 1, Math.max(0, sx + (stepX || (px < w - 1 ? 1 : -1))))
    else sy = Math.min(h - 1, Math.max(0, sy + (stepY || (py < h - 1 ? 1 : -1))))
  }
  return sy * w + sx
}

/** Four seasons, each with four hex colors for a multiply/overlay drape. */
export function seasonalDrapes(): SeasonDrape[] {
  return [
    { id: 'spring', label: 'Spring', colors: palette('#7dae62', '#f3c6d4', '#f7e7b2', '#6aa8a0') },
    { id: 'summer', label: 'Summer', colors: palette('#ef7d3c', '#f2c14e', '#2f9e96', '#1e4e5a') },
    { id: 'autumn', label: 'Autumn', colors: palette('#8d3d16', '#d2652c', '#e2a15c', '#5c2d18') },
    { id: 'winter', label: 'Winter', colors: palette('#e6eef6', '#9bb6cc', '#f6f4f1', '#35556e') },
  ]
}

export function seasonById(id: string): SeasonDrape {
  const seasons = seasonalDrapes()
  return seasons.find((season) => season.id === id) ?? seasons[0]
}

/**
 * Turns stroke colors on basic shapes into fills.
 * Attribute rewrite only — not a full vector tracer.
 */
export function strokeToFill(svg: string): string {
  return svg.replace(
    /<(rect|circle|ellipse|path|polygon|polyline|line)\b([^>]*?)\/?>/gi,
    (full, tag: string, attrs: string) => {
      const stroke = readAttr(attrs, 'stroke')
      if (!stroke || stroke.toLowerCase() === 'none') return full
      let next = attrs
      const fill = readAttr(next, 'fill')
      if (fill == null || fill.toLowerCase() === 'none' || fill.toLowerCase() === 'transparent') {
        next = setAttr(next, 'fill', stroke)
      }
      next = setAttr(next, 'stroke', 'none')
      const closing = full.endsWith('/>') ? ' />' : '>'
      return `<${tag}${next}${closing}`
    },
  )
}

/** One filled rectangle covering a 2×2 black block. */
export function traceBlock(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect x="0" y="0" width="2" height="2" fill="#000000"/></svg>'
}

/** Darker luma maps to a denser ramp character. Each full row is `width` characters. */
export function asciiFromLuma(luma: number[], width: number): string {
  const cols = Math.max(1, Math.floor(width))
  const rows = Math.floor(luma.length / cols)
  const lines: string[] = []
  const last = ASCII_RAMP.length - 1
  for (let y = 0; y < rows; y += 1) {
    let line = ''
    for (let x = 0; x < cols; x += 1) {
      const value = luma[y * cols + x]
      const clamped = Number.isFinite(value) ? Math.min(255, Math.max(0, value)) : 255
      line += ASCII_RAMP[Math.round((clamped / 255) * last)]
    }
    lines.push(line)
  }
  return lines.join('\n')
}

/** Ascending copy. The input array is left as it was. */
export function sortRow(pixels: number[]): number[] {
  return [...pixels].sort((a, b) => a - b)
}

/** Photo-booth frame count, clamped to 2, 3, or 4. */
export function boothStripCount(frames: number): number {
  const rounded = Math.round(frames)
  if (!Number.isFinite(rounded)) return 2
  if (rounded < 2) return 2
  if (rounded > 4) return 4
  return rounded
}

export function outputName(mode: string): string {
  return OUTPUT_NAMES[mode] ?? 'imagefx.png'
}

export function takeFiles(files: File[], mode: string): File[] {
  const accepted = files.filter((file) =>
    mode === 'ascii' ? isVideoBlob(file) || isImageBlob(file) : isImageBlob(file),
  )
  if (mode === 'booth') return accepted.slice(0, 4)
  return accepted.slice(0, 1)
}

export function applyLook(data: Uint8ClampedArray, width: number, height: number, look: Look): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const maxR = Math.hypot(cx, cy) || 1
  const seed = look === 'newspaper' ? 2 : look === 'decade' ? 5 : look === 'disposable' ? 9 : 13
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      let r = data[i] ?? 0
      let g = data[i + 1] ?? 0
      let b = data[i + 2] ?? 0
      const alpha = data[i + 3] ?? 255
      const tone = lumaOf(r, g, b)
      const grain = hashUnit(x, y, seed) - 0.5
      const dist = Math.min(1, Math.hypot((x - cx) / maxR, (y - cy) / maxR))
      if (look === 'newspaper') {
        const contrasted = clampByte((tone - 128) * 1.7 + 128)
        const cell = 5
        const ox = (x % cell) - (cell - 1) / 2
        const oy = (y % cell) - (cell - 1) / 2
        const ink = 1 - contrasted / 255
        const dot = Math.hypot(ox, oy) / (cell * 0.52)
        const bit = dot < ink ? 24 : 232
        r = g = b = clampByte(bit + grain * 12)
      } else if (look === 'decade') {
        const sr = r * 0.393 + g * 0.769 + b * 0.189
        const sg = r * 0.349 + g * 0.686 + b * 0.168
        const sb = r * 0.272 + g * 0.534 + b * 0.131
        r = clampByte(sr * 0.72 + 52 + grain * 16)
        g = clampByte(sg * 0.68 + 42 + grain * 14)
        b = clampByte(sb * 0.62 + 30 + grain * 12)
      } else if (look === 'disposable') {
        const flash = (1 - dist) ** 1.5 * 78
        r = clampByte(r * 1.06 + 16 + flash + grain * 30)
        g = clampByte(g * 0.96 + 4 + flash * 0.82 + grain * 26)
        b = clampByte(b * 0.78 + flash * 0.45 + grain * 22)
        const vig = 1 - dist * 0.48
        r = clampByte(r * vig)
        g = clampByte(g * vig)
        b = clampByte(b * vig)
      } else {
        const avg = (r + g + b) / 3
        const sat = 1.4
        r = avg + (r - avg) * sat
        g = avg + (g - avg) * sat
        b = avg + (b - avg) * sat
        const flash = (1 - dist) ** 2.1 * 34
        r = clampByte((r - 128) * 1.16 + 128 + flash + grain * 16)
        g = clampByte((g - 128) * 1.1 + 128 + flash * 0.9 + grain * 14)
        b = clampByte((b - 128) * 1.04 + 120 + flash * 0.65 + grain * 14)
      }
      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = alpha
    }
  }
  return out
}

export function applyFisheye(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = fisheyeIndex(x, y, width, height) * 4
      const dest = (y * width + x) * 4
      out[dest] = data[src] ?? 0
      out[dest + 1] = data[src + 1] ?? 0
      out[dest + 2] = data[src + 2] ?? 0
      out[dest + 3] = data[src + 3] ?? 255
    }
  }
  return out
}

export function sortImageRows(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  if (width < 1 || height < 1) return out
  for (let y = 0; y < height; y += 1) {
    const packed = new Array<number>(width)
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const tone = lumaOf(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)
      packed[x] = Math.round(tone * 10) * (width + 1) + x
    }
    const ordered = sortRow(packed)
    for (let x = 0; x < width; x += 1) {
      const srcX = ordered[x] % (width + 1)
      const src = (y * width + srcX) * 4
      const dest = (y * width + x) * 4
      out[dest] = data[src] ?? 0
      out[dest + 1] = data[src + 1] ?? 0
      out[dest + 2] = data[src + 2] ?? 0
      out[dest + 3] = data[src + 3] ?? 255
    }
  }
  return out
}

/** Multiply mixed with overlay, using the season colors as a diagonal drape. */
export function applySeason(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  colors: readonly string[],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  const stops = (colors.length ? colors : ['#888888']).map(hexToRgb)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tx = width <= 1 ? 0 : x / (width - 1)
      const ty = height <= 1 ? 0 : y / (height - 1)
      const t = Math.min(1, Math.max(0, tx * 0.75 + ty * 0.25))
      const scaled = t * (stops.length - 1)
      const left = Math.min(stops.length - 1, Math.floor(scaled))
      const right = Math.min(stops.length - 1, left + 1)
      const mix = scaled - left
      const cr = stops[left][0] + (stops[right][0] - stops[left][0]) * mix
      const cg = stops[left][1] + (stops[right][1] - stops[left][1]) * mix
      const cb = stops[left][2] + (stops[right][2] - stops[left][2]) * mix
      const i = (y * width + x) * 4
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      const multiplyR = (r * cr) / 255
      const multiplyG = (g * cg) / 255
      const multiplyB = (b * cb) / 255
      out[i] = clampByte(multiplyR * 0.5 + channelOverlay(r, cr) * 0.5)
      out[i + 1] = clampByte(multiplyG * 0.5 + channelOverlay(g, cg) * 0.5)
      out[i + 2] = clampByte(multiplyB * 0.5 + channelOverlay(b, cb) * 0.5)
      out[i + 3] = data[i + 3] ?? 255
    }
  }
  return out
}

export function asciiFromRaster(data: Uint8ClampedArray, width: number, height: number, columns = 72): string {
  if (width < 1 || height < 1) return ''
  const cols = Math.max(1, Math.min(160, Math.floor(columns)))
  const rows = Math.max(1, Math.round((height / width) * cols * 0.55))
  const samples: number[] = []
  for (let y = 0; y < rows; y += 1) {
    const sy = Math.min(height - 1, Math.floor(((y + 0.5) * height) / rows))
    for (let x = 0; x < cols; x += 1) {
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) * width) / cols))
      const i = (sy * width + sx) * 4
      samples.push(lumaOf(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0))
    }
  }
  return asciiFromLuma(samples, cols)
}

/**
 * Coarse black rectangles from a downscaled threshold.
 * Not a full outline trace — `traceBlock` is the solid 2×2 case.
 */
export function traceRaster(data: Uint8ClampedArray, width: number, height: number, columns = 48): string {
  if (width < 1 || height < 1) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"></svg>'
  const cols = Math.max(2, Math.min(64, Math.floor(columns)))
  const rows = Math.max(2, Math.round((height / width) * cols))
  const rects: string[] = []
  for (let y = 0; y < rows; y += 1) {
    const sy = Math.min(height - 1, Math.floor(((y + 0.5) * height) / rows))
    let x = 0
    while (x < cols) {
      const sample = (column: number) => {
        const sx = Math.min(width - 1, Math.floor(((column + 0.5) * width) / cols))
        const i = (sy * width + sx) * 4
        const tone = lumaOf(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)
        return tone < 128 && (data[i + 3] ?? 255) > 16
      }
      if (!sample(x)) {
        x += 1
        continue
      }
      let end = x + 1
      while (end < cols && sample(end)) end += 1
      rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="#000000"/>`)
      x = end
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}">${rects.join('')}</svg>`
}

/** Decodes a local image or one video frame. Nothing is uploaded. */
export async function loadStill(file: Blob, maxSide = 960): Promise<Raster> {
  if (isVideoBlob(file)) return loadVideoStill(file, maxSide)
  const image = await decodeImage(file)
  try {
    const size = sourceSize(image)
    if (size.width < 1 || size.height < 1) throw new Error('Could not read that image.')
    const fit = fittedSize(size.width, size.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = fit.width
    canvas.height = fit.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable in this browser.')
    ctx.drawImage(image, 0, 0, fit.width, fit.height)
    return rasterFromCanvas(canvas)
  } finally {
    if ('close' in image && typeof image.close === 'function') image.close()
  }
}

export function paintRaster(canvas: HTMLCanvasElement, raster: Raster, look?: Look): void {
  if (raster.width < 1 || raster.height < 1) return
  if (raster.data.length < raster.width * raster.height * 4) return
  canvas.width = raster.width
  canvas.height = raster.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const copy = new Uint8ClampedArray(raster.data.subarray(0, raster.width * raster.height * 4))
  ctx.putImageData(new ImageData(copy, raster.width, raster.height), 0, 0)
  if (look) paintStamp(ctx, look, raster.width, raster.height, new Date())
}

export function paintBooth(
  canvas: HTMLCanvasElement,
  frames: { canvas: HTMLCanvasElement }[],
  requested: number,
): void {
  if (!frames.length) return
  const count = boothStripCount(requested)
  const chosen = Array.from({ length: count }, (_, index) => frames[index % frames.length])
  const frameW = 520
  const frameH = 390
  const margin = 28
  const gap = 16
  canvas.width = frameW + margin * 2
  canvas.height = margin * 2 + count * frameH + (count - 1) * gap
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#f4efe6'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  chosen.forEach((frame, index) => {
    const x = margin
    const y = margin + index * (frameH + gap)
    const srcW = frame.canvas.width || 1
    const srcH = frame.canvas.height || 1
    const scale = Math.max(frameW / srcW, frameH / srcH)
    const dw = srcW * scale
    const dh = srcH * scale
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, frameW, frameH)
    ctx.clip()
    ctx.drawImage(frame.canvas, x + (frameW - dw) / 2, y + (frameH - dh) / 2, dw, dh)
    ctx.restore()
    ctx.strokeStyle = '#1b1b1b'
    ctx.lineWidth = 3
    ctx.strokeRect(x + 1.5, y + 1.5, frameW - 3, frameH - 3)
  })
}

/** In-tab pan, zoom, and a few ghost frames. This is not a Live Photo parser. */
export function paintKenBurns(canvas: HTMLCanvasElement, source: HTMLCanvasElement, frame: number): void {
  const width = source.width
  const height = source.height
  if (width < 1 || height < 1) return
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const t = (Math.sin(frame / 80) + 1) / 2
  const scale = 1.02 + t * 0.07
  const panX = (t - 0.5) * width * 0.06
  const panY = (0.5 - t) * height * 0.04
  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, width, height)
  for (let ghost = 4; ghost >= 0; ghost -= 1) {
    const drift = ghost * 3.5
    ctx.globalAlpha = ghost === 0 ? 1 : 0.15
    const dw = width * scale
    const dh = height * scale
    ctx.drawImage(source, (width - dw) / 2 + panX + drift, (height - dh) / 2 + panY + drift * 0.35, dw, dh)
  }
  ctx.globalAlpha = 1
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not encode the PNG.'))
    }, 'image/png')
  })
}
