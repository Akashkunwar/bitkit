import { computeTargetSize, nextQualityBounds, type SizeOptions } from './size'
import { stageDownscale, CANVAS_SAFE_MAX } from './limits'

export type EncodeMime = 'image/jpeg' | 'image/webp' | 'image/png'

export type CompressOptions = SizeOptions & {
  mime?: EncodeMime
  quality?: number
  maxBytes?: number
  background?: string
}

export type CompressResult = {
  blob: Blob
  width: number
  height: number
  quality: number
  withinLimit: boolean
}

type BitmapLike = ImageBitmap | HTMLImageElement | OffscreenCanvas | HTMLCanvasElement

export async function decodeImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through
    }
  }
  return loadHtmlImage(file)
}

function loadHtmlImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode this image in the browser.'))
    }
    img.src = url
  })
}

function sourceSize(source: BitmapLike): { width: number; height: number } {
  if ('naturalWidth' in source && source.naturalWidth) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  return { width: source.width, height: source.height }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mime: EncodeMime,
  quality: number,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: mime, quality })
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed.'))),
      mime,
      quality,
    )
  })
}

function get2d(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx || !('drawImage' in ctx)) throw new Error('Canvas is unavailable in this browser.')
  return ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
}

function draw(
  source: BitmapLike,
  opts: SizeOptions,
  background?: string,
): { canvas: HTMLCanvasElement | OffscreenCanvas; width: number; height: number } {
  const { width: srcW, height: srcH } = sourceSize(source)
  let rect = computeTargetSize(srcW, srcH, opts)
  const staged = stageDownscale(rect.width, rect.height, CANVAS_SAFE_MAX)
  if (staged.width !== rect.width || staged.height !== rect.height) {
    rect = { ...rect, width: staged.width, height: staged.height }
  }

  const canvas = makeCanvas(rect.width, rect.height)
  const ctx = get2d(canvas)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, rect.width, rect.height)
  }
  ctx.drawImage(source as CanvasImageSource, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.width, rect.height)
  return { canvas, width: rect.width, height: rect.height }
}

export async function compressImage(file: Blob, options: CompressOptions = {}): Promise<CompressResult> {
  const mime: EncodeMime = options.mime ?? (options.maxBytes ? 'image/jpeg' : 'image/png')
  const source = await decodeImage(file)
  const drawn = draw(source, options, mime === 'image/jpeg' ? options.background ?? '#ffffff' : options.background)

  const encode = (quality: number) => canvasToBlob(drawn.canvas, mime, quality)

  if (!options.maxBytes || mime === 'image/png') {
    const quality = options.quality ?? 0.92
    const blob = await encode(quality)
    const withinLimit = !options.maxBytes || blob.size <= options.maxBytes
    if ('close' in source) source.close()
    return { blob, width: drawn.width, height: drawn.height, quality, withinLimit }
  }

  // Bisect for the *highest* quality that still fits. Descending-only search
  // would stop at the first quality under the limit and throw away headroom.
  const ceiling = options.quality ?? 0.95
  let low = 0.32
  let high = ceiling
  let quality = ceiling
  let blob = await encode(quality)
  if (blob.size > options.maxBytes) {
    let best: Blob | null = null
    let bestQuality = low
    for (let i = 0; i < 8; i += 1) {
      const next = nextQualityBounds(low, high, quality, blob.size, options.maxBytes)
      low = next.low
      high = next.high
      quality = next.quality
      blob = await encode(quality)
      if (blob.size <= options.maxBytes && quality > bestQuality) {
        best = blob
        bestQuality = quality
      }
    }
    if (best && blob.size > options.maxBytes) {
      blob = best
      quality = bestQuality
    }
  }

  let width = drawn.width
  let height = drawn.height
  let canvas = drawn.canvas
  let guard = 0
  while (blob.size > options.maxBytes && guard < 8) {
    guard += 1
    width = Math.max(1, Math.round(width * 0.85))
    height = Math.max(1, Math.round(height * 0.85))
    const next = makeCanvas(width, height)
    const ctx = get2d(next)
    if (mime === 'image/jpeg') {
      ctx.fillStyle = options.background ?? '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(canvas, 0, 0, width, height)
    canvas = next
    quality = Math.max(0.45, quality)
    blob = await canvasToBlob(canvas, mime, quality)
  }

  if ('close' in source) source.close()
  return {
    blob,
    width,
    height,
    quality,
    withinLimit: blob.size <= options.maxBytes,
  }
}
