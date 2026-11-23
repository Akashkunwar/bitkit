/**
 * Pixel difference for two same-sized images. A channel must move by more
 * than a small threshold so JPEG noise does not paint the whole page red.
 */

const THRESHOLD = 18

export type PixelDiff = {
  changed: number
  total: number
  /** RGBA overlay: unchanged pixels are dimmed, changes are red. */
  overlay: Uint8ClampedArray
}

export function diffPixels(a: Uint8ClampedArray, b: Uint8ClampedArray): PixelDiff {
  if (a.length !== b.length || a.length % 4 !== 0) {
    throw new Error('The two pages are not the same size, so they cannot be compared pixel for pixel.')
  }
  const overlay = new Uint8ClampedArray(a.length)
  let changed = 0
  const total = a.length / 4
  for (let i = 0; i < a.length; i += 4) {
    const delta = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
    if (delta > THRESHOLD) {
      changed += 1
      overlay[i] = 220
      overlay[i + 1] = 40
      overlay[i + 2] = 40
      overlay[i + 3] = 210
    } else {
      overlay[i] = a[i]
      overlay[i + 1] = a[i + 1]
      overlay[i + 2] = a[i + 2]
      overlay[i + 3] = 255
    }
  }
  return { changed, total, overlay }
}

/** Pixel edits that stay on a Uint8ClampedArray so they can be tested without a canvas. */

export function invertRgba(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = 255 - out[i]
    out[i + 1] = 255 - out[i + 1]
    out[i + 2] = 255 - out[i + 2]
  }
  return out
}

export function halftoneRgba(data: Uint8ClampedArray, width: number, height: number, cell: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4)
  out.fill(255)
  const size = Math.max(4, cell)
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      let sum = 0
      let count = 0
      for (let yy = y; yy < Math.min(height, y + size); yy += 1) {
        for (let xx = x; xx < Math.min(width, x + size); xx += 1) {
          const i = (yy * width + xx) * 4
          sum += data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11
          count += 1
        }
      }
      const darkness = 1 - sum / count / 255
      const radius = (size / 2) * darkness
      const cx = x + size / 2
      const cy = y + size / 2
      for (let yy = y; yy < Math.min(height, y + size); yy += 1) {
        for (let xx = x; xx < Math.min(width, x + size); xx += 1) {
          const dx = xx + 0.5 - cx
          const dy = yy + 0.5 - cy
          const i = (yy * width + xx) * 4
          const ink = dx * dx + dy * dy <= radius * radius
          out[i] = ink ? 20 : 255
          out[i + 1] = ink ? 20 : 255
          out[i + 2] = ink ? 20 : 255
          out[i + 3] = 255
        }
      }
    }
  }
  return out
}

export function ditherRgba(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const gray = new Float32Array(width * height)
  for (let i = 0; i < gray.length; i += 1) {
    const p = i * 4
    gray[i] = data[p] * 0.3 + data[p + 1] * 0.59 + data[p + 2] * 0.11
  }
  const out = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x
      const old = gray[i]
      const next = old < 128 ? 0 : 255
      const err = old - next
      gray[i] = next
      if (x + 1 < width) gray[i + 1] += (err * 7) / 16
      if (y + 1 < height && x > 0) gray[i + width - 1] += (err * 3) / 16
      if (y + 1 < height) gray[i + width] += (err * 5) / 16
      if (y + 1 < height && x + 1 < width) gray[i + width + 1] += err / 16
      const p = i * 4
      out[p] = next
      out[p + 1] = next
      out[p + 2] = next
      out[p + 3] = 255
    }
  }
  return out
}
