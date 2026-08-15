import { type Rgb, rgbToHex } from './contrast'
import { hexToOklch, oklchString } from './tailwind'

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6
  else if (max === G) h = ((B - R) / d + 2) / 6
  else h = ((R - G) / d + 4) / 6
  return { h: h * 360, s, l }
}

export function formatColor(rgb: Rgb): { hex: string; rgb: string; hsl: string; oklch: string } {
  const hex = rgbToHex(rgb)
  const hsl = rgbToHsl(rgb)
  const oklch = hexToOklch(hex)
  return {
    hex,
    rgb: `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)})`,
    hsl: `hsl(${Math.round(hsl.h)} ${Math.round(hsl.s * 100)}% ${Math.round(hsl.l * 100)}%)`,
    oklch: oklchString(oklch),
  }
}

export function sampleCanvas(img: HTMLImageElement, clientX: number, clientY: number): Rgb {
  const rect = img.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * img.naturalWidth
  const y = ((clientY - rect.top) / rect.height) * img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(img, x, y, 1, 1, 0, 0, 1, 1)
  const p = ctx.getImageData(0, 0, 1, 1).data
  return { r: p[0], g: p[1], b: p[2] }
}
