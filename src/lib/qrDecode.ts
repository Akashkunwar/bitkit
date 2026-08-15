import jsQR from 'jsqr'

export async function decodeQrFromImageData(data: ImageData): Promise<string | null> {
  const result = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' })
  return result?.data ?? null
}

export async function decodeQrFromBlob(blob: Blob): Promise<string | null> {
  if (typeof BarcodeDetector !== 'undefined') {
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] })
      const codes = await detector.detect(blob)
      if (codes[0]?.rawValue) return codes[0].rawValue
    } catch {
      /* jsQR fallback */
    }
  }
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return decodeQrFromImageData(data)
}

export async function decodeQrFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return decodeQrFromImageData(data)
}
