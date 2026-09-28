import { decodeImage } from './compress'
import { CANVAS_SAFE_MAX } from './limits'
import type { Rotation } from '../pageLayout'

/**
 * Rotation, mirroring, straightening, resizing, and re-encoding — the shared
 * pipeline behind Rotate & flip and the Image converter.
 */

export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp'

export const FORMATS: Record<
  OutputFormat,
  { mime: string; ext: string; label: string; lossy: boolean; alpha: boolean }
> = {
  png: { mime: 'image/png', ext: 'png', label: 'PNG', lossy: false, alpha: true },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG', lossy: true, alpha: false },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP', lossy: true, alpha: true },
  avif: { mime: 'image/avif', ext: 'avif', label: 'AVIF', lossy: true, alpha: true },
  bmp: { mime: 'image/bmp', ext: 'bmp', label: 'BMP', lossy: false, alpha: false },
}

export function formatForMime(mime: string): OutputFormat | null {
  const found = (Object.keys(FORMATS) as OutputFormat[]).find((key) => FORMATS[key].mime === mime)
  if (found) return found
  if (mime === 'image/jpg') return 'jpeg'
  return null
}

const encodeSupport = new Map<string, Promise<boolean>>()

/**
 * Whether this browser's canvas can encode `mime`. Browsers that cannot
 * silently hand back a PNG instead, so the check looks at the blob's type.
 * BMP is always available: it is written by hand below.
 */
export function canEncode(format: OutputFormat): Promise<boolean> {
  if (format === 'bmp' || format === 'png' || format === 'jpeg') return Promise.resolve(true)
  const mime = FORMATS[format].mime
  let pending = encodeSupport.get(mime)
  if (!pending) {
    pending = new Promise<boolean>((resolve) => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 2
        canvas.height = 2
        canvas.toBlob((blob) => resolve(blob?.type === mime), mime, 0.8)
      } catch {
        resolve(false)
      }
    })
    encodeSupport.set(mime, pending)
  }
  return pending
}

