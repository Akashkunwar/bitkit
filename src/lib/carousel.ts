import { decodeImage } from './image/compress'

export type CarouselPreset = {
  id: string
  label: string
  /** Aspect ratio of one panel, width / height. */
  ratio: number
  width: number
  height: number
}

export const CAROUSEL_PRESETS: CarouselPreset[] = [
  { id: 'ig-square', label: 'Instagram square 1:1', ratio: 1, width: 1080, height: 1080 },
  { id: 'ig-portrait', label: 'Instagram portrait 4:5', ratio: 4 / 5, width: 1080, height: 1350 },
  { id: 'li-square', label: 'LinkedIn square 1:1', ratio: 1, width: 1200, height: 1200 },
  { id: 'story', label: 'Story 9:16', ratio: 9 / 16, width: 1080, height: 1920 },
]

export type SliceOptions = {
  preset: CarouselPreset
  panels: number
  /** Pixels of the neighbouring panel repeated at each seam, for a stitched look. */
  overlap: number
  background: string
  numbered: boolean
}

export type Panel = { index: number; blob: Blob; width: number; height: number }

/** How many panels the image naturally splits into at this preset's ratio. */
export function suggestPanels(width: number, height: number, preset: CarouselPreset): number {
  const panelWidth = height * preset.ratio
  return Math.max(1, Math.min(10, Math.round(width / panelWidth)))
}

function drawNumber(ctx: CanvasRenderingContext2D, index: number, total: number, w: number, h: number): void {
  const label = `${index + 1}/${total}`
  const size = Math.round(Math.min(w, h) * 0.045)
  ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = 'alphabetic'
  const metrics = ctx.measureText(label)
  const padX = size * 0.6
  const padY = size * 0.4
  const boxW = metrics.width + padX * 2
  const boxH = size + padY * 2
  const x = w - boxW - size
  const y = h - boxH - size

  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.beginPath()
  ctx.roundRect(x, y, boxW, boxH, boxH / 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, x + padX, y + padY + size * 0.82)
}

export async function sliceCarousel(file: Blob, options: SliceOptions): Promise<Panel[]> {
  const source = await decodeImage(file)
  const srcW = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
  const srcH = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height

  const { preset, panels, overlap } = options
  const out: Panel[] = []

  // Each panel takes an equal horizontal share of the source, then is scaled
  // into the preset's canvas. Overlap widens the sampled strip on both sides.
  const sliceWidth = srcW / panels

  for (let i = 0; i < panels; i += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = preset.width
    canvas.height = preset.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable in this browser.')

    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const bleedLeft = i === 0 ? 0 : overlap
    const bleedRight = i === panels - 1 ? 0 : overlap
    const sx = Math.max(0, i * sliceWidth - bleedLeft)
    const sw = Math.min(srcW - sx, sliceWidth + bleedLeft + bleedRight)

    // Cover-fit the strip into the panel so nothing is letterboxed.
    const scale = Math.max(canvas.width / sw, canvas.height / srcH)
    const drawW = sw * scale
    const drawH = srcH * scale
    ctx.drawImage(
      source as CanvasImageSource,
      sx,
      0,
      sw,
      srcH,
      (canvas.width - drawW) / 2,
      (canvas.height - drawH) / 2,
      drawW,
      drawH,
    )

    if (options.numbered) drawNumber(ctx, i, panels, canvas.width, canvas.height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode a panel.'))), 'image/jpeg', 0.92)
    })
    out.push({ index: i, blob, width: canvas.width, height: canvas.height })
  }

  if ('close' in source) source.close()
  return out
}
