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
