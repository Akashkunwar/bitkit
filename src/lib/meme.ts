import { decodeImage } from './image/compress'

export type MemeStyle = 'classic' | 'modern' | 'caption'

export type MemeOptions = {
  top: string
  bottom: string
  style: MemeStyle
  fontScale: number
  uppercase: boolean
  colour: string
  strokeColour: string
  /** Width of the outline as a fraction of font size. */
  strokeScale: number
  maxWidth: number
}

export const DEFAULT_MEME: MemeOptions = {
  top: '',
  bottom: '',
  style: 'classic',
  fontScale: 1,
  uppercase: true,
  colour: '#ffffff',
  strokeColour: '#000000',
  strokeScale: 0.14,
  maxWidth: 1080,
}

export const MEME_STYLES: { value: MemeStyle; label: string; note: string }[] = [
  { value: 'classic', label: 'Classic', note: 'Impact-style outlined caps over the image' },
  { value: 'modern', label: 'Modern', note: 'Clean sans with a soft shadow' },
  { value: 'caption', label: 'Caption bar', note: 'Text on a white band above the image' },
]

function fontFor(style: MemeStyle, size: number): string {
  if (style === 'classic') {
    // Impact is the meme convention; the fallbacks keep the heavy condensed feel.
    return `700 ${size}px Impact, "Haettenschweiler", "Anton", "Arial Black", sans-serif`
  }
  if (style === 'caption') return `500 ${size}px ui-sans-serif, system-ui, "Helvetica Neue", sans-serif`
  return `700 ${size}px ui-sans-serif, system-ui, "Helvetica Neue", sans-serif`
}

/** Greedy word wrap against a measured width. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }
    let line = words[0]
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`
      if (ctx.measureText(candidate).width <= maxWidth) line = candidate
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centreX: number,
  startY: number,
  lineHeight: number,
  options: MemeOptions,
  size: number,
): void {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight
    if (options.style === 'modern') {
      ctx.shadowColor = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = size * 0.18
      ctx.shadowOffsetY = size * 0.04
    }
    if (options.style !== 'caption') {
      ctx.strokeStyle = options.strokeColour
      ctx.lineWidth = size * options.strokeScale
      ctx.strokeText(line, centreX, y)
    }
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    ctx.fillStyle = options.style === 'caption' ? '#111111' : options.colour
    ctx.fillText(line, centreX, y)
  })
}

export async function renderMeme(file: Blob, options: MemeOptions): Promise<Blob> {
  const source = await decodeImage(file)
  const srcW = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
  const srcH = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height

  const scale = Math.min(1, options.maxWidth / srcW)
  const width = Math.round(srcW * scale)
  const imageHeight = Math.round(srcH * scale)

  const size = Math.round(width * 0.085 * options.fontScale)
  const lineHeight = size * 1.12
  const padding = Math.round(width * 0.03)

  const probe = document.createElement('canvas').getContext('2d')
  if (!probe) throw new Error('Canvas is unavailable in this browser.')
  probe.font = fontFor(options.style, size)

  const text = (value: string) => (options.uppercase && options.style !== 'caption' ? value.toUpperCase() : value)
  const topLines = options.top.trim() ? wrap(probe, text(options.top), width - padding * 2) : []
  const bottomLines = options.bottom.trim() ? wrap(probe, text(options.bottom), width - padding * 2) : []

  // Caption style puts the top text on its own band above the picture.
  const bandHeight =
    options.style === 'caption' && topLines.length ? Math.round(topLines.length * lineHeight + padding * 2) : 0

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = imageHeight + bandHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')

  if (bandHeight) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, bandHeight)
  }
  ctx.drawImage(source as CanvasImageSource, 0, bandHeight, width, imageHeight)
  ctx.font = fontFor(options.style, size)

  if (topLines.length) {
    const startY = bandHeight ? padding : padding
    drawBlock(ctx, topLines, width / 2, startY, lineHeight, options, size)
  }
  if (bottomLines.length) {
    const blockHeight = bottomLines.length * lineHeight
    const startY = canvas.height - padding - blockHeight
    // The bottom block never uses the caption band, so force the overlay look.
    drawBlock(
      ctx,
      bottomLines,
      width / 2,
      startY,
      lineHeight,
      { ...options, style: options.style === 'caption' ? 'classic' : options.style },
      size,
    )
  }

  if ('close' in source) source.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render the meme.'))), 'image/jpeg', 0.92)
  })
}
