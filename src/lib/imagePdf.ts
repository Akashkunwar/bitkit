import { PDFDocument, rgb } from 'pdf-lib'
import { decodeImage } from './image/compress'
import { CANVAS_SAFE_MAX } from './image/limits'
import {
  MARGINS,
  pageFor,
  placeImage,
  rotatedSize,
  targetPixels,
  type ImageFit,
  type Margin,
  type Orientation,
  type PageSize,
  type Rotation,
} from './pageLayout'

export type PdfImageInput = { file: Blob; rotation?: Rotation }

export type ImagesToPdfOptions = {
  pageSize: PageSize
  orientation: Orientation
  fit: ImageFit
  margin: Margin
  /** Page colour behind the image, as #rrggbb. */
  background: string
  /** JPEG quality 0–1 for photos. PNG sources stay lossless. */
  quality: number
  /** Cap embedded resolution; null keeps every source pixel. */
  dpi: number | null
  title?: string
  onProgress?: (done: number, total: number) => void
}

export const DEFAULT_IMAGE_PDF: ImagesToPdfOptions = {
  pageSize: 'a4',
  orientation: 'auto',
  fit: 'contain',
  margin: 'small',
  background: '#ffffff',
  quality: 0.9,
  dpi: 300,
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const n = m ? parseInt(m[1], 16) : 0xffffff
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

function sourceSize(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  const width = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
  const height = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
  return { width, height }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encode failed.'))), type, quality)
  })
}

/**
 * Draws the rotated source, cropped to `crop` (in rotated pixel space), onto a
 * canvas of `out` size. Rotation is baked in here so pdf-lib never needs to
 * rotate a page, which some viewers handle inconsistently.
 */
function renderRotated(
  source: CanvasImageSource,
  natural: { width: number; height: number },
  rotation: Rotation,
  crop: { x: number; y: number; width: number; height: number },
  out: { width: number; height: number },
  opaque: string | null,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = out.width
  canvas.height = out.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  if (opaque) {
    ctx.fillStyle = opaque
    ctx.fillRect(0, 0, out.width, out.height)
  }
  ctx.imageSmoothingQuality = 'high'
  const scale = out.width / crop.width
  ctx.scale(scale, out.height / crop.height)
  ctx.translate(-crop.x, -crop.y)
  const rotated = rotatedSize(natural.width, natural.height, rotation)
  ctx.translate(rotated.width / 2, rotated.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(source, -natural.width / 2, -natural.height / 2)
  return canvas
}

/**
 * Builds one PDF from images, one page each, in the order given.
 *
 * Every image is decoded (EXIF orientation applied), rotated, cropped for
 * cover, downsampled to the chosen DPI, and re-encoded before embedding.
 * Screenshots (PNG) stay PNG so text in them stays crisp; everything else is
 * JPEG at the chosen quality.
 */
export async function imagesToPdf(
  inputs: (Blob | PdfImageInput)[],
  options: Partial<ImagesToPdfOptions> = {},
): Promise<Uint8Array> {
  const opts = { ...DEFAULT_IMAGE_PDF, ...options }
  const items = inputs.map((input) => (input instanceof Blob ? { file: input, rotation: 0 as Rotation } : input))
  if (!items.length) throw new Error('Add at least one image.')

  const out = await PDFDocument.create()
  if (opts.title) out.setTitle(opts.title)
  out.setCreator('BitKit')
  out.setProducer('BitKit (pdf-lib)')
  const margin = MARGINS[opts.margin]
  const background = hexToRgb(opts.background)
  const whitePage = opts.background.toLowerCase() === '#ffffff'

  for (let i = 0; i < items.length; i += 1) {
    const { file, rotation = 0 } = items[i]
    const source = await decodeImage(file)
    try {
      const natural = sourceSize(source)
      const rotated = rotatedSize(natural.width, natural.height, rotation)
      const page = pageFor(rotated.width, rotated.height, opts.pageSize, opts.orientation, margin)
      const { dest, crop } = placeImage(rotated.width, rotated.height, page.width, page.height, margin, opts.fit)

      let pixels = targetPixels(crop, dest, opts.pageSize === 'fit' ? null : opts.dpi)
      const cap = Math.min(1, CANVAS_SAFE_MAX / Math.max(pixels.width, pixels.height))
      pixels = {
        width: Math.max(1, Math.round(pixels.width * cap)),
        height: Math.max(1, Math.round(pixels.height * cap)),
      }

      const lossless = file.type === 'image/png' || file.type === 'image/gif'
      const canvas = renderRotated(
        source as CanvasImageSource,
        natural,
        rotation,
        crop,
        pixels,
        lossless ? null : opts.background,
      )
      const encoded = await toBlob(canvas, lossless ? 'image/png' : 'image/jpeg', opts.quality)
      const bytes = new Uint8Array(await encoded.arrayBuffer())
      const image = lossless ? await out.embedPng(bytes) : await out.embedJpg(bytes)

      const pdfPage = out.addPage([page.width, page.height])
      if (!whitePage) {
        pdfPage.drawRectangle({
          x: 0,
          y: 0,
          width: page.width,
          height: page.height,
          color: rgb(background.r, background.g, background.b),
        })
      }
      pdfPage.drawImage(image, dest)
    } finally {
      if ('close' in source) source.close()
    }
    opts.onProgress?.(i + 1, items.length)
  }
  return out.save()
}
