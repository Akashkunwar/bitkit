/**
 * Pulls images embedded in a PDF out as files. This is not a render of the
 * page — a photo placed in a document comes back on its own, and a page of
 * text comes back with nothing.
 */

import { destroyPdfJs, openPdfJs } from './pdfJs'
import { pdfjs } from './pdfjsRuntime'

type RawImage = {
  width: number
  height: number
  data?: Uint8ClampedArray | Uint8Array
  bitmap?: ImageBitmap
  kind?: number
}

function canvasFromRaw(image: RawImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  if (image.bitmap) {
    ctx.drawImage(image.bitmap, 0, 0)
    return canvas
  }
  const data = image.data
  if (!data) throw new Error('This image has no pixel data.')
  const pixels = ctx.createImageData(image.width, image.height)
  if (data.length === image.width * image.height * 4) {
    pixels.data.set(data)
  } else if (data.length === image.width * image.height * 3) {
    for (let s = 0, d = 0; s < data.length; s += 3, d += 4) {
      pixels.data[d] = data[s]
      pixels.data[d + 1] = data[s + 1]
      pixels.data[d + 2] = data[s + 2]
      pixels.data[d + 3] = 255
    }
  } else {
    throw new Error('This image uses a pixel layout BitKit cannot unpack.')
  }
  ctx.putImageData(pixels, 0, 0)
  return canvas
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed.'))), 'image/png')
  })
}

export async function extractEmbeddedImages(data: Uint8Array): Promise<File[]> {
  const doc = await openPdfJs(pdfjs, data)
  const files: File[] = []
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber)
      const ops = await page.getOperatorList()
      const seen = new Set<string>()
      for (let i = 0; i < ops.fnArray.length; i += 1) {
        const fn = ops.fnArray[i]
        if (fn !== pdfjs.OPS.paintImageXObject) continue
        const name = String(ops.argsArray[i][0])
        if (seen.has(name)) continue
        seen.add(name)
        const image = (await new Promise((resolve) => {
          page.objs.get(name, resolve)
        })) as RawImage | null
        if (!image?.width || !image.height) continue
        const canvas = canvasFromRaw(image)
        const blob = await toPng(canvas)
        const index = files.length + 1
        files.push(new File([blob], `image-${index}.png`, { type: 'image/png' }))
      }
      page.cleanup()
    }
  } finally {
    await destroyPdfJs(doc)
  }
  return files
}
