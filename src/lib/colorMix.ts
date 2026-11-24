export type Rgb = { r: number; g: number; b: number }

export function parseHex(input: string): Rgb {
  const hex = input.trim().replace(/^#/, '')
  const full = hex.length === 3 ? [...hex].map((ch) => ch + ch).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error('Use a hex color like #c45b2d.')
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

export function toHex({ r, g, b }: Rgb): string {
  const byte = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

export function mixColors(from: string, to: string, steps: number): string[] {
  const a = parseHex(from)
  const b = parseHex(to)
  const n = Math.min(12, Math.max(2, Math.floor(steps)))
  return Array.from({ length: n }, (_, index) => {
    const t = n === 1 ? 0 : index / (n - 1)
    return toHex({
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
    })
  })
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const delta = max - min
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  const h =
    max === red
      ? (green - blue) / delta + (green < blue ? 6 : 0)
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4
  return { h: h / 6, s, l }
}

function hue(p: number, q: number, t: number): number {
  let turn = t
  if (turn < 0) turn += 1
  if (turn > 1) turn -= 1
  if (turn < 1 / 6) return p + (q - p) * 6 * turn
  if (turn < 1 / 2) return q
  if (turn < 2 / 3) return p + (q - p) * (2 / 3 - turn) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return { r: hue(p, q, h + 1 / 3) * 255, g: hue(p, q, h) * 255, b: hue(p, q, h - 1 / 3) * 255 }
}

export function colorHarmonies(hex: string): { name: string; colors: string[] }[] {
  const base = toHex(parseHex(hex))
  const { h, s, l } = rgbToHsl(parseHex(base))
  const at = (turn: number) => toHex(hslToRgb((h + turn + 1) % 1, s, l))
  return [
    { name: 'Complementary', colors: [base, at(0.5)] },
    { name: 'Analogous', colors: [at(-30 / 360), base, at(30 / 360)] },
    { name: 'Triadic', colors: [base, at(1 / 3), at(2 / 3)] },
  ]
}

export function colorShades(hex: string, steps: number): string[] {
  const n = Math.min(11, Math.max(3, Math.floor(steps)))
  const mid = Math.floor(n / 2)
  const base = parseHex(hex)
  return Array.from({ length: n }, (_, index) => {
    const toward = index < mid ? parseHex('#ffffff') : parseHex('#000000')
    const span = index < mid ? mid : n - 1 - mid
    const t = index === mid || span === 0 ? 0 : Math.abs(index - mid) / span
    return toHex({
      r: base.r + (toward.r - base.r) * t,
      g: base.g + (toward.g - base.g) * t,
      b: base.b + (toward.b - base.b) * t,
    })
  })
}
