import { PDFDocument, PageSizes } from 'pdf-lib'
import { decodeImage } from './image/compress'

export type PageFit = 'fit' | 'a4' | 'letter'

const SIZES: Record<Exclude<PageFit, 'fit'>, [number, number]> = {
  a4: PageSizes.A4,
  letter: PageSizes.Letter,
}

async function toEmbeddable(blob: Blob): Promise<{ kind: 'jpeg' | 'png'; bytes: Uint8Array }> {
  const type = blob.type
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (type === 'image/jpeg' || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
    return { kind: 'jpeg', bytes }
  }
  if (type === 'image/png' || (bytes[0] === 0x89 && bytes[1] === 0x50)) {
    return { kind: 'png', bytes }
  }
  const source = await decodeImage(blob)
  const width = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
  const height = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(source as CanvasImageSource, 0, 0)
  if ('close' in source) source.close()
  const png = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed.'))), 'image/png')
  })
  return { kind: 'png', bytes: new Uint8Array(await png.arrayBuffer()) }
}

export async function imagesToPdf(files: Blob[], fit: PageFit = 'fit'): Promise<Uint8Array> {
  if (!files.length) throw new Error('Drop at least one image.')
  const out = await PDFDocument.create()
  for (const file of files) {
    const { kind, bytes } = await toEmbeddable(file)
    const image = kind === 'jpeg' ? await out.embedJpg(bytes) : await out.embedPng(bytes)
    const { width, height } = image
    if (fit === 'fit') {
      const page = out.addPage([width, height])
      page.drawImage(image, { x: 0, y: 0, width, height })
      continue
    }
    const [pw, ph] = SIZES[fit]
    const page = out.addPage([pw, ph])
    const scale = Math.min(pw / width, ph / height)
    const w = width * scale
    const h = height * scale
    page.drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
  }
  return out.save()
}
