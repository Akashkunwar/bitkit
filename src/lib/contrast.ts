export type Rgb = { r: number; g: number; b: number }

export function parseHex(hex: string): Rgb | null {
  const m = hex.trim().replace('#', '')
  const full = m.length === 3 ? m.split('').map((ch) => ch + ch).join('') : m
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export type WcagLevel = 'fail' | 'AA' | 'AAA'

export function wcagLevel(ratio: number, large: boolean): WcagLevel {
  const aaa = large ? 4.5 : 7
  const aa = large ? 3 : 4.5
  if (ratio >= aaa) return 'AAA'
  if (ratio >= aa) return 'AA'
  return 'fail'
}

/** Walk lightness toward black/white until the target ratio is met, or return null. */
export function suggestForeground(bg: Rgb, target: number): Rgb | null {
  for (const toward of [0, 255] as const) {
    let lo = 0
    let hi = 1
    let best: Rgb | null = null
    for (let i = 0; i < 18; i += 1) {
      const t = (lo + hi) / 2
      const fg: Rgb = {
        r: bg.r + (toward - bg.r) * t,
        g: bg.g + (toward - bg.g) * t,
        b: bg.b + (toward - bg.b) * t,
      }
      if (contrastRatio(bg, fg) >= target) {
        best = fg
        hi = t
      } else lo = t
    }
    if (best && contrastRatio(bg, best) >= target) return best
  }
  return null
}
