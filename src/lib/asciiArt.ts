/** Ramps run from darkest to lightest so the mapping is a straight lookup. */
export const RAMPS: { id: string; label: string; chars: string }[] = [
  { id: 'detailed', label: 'Detailed (70)', chars: "$@B%8&WM#*oahkbdpwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. " },
  { id: 'standard', label: 'Standard (10)', chars: '@%#*+=-:. ' },
  { id: 'blocks', label: 'Blocks', chars: '█▓▒░ ' },
  { id: 'binary', label: 'Binary', chars: '10 ' },
  { id: 'dots', label: 'Dots', chars: '▓▒░· ' },
]

export type AsciiOptions = {
  /** Output width in characters. Height follows from the aspect ratio. */
  columns: number
  ramp: string
  invert: boolean
  /** Terminal cells are roughly twice as tall as wide. */
  cellAspect: number
  contrast: number
  brightness: number
}

export const DEFAULT_ASCII: AsciiOptions = {
  columns: 100,
  ramp: RAMPS[1].chars,
  invert: false,
  cellAspect: 2.1,
  contrast: 1,
  brightness: 0,
}

export type AsciiResult = { text: string; columns: number; rows: number }

function adjust(value: number, contrast: number, brightness: number): number {
  // Contrast pivots around mid-grey so the image does not just get brighter.
  const shifted = (value - 128) * contrast + 128 + brightness
  return Math.min(255, Math.max(0, shifted))
}

export function imageDataToAscii(image: ImageData, options: AsciiOptions): AsciiResult {
  const ramp = options.ramp || DEFAULT_ASCII.ramp
  const chars = [...ramp]
  const lines: string[] = []

  for (let y = 0; y < image.height; y += 1) {
    let line = ''
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4
      const alpha = image.data[i + 3] / 255
      // Rec. 601 luma, composited over white so transparency reads as blank.
      const luma =
        0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2]
      const value = adjust(luma * alpha + 255 * (1 - alpha), options.contrast, options.brightness)
      const t = options.invert ? 1 - value / 255 : value / 255
      const index = Math.min(chars.length - 1, Math.max(0, Math.round(t * (chars.length - 1))))
      line += chars[index]
    }
    lines.push(line.replace(/\s+$/, ''))
  }
  return { text: lines.join('\n'), columns: image.width, rows: image.height }
}

/** Target pixel grid for a given source size, corrected for cell shape. */
export function gridFor(
  srcWidth: number,
  srcHeight: number,
  options: AsciiOptions,
): { width: number; height: number } {
  const width = Math.max(8, Math.min(400, Math.round(options.columns)))
  const height = Math.max(1, Math.round((srcHeight / srcWidth) * width / options.cellAspect))
  return { width, height }
}

/** Renders ASCII text to a PNG so it can be shared as an image. */
export async function asciiToPng(
  text: string,
  options: { fontSize?: number; background?: string; colour?: string } = {},
): Promise<Blob> {
  const fontSize = options.fontSize ?? 12
  const lineHeight = Math.round(fontSize * 1.08)
  const lines = text.split('\n')
  const font = `${fontSize}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`

  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) throw new Error('Canvas is unavailable in this browser.')
  measure.font = font
  const width = Math.ceil(Math.max(...lines.map((l) => measure.measureText(l).width))) + 24

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, width)
  canvas.height = lines.length * lineHeight + 24
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')

  ctx.fillStyle = options.background ?? '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = font
  ctx.fillStyle = options.colour ?? '#111111'
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => ctx.fillText(line, 12, 12 + i * lineHeight))

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed.'))), 'image/png')
  })
}