/** Bounding box of a w×h rectangle rotated by `degrees`. */
export function rotatedBounds(width: number, height: number, degrees: number): { width: number; height: number } {
  const rad = (Math.abs(degrees) * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return { width: width * cos + height * sin, height: width * sin + height * cos }
}

/**
 * Largest axis-aligned rectangle with the image's aspect ratio that fits
 * inside the image once it is rotated by `degrees` — "crop to fit" when
 * straightening, so no empty corners show.
 */
export function inscribedSize(width: number, height: number, degrees: number): { width: number; height: number } {
  const rad = (Math.abs(degrees % 180) * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  if (sin < 1e-9) return { width, height }
  // Scale factor s such that the s·w × s·h rectangle fits in the rotated image.
  const scale = Math.min(width / (width * cos + height * sin), height / (width * sin + height * cos))
  return { width: width * scale, height: height * scale }
}

export type TransformOptions = {
  rotation?: Rotation
  flipX?: boolean
  flipY?: boolean
  /** Fine rotation in degrees, applied after the quarter turns. */
  angle?: number
  /** How straightening treats corners: grow the canvas, or crop them away. */
  angleMode?: 'expand' | 'crop'
  /** Fill for transparent areas and for formats without alpha; null keeps transparency. */
  background?: string | null
  /** Resize factor, 0–1; ignored when maxSide is set. */
  scale?: number
  /** Cap on the longest side in pixels. */
  maxSide?: number | null
  format: OutputFormat
  quality?: number
}

export function outputSize(
  width: number,
  height: number,
  opts: Pick<TransformOptions, 'rotation' | 'angle' | 'angleMode' | 'scale' | 'maxSide'>,
): { width: number; height: number } {
  const quarter = opts.rotation === 90 || opts.rotation === 270
  let w = quarter ? height : width
  let h = quarter ? width : height
  const angle = opts.angle ?? 0
  if (angle) {
    const box = opts.angleMode === 'crop' ? inscribedSize(w, h, angle) : rotatedBounds(w, h, angle)
    w = box.width
    h = box.height
  }
  let factor = opts.scale && opts.scale > 0 ? Math.min(1, opts.scale) : 1
  if (opts.maxSide) factor = Math.min(1, opts.maxSide / Math.max(w, h))
  factor = Math.min(factor, CANVAS_SAFE_MAX / Math.max(w, h, 1))
  return { width: Math.max(1, Math.round(w * factor)), height: Math.max(1, Math.round(h * factor)) }
}

/** Uncompressed 24-bit BMP, bottom-up rows padded to four bytes. */
export function encodeBmp(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelBytes = rowSize * height
  const out = new Uint8Array(54 + pixelBytes)
  const view = new DataView(out.buffer)
  out[0] = 0x42 // B
  out[1] = 0x4d // M
  view.setUint32(2, out.length, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelBytes, true)
  view.setInt32(38, 2835, true) // 72 dpi
  view.setInt32(42, 2835, true)
  for (let y = 0; y < height; y += 1) {
    const src = (height - 1 - y) * width * 4
    const dst = 54 + y * rowSize
    for (let x = 0; x < width; x += 1) {
      out[dst + x * 3] = data[src + x * 4 + 2]
      out[dst + x * 3 + 1] = data[src + x * 4 + 1]
      out[dst + x * 3 + 2] = data[src + x * 4]
    }
  }
  return out
}

export function drawTransformed(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  natural: { width: number; height: number },
  out: { width: number; height: number },
  opts: Pick<TransformOptions, 'rotation' | 'flipX' | 'flipY' | 'angle' | 'angleMode' | 'background'>,
): void {
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, out.width, out.height)
  }
  const rotation = opts.rotation ?? 0
  const quarter = rotation === 90 || rotation === 270
  const turnedW = quarter ? natural.height : natural.width
  const turnedH = quarter ? natural.width : natural.height
  const angle = opts.angle ?? 0
  const box =
    angle && opts.angleMode === 'crop'
      ? inscribedSize(turnedW, turnedH, angle)
      : angle
        ? rotatedBounds(turnedW, turnedH, angle)
        : { width: turnedW, height: turnedH }
  const scale = out.width / box.width
  ctx.imageSmoothingQuality = 'high'
  ctx.save()
  ctx.translate(out.width / 2, out.height / 2)
  ctx.scale(scale, scale)
  ctx.rotate(((rotation + angle) * Math.PI) / 180)
  ctx.scale(opts.flipX ? -1 : 1, opts.flipY ? -1 : 1)
  ctx.drawImage(source, -natural.width / 2, -natural.height / 2)
  ctx.restore()
}

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encode failed.'))), mime, quality)
  })
}

/** Decodes, transforms, and re-encodes one image. EXIF metadata is not carried over. */
export async function transformImage(file: Blob, opts: TransformOptions): Promise<Blob> {
  const source = await decodeImage(file)
  try {
    const natural =
      'naturalWidth' in source && source.naturalWidth
        ? { width: source.naturalWidth, height: source.naturalHeight }
        : { width: source.width, height: source.height }
    const out = outputSize(natural.width, natural.height, opts)
    const canvas = document.createElement('canvas')
    canvas.width = out.width
    canvas.height = out.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')
    const info = FORMATS[opts.format]
    // Formats without transparency get a fill, or transparent pixels turn black.
    const background = info.alpha ? (opts.background ?? null) : (opts.background ?? '#ffffff')
    drawTransformed(ctx, source as CanvasImageSource, natural, out, { ...opts, background })

    if (opts.format === 'bmp') {
      const pixels = ctx.getImageData(0, 0, out.width, out.height).data
      const bytes = encodeBmp(pixels, out.width, out.height)
      return new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'image/bmp' })
    }
    const blob = await canvasBlob(canvas, info.mime, info.lossy ? (opts.quality ?? 0.9) : undefined)
    if (blob.type !== info.mime) throw new Error(`This browser cannot save ${info.label} images.`)
    return blob
  } finally {
    if ('close' in source) source.close()
  }
}

/** "photo.jpeg" + webp → "photo.webp"; with a suffix, "photo-rotated.webp". */
export function renameFor(name: string, format: OutputFormat, suffix = ''): string {
  const base = name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}${suffix}.${FORMATS[format].ext}`
}
