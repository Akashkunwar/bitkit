export type Channels = {
  hex: string
  rgb: string
  hsl: string
  cmyk: string
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

export function parseHex(input: string): { r: number; g: number; b: number } {
  const match = /^#?([0-9a-f]{6})$/i.exec(input.trim())
  if (!match) throw new Error('Use a hex color like #c45b2d.')
  const value = Number.parseInt(match[1], 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

/** Device CMYK from sRGB. This is not a press or ICC conversion. */
export function channelsFromHex(input: string): Channels {
  const { r, g, b } = parseHex(input)
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255
  const k = 1 - Math.max(rf, gf, bf)
  const scale = k === 1 ? 0 : 1 / (1 - k)
  const c = (1 - rf - k) * scale
  const m = (1 - gf - k) * scale
  const y = (1 - bf - k) * scale
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === rf) h = ((gf - bf) / d) % 6
    else if (max === gf) h = (bf - rf) / d + 2
    else h = (rf - gf) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const pct = (value: number) => `${Math.round(value * 1000) / 10}%`
  return {
    hex: `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`,
    rgb: `${r}, ${g}, ${b}`,
    hsl: `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`,
    cmyk: `${pct(c)} ${pct(m)} ${pct(y)} ${pct(k)}`,
  }
}

export function hexFromCmyk(c: number, m: number, y: number, k: number): string {
  for (const [name, value] of [
    ['C', c],
    ['M', m],
    ['Y', y],
    ['K', k],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${name} has to be from 0 to 100.`)
  }
  const kf = k / 100
  const r = 255 * (1 - c / 100) * (1 - kf)
  const g = 255 * (1 - m / 100) * (1 - kf)
  const b = 255 * (1 - y / 100) * (1 - kf)
  return `#${[r, g, b].map((part) => clampByte(part).toString(16).padStart(2, '0')).join('')}`
}
