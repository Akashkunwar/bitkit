export type ColorAdjust = {
  brightness: number
  contrast: number
  saturation: number
}

export function clampUnit(n: number): number {
  return Math.min(2, Math.max(0, n))
}

export function cssFilter(adjust: ColorAdjust): string {
  return `brightness(${adjust.brightness}) contrast(${adjust.contrast}) saturate(${adjust.saturation})`
}

export async function renderFinished(options: {
  source: CanvasImageSource
  width: number
  height: number
  crop?: { x: number; y: number; w: number; h: number }
  rotate: 0 | 90 | 180 | 270
  flipX?: boolean
  flipY?: boolean
  adjust: ColorAdjust
  background?: string
  overlayText?: string
  overlayColor?: string
  mime: 'image/jpeg' | 'image/webp' | 'image/png'
  quality?: number
}): Promise<Blob> {
  const crop = options.crop ?? { x: 0, y: 0, w: options.width, h: options.height }
  const rotated = options.rotate === 90 || options.rotate === 270
  const outW = rotated ? crop.h : crop.w
  const outH = rotated ? crop.w : crop.h
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(outW))
  canvas.height = Math.max(1, Math.round(outH))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')

  if (options.background || options.mime === 'image/jpeg') {
    ctx.fillStyle = options.background || '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((options.rotate * Math.PI) / 180)
  ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1)
  ctx.filter = cssFilter(options.adjust)
  ctx.drawImage(
    options.source,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    -crop.w / 2,
    -crop.h / 2,
    crop.w,
    crop.h,
  )
  ctx.restore()

  if (options.overlayText) {
    ctx.fillStyle = options.overlayColor || 'rgba(20,18,15,0.72)'
    ctx.font = `600 ${Math.max(18, Math.round(canvas.width / 18))}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(options.overlayText, canvas.width / 2, canvas.height - 24)
  }

  const mime = options.mime
  const quality = options.quality ?? 0.92
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed.'))),
      mime,
      quality,
    )
  })
}

export const MARKETING_PRESETS = [
  { id: 'original', label: 'Original', width: 0, height: 0 },
  { id: 'square', label: 'Square 1080', width: 1080, height: 1080 },
  { id: 'story', label: 'Story 1080 × 1920', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Landscape 1920 × 1080', width: 1920, height: 1080 },
  { id: 'og', label: 'Open Graph 1200 × 630', width: 1200, height: 630 },
]
