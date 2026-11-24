export type Rgba = { r: number; g: number; b: number; a: number }

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function copy(src: Uint8ClampedArray): Uint8ClampedArray {
  const next = new Uint8ClampedArray(src.length)
  next.set(src)
  return next
}

/** Clears alpha outside the circle that fits the picture. */
export function circleCrop(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const next = copy(src)
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const radius = Math.min(width, height) / 2
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy > radius * radius) next[(y * width + x) * 4 + 3] = 0
    }
  }
  return next
}

export function withBorder(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  thickness: number,
  color: Rgba,
): { data: Uint8ClampedArray; width: number; height: number } {
  const edge = Math.round(thickness)
  if (edge < 1) throw new Error('The border needs at least 1 pixel.')
  const outW = width + edge * 2
  const outH = height + edge * 2
  const data = new Uint8ClampedArray(outW * outH * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color.r
    data[i + 1] = color.g
    data[i + 2] = color.b
    data[i + 3] = color.a
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4
      const to = ((y + edge) * outW + (x + edge)) * 4
      data[to] = src[from]
      data[to + 1] = src[from + 1]
      data[to + 2] = src[from + 2]
      data[to + 3] = src[from + 3]
    }
  }
  return { data, width: outW, height: outH }
}

/** 3×3 sharpen. Edge pixels copy their neighbours when the kernel runs off the picture. */
export function sharpen(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const next = copy(src)
  const at = (x: number, y: number, channel: number) => {
    const cx = Math.max(0, Math.min(width - 1, x))
    const cy = Math.max(0, Math.min(height - 1, y))
    return src[(cy * width + cx) * 4 + channel]
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        const value =
          at(x, y, channel) * 5 -
          at(x - 1, y, channel) -
          at(x + 1, y, channel) -
          at(x, y - 1, channel) -
          at(x, y + 1, channel)
        next[(y * width + x) * 4 + channel] = clampByte(value)
      }
    }
  }
  return next
}

export function pixelate(src: Uint8ClampedArray, width: number, height: number, block: number): Uint8ClampedArray {
  const size = Math.max(2, Math.round(block))
  const next = copy(src)
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const x2 = Math.min(width, x + size)
      const y2 = Math.min(height, y + size)
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let count = 0
      for (let py = y; py < y2; py += 1) {
        for (let px = x; px < x2; px += 1) {
          const i = (py * width + px) * 4
          r += src[i]
          g += src[i + 1]
          b += src[i + 2]
          a += src[i + 3]
          count += 1
        }
      }
      const pr = clampByte(r / count)
      const pg = clampByte(g / count)
      const pb = clampByte(b / count)
      const pa = clampByte(a / count)
      for (let py = y; py < y2; py += 1) {
        for (let px = x; px < x2; px += 1) {
          const i = (py * width + px) * 4
          next[i] = pr
          next[i + 1] = pg
          next[i + 2] = pb
          next[i + 3] = pa
        }
      }
    }
  }
  return next
}
