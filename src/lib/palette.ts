/** A handful of colours that actually occur in a picture, most frequent first. */

export type Swatch = { r: number; g: number; b: number; share: number }

function bucket(r: number, g: number, b: number): number {
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
}

export function paletteFromPixels(data: Uint8ClampedArray, count = 6): Swatch[] {
  const bins = new Map<number, { r: number; g: number; b: number; n: number }>()
  const pixels = Math.floor(data.length / 4)
  const step = Math.max(1, Math.floor(pixels / 8000))
  let seen = 0
  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] < 16) continue
    const key = bucket(data[i], data[i + 1], data[i + 2])
    const hit = bins.get(key)
    if (hit) {
      hit.r += data[i]
      hit.g += data[i + 1]
      hit.b += data[i + 2]
      hit.n += 1
    } else bins.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], n: 1 })
    seen += 1
  }
  if (!seen) return []
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, Math.max(1, count))
    .map((bin) => ({
      r: Math.round(bin.r / bin.n),
      g: Math.round(bin.g / bin.n),
      b: Math.round(bin.b / bin.n),
      share: bin.n / seen,
    }))
}

export function swatchHex(swatch: Swatch): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(swatch.r)}${hex(swatch.g)}${hex(swatch.b)}`
}
