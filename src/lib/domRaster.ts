/**
 * Turning laid-out HTML into page images, without a server.
 *
 * The browser already renders HTML perfectly, so rather than re-implementing
 * layout, the markup is serialised into an SVG <foreignObject>, loaded as an
 * image, and drawn onto a canvas. The markup must be self-contained: its CSS
 * travels inside the SVG, and images must be data: URLs (external resources
 * never load inside an SVG image, which is also what keeps this private).
 */

export type Rgb = [number, number, number]

function escapeXmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function parseHexColor(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const n = m ? parseInt(m[1], 16) : 0xffffff
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Draws self-contained HTML at `width`×`height` CSS pixels onto a canvas at `scale`. */
export async function rasterizeHtml(
  element: Element,
  options: { css: string; width: number; height: number; scale: number; background: string },
): Promise<HTMLCanvasElement> {
  const { css, width, height, scale, background } = options
  const markup = new XMLSerializer().serializeToString(element)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:${background}">` +
    `<style>${escapeXmlText(css)}</style>${markup}</div></foreignObject></svg>`

  const image = new Image()
  image.decoding = 'sync'
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () =>
      reject(new Error('The page could not be drawn. It may contain content this browser cannot render as an image.'))
  })
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await loaded

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  // Drawn once, then read back row by row to find page cuts.
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Best row to cut a tall render between pages: the lowest row at or above
 * `ideal` (but not above `min`) that is entirely background, so a cut never
 * passes through a line of text. Falls back to `ideal` when there is none —
 * a tall image or table simply has to be split.
 */
export function findCutRow(
  data: Uint8ClampedArray,
  width: number,
  ideal: number,
  min: number,
  background: Rgb,
  tolerance = 12,
): number {
  const step = Math.max(1, Math.floor(width / 400))
  const isBlank = (y: number) => {
    const row = y * width * 4
    for (let x = 0; x < width; x += step) {
      const i = row + x * 4
      if (
        Math.abs(data[i] - background[0]) > tolerance ||
        Math.abs(data[i + 1] - background[1]) > tolerance ||
        Math.abs(data[i + 2] - background[2]) > tolerance
      ) {
        return false
      }
    }
    return true
  }
  for (let y = ideal; y >= min; y -= 1) if (isBlank(y)) return y
  return ideal
}

export type SliceOptions = {
  /** Full page height in canvas pixels. */
  pageHeight: number
  /** Margins to keep on every page, in canvas pixels. */
  marginTop: number
  marginBottom: number
  background: string
}

/**
 * Splits a render taller than one page into pages of exactly `pageHeight`.
 *
 * The first page keeps the render's own top margin; each later page gets a
 * fresh top margin, so continued pages look like pages rather than crops.
 */
export function slicePages(source: HTMLCanvasElement, options: SliceOptions): HTMLCanvasElement[] {
  const { pageHeight, marginTop, marginBottom, background } = options
  if (source.height <= pageHeight) {
    const page = document.createElement('canvas')
    page.width = source.width
    page.height = pageHeight
    const ctx = page.getContext('2d')!
    ctx.fillStyle = background
    ctx.fillRect(0, 0, page.width, page.height)
    ctx.drawImage(source, 0, 0)
    return [page]
  }

  const ctx = source.getContext('2d', { willReadFrequently: true })!
  const bg = parseHexColor(background)
  const body = pageHeight - marginTop - marginBottom
  const pages: HTMLCanvasElement[] = []
  // Content runs from the source's top margin to its bottom margin.
  let y = marginTop
  const end = source.height - marginBottom
  while (y < end - 1) {
    let cut = Math.min(end, y + body)
    if (cut < end) {
      // Look back up to a quarter page for a blank row to cut on.
      const min = Math.max(y + Math.floor(body * 0.75), y + 1)
      const strip = ctx.getImageData(0, min, source.width, cut - min + 1)
      cut = min + findCutRow(strip.data, source.width, cut - min, 0, bg)
    }
    const page = document.createElement('canvas')
    page.width = source.width
    page.height = pageHeight
    const pctx = page.getContext('2d')!
    pctx.fillStyle = background
    pctx.fillRect(0, 0, page.width, page.height)
    pctx.drawImage(source, 0, y, source.width, cut - y, 0, marginTop, source.width, cut - y)
    pages.push(page)
    y = cut
  }
  return pages
}

/** All pages one above the other, for sharing a document as a single image. */
export function stackPages(pages: HTMLCanvasElement[], gap: number, background: string): HTMLCanvasElement {
  const width = Math.max(...pages.map((p) => p.width))
  const height = pages.reduce((sum, p) => sum + p.height, 0) + gap * Math.max(0, pages.length - 1)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.min(height, 32_000)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  let y = 0
  for (const page of pages) {
    if (y >= canvas.height) break
    ctx.drawImage(page, (width - page.width) / 2, y)
    y += page.height + gap
  }
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encode failed.'))), type, quality)
  })
}

/**
 * Removes images that are not data: URLs. Anything else would either fail to
 * load inside the SVG image or, worse, try to reach the network — callers
 * that want an image rendered convert it to a data: URL first.
 */
export function stripExternalImages(root: Element): void {
  for (const img of root.querySelectorAll('img')) {
    const src = img.getAttribute('src') ?? ''
    if (!src.startsWith('data:')) img.removeAttribute('src')
  }
}

/** Reads a Blob as a data: URL, for images that must render inside a raster. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'))
    reader.readAsDataURL(blob)
  })
}
