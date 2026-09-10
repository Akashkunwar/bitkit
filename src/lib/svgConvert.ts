import { decodeImage } from './image/compress'
import { stageDownscale } from './image/limits'

export async function svgFileToPng(file: Blob, scale = 2): Promise<Blob> {
  const text = await file.text()
  const svg = new Blob([text], { type: 'image/svg+xml' })
  const source = await decodeImage(svg)
  const rawW = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
  const rawH = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
  const sized = stageDownscale(rawW, rawH)
  const width = sized.width * scale
  const height = sized.height * scale
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height)
  if ('close' in source) source.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed.'))), 'image/png')
  })
}

/** Wrap a raster image in SVG. This is not vectorization — it is an honest container. */
export async function rasterToSvg(file: Blob): Promise<string> {
  const source = await decodeImage(file)
  const rawW = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
  const rawH = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
  const { width, height } = stageDownscale(rawW, rawH)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height)
  if ('close' in source) source.close()
  const png = await new Promise<string>((resolve) => {
    resolve(canvas.toDataURL('image/png'))
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n  <image href="${png}" width="${width}" height="${height}"/>\n</svg>\n`
}
