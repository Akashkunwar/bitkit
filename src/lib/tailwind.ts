export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type ScaleStep = (typeof SCALE_STEPS)[number]

/** Lightness per step, loosely following Tailwind v4's default palettes. */
const LIGHTNESS: Record<ScaleStep, number> = {
  50: 0.985,
  100: 0.955,
  200: 0.9,
  300: 0.83,
  400: 0.72,
  500: 0.62,
  600: 0.53,
  700: 0.45,
  800: 0.38,
  900: 0.32,
  950: 0.24,
}

/** Chroma multiplier per step — muted at the extremes, saturated mid-scale. */
const CHROMA_MULT: Record<ScaleStep, number> = {
  50: 0.22,
  100: 0.38,
  200: 0.58,
  300: 0.78,
  400: 0.95,
  500: 1,
  600: 1,
  700: 0.9,
  800: 0.76,
  900: 0.62,
  950: 0.45,
}

export type Oklch = { l: number; c: number; h: number }

// --- sRGB <-> OKLCH conversion (via OKLab, Björn Ottosson's matrices) ---

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
}

export function hexToOklch(hex: string): Oklch {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((ch) => ch + ch).join('') : m
  const r = srgbToLinear(parseInt(full.slice(0, 2), 16) / 255)
  const g = srgbToLinear(parseInt(full.slice(2, 4), 16) / 255)
  const b = srgbToLinear(parseInt(full.slice(4, 6), 16) / 255)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s

  const c = Math.sqrt(a * a + bb * bb)
  let h = (Math.atan2(bb, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h }
}

export function oklchToHex({ l: L, c, h }: Oklch): string {
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr)
  const bb = c * Math.sin(hr)

  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const to255 = (v: number) => {
    const clamped = Math.min(1, Math.max(0, linearToSrgb(v)))
    return Math.round(clamped * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${to255(r)}${to255(g)}${to255(b)}`
}

export function oklchString({ l, c, h }: Oklch): string {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`
}

export type ColorScale = { step: ScaleStep; value: Oklch }[]

export function buildScale(hue: number, chroma: number): ColorScale {
  return SCALE_STEPS.map((step) => ({
    step,
    value: { l: LIGHTNESS[step], c: Math.round(chroma * CHROMA_MULT[step] * 1000) / 1000, h: hue },
  }))
}

export type ThemeColor = { id: string; name: string; hue: number; chroma: number }

export type ThemeExtras = {
  fontSans: string
  fontMono: string
  radius: string
  spacingUnit: string
}

export function buildThemeBlock(colors: ThemeColor[], extras: ThemeExtras): string {
  const lines: string[] = ['@theme {']
  for (const color of colors) {
    const name = color.name.trim().toLowerCase().replaceAll(/[^a-z0-9-]+/g, '-') || 'color'
    for (const { step, value } of buildScale(color.hue, color.chroma)) {
      lines.push(`  --color-${name}-${step}: ${oklchString(value)};`)
    }
    lines.push('')
  }
  if (extras.fontSans) lines.push(`  --font-sans: ${extras.fontSans};`)
  if (extras.fontMono) lines.push(`  --font-mono: ${extras.fontMono};`)
  if (extras.radius) lines.push(`  --radius-lg: ${extras.radius};`)
  if (extras.spacingUnit) lines.push(`  --spacing: ${extras.spacingUnit};`)
  lines.push('}')
  return lines.join('\n').replace(/\n\n\}/, '\n}')
}
