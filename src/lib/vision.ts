import type { Rgb } from './contrast'

export type VisionType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'

export const VISION_TYPES: { value: VisionType; label: string; note: string }[] = [
  { value: 'deuteranopia', label: 'Deuteranopia', note: 'No green cone — the most common type, about 1 in 16 men.' },
  { value: 'protanopia', label: 'Protanopia', note: 'No red cone — reds darken toward black.' },
  { value: 'tritanopia', label: 'Tritanopia', note: 'No blue cone — rare, affects blue/yellow.' },
  { value: 'achromatopsia', label: 'Achromatopsia', note: 'No colour at all — full monochrome.' },
]

/**
 * Brettel/Viénot-style simulation in linear RGB. These matrices are the widely
 * used approximation: good enough to catch "these two states look identical",
 * which is the question a designer is actually asking.
 */
const MATRICES: Record<Exclude<VisionType, 'achromatopsia'>, number[]> = {
  protanopia: [0.1121, 0.8853, -0.0005, 0.1127, 0.8897, -0.0001, 0.0045, 0.0085, 0.9913],
  deuteranopia: [0.292, 0.7054, -0.0003, 0.2934, 0.7089, 0.0001, -0.0195, 0.0333, 0.9808],
  tritanopia: [0.9057, 0.1799, -0.0856, 0.0129, 0.8371, 0.1501, 0.0782, -0.4059, 1.3277],
}

function toLinear(v: number): number {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function toSrgb(v: number): number {
  const clamped = Math.min(1, Math.max(0, v))
  const s = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055
  return Math.round(s * 255)
}

export function simulateRgb(rgb: Rgb, type: VisionType): Rgb {
  if (type === 'achromatopsia') {
    const y = toSrgb(0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b))
    return { r: y, g: y, b: y }
  }
  const m = MATRICES[type]
  const r = toLinear(rgb.r)
  const g = toLinear(rgb.g)
  const b = toLinear(rgb.b)
  return {
    r: toSrgb(m[0] * r + m[1] * g + m[2] * b),
    g: toSrgb(m[3] * r + m[4] * g + m[5] * b),
    b: toSrgb(m[6] * r + m[7] * g + m[8] * b),
  }
}

/** Applies the simulation to raw canvas pixel data, in place. */
export function simulateImageData(data: Uint8ClampedArray, type: VisionType): void {
  for (let i = 0; i < data.length; i += 4) {
    const out = simulateRgb({ r: data[i], g: data[i + 1], b: data[i + 2] }, type)
    data[i] = out.r
    data[i + 1] = out.g
    data[i + 2] = out.b
  }
}

/**
 * Perceptual distance in OKLab-ish terms — good enough to flag two colours a
 * viewer would not be able to tell apart after simulation.
 */
export function colorDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  // Weighted to match human sensitivity better than a flat euclidean distance.
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 9
}

export type ClashPair = { a: string; b: string; before: number; after: number }

/** Finds palette pairs that stay distinct normally but collapse under simulation. */
export function findClashes(hexes: string[], type: VisionType, parse: (hex: string) => Rgb | null): ClashPair[] {
  const parsed = hexes.map((hex) => ({ hex, rgb: parse(hex) })).filter((c): c is { hex: string; rgb: Rgb } => Boolean(c.rgb))
  const out: ClashPair[] = []
  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      const before = colorDistance(parsed[i].rgb, parsed[j].rgb)
      const after = colorDistance(simulateRgb(parsed[i].rgb, type), simulateRgb(parsed[j].rgb, type))
      if (before > 12 && after < 8) out.push({ a: parsed[i].hex, b: parsed[j].hex, before, after })
    }
  }
  return out.sort((x, y) => x.after - y.after)
}
