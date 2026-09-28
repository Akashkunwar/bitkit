/**
 * Screenshot framing: a screenshot on a backdrop, with padding, rounded
 * corners, a shadow, and optional window chrome. Layout is pure so it can be
 * tested; `drawFrame` paints it onto a canvas.
 */

export type Chrome = 'none' | 'mac-light' | 'mac-dark' | 'browser'
export type Aspect = 'auto' | '16:9' | '4:3' | '1:1' | '4:5' | '9:16'

export const BACKDROPS: { id: string; label: string; css: string; stops: string[] }[] = [
  {
    id: 'indigo',
    label: 'Indigo',
    css: 'linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)',
    stops: ['#6366f1', '#8b5cf6', '#d946ef'],
  },
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg,#f97316,#ec4899)', stops: ['#f97316', '#ec4899'] },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg,#06b6d4,#3b82f6)', stops: ['#06b6d4', '#3b82f6'] },
  { id: 'mint', label: 'Mint', css: 'linear-gradient(135deg,#34d399,#0ea5e9)', stops: ['#34d399', '#0ea5e9'] },
  { id: 'peach', label: 'Peach', css: 'linear-gradient(135deg,#fde68a,#fca5a5)', stops: ['#fde68a', '#fca5a5'] },
  { id: 'night', label: 'Night', css: 'linear-gradient(135deg,#0f172a,#334155)', stops: ['#0f172a', '#334155'] },
  { id: 'paper', label: 'Paper', css: '#f3f4f6', stops: ['#f3f4f6'] },
  { id: 'white', label: 'White', css: '#ffffff', stops: ['#ffffff'] },
]

const ASPECTS: Record<Exclude<Aspect, 'auto'>, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '4:5': 4 / 5,
  '9:16': 9 / 16,
}

export type FrameOptions = {
  /** Space around the window, as a fraction of the screenshot's longer side. */
  padding: number
  radius: number
  shadow: number
  chrome: Chrome
  aspect: Aspect
  title: string
}

/** Height of the window bar for a window `width` pixels wide. */
export function chromeHeight(chrome: Chrome, width: number): number {
  if (chrome === 'none') return 0
  const base = Math.max(28, Math.round(width * 0.028))
  return chrome === 'browser' ? Math.round(base * 1.35) : base
}

export type FrameLayout = {
  width: number
  height: number
  window: { x: number; y: number; width: number; height: number }
  bar: number
}

export function layoutFrame(imageWidth: number, imageHeight: number, options: FrameOptions): FrameLayout {
  const bar = chromeHeight(options.chrome, imageWidth)
  const windowW = imageWidth
  const windowH = imageHeight + bar
  const pad = Math.round(Math.max(imageWidth, imageHeight) * Math.max(0, options.padding))
  let width = windowW + pad * 2
  let height = windowH + pad * 2
  if (options.aspect !== 'auto') {
    // Grow the short side so the canvas hits the ratio without cropping.
    const ratio = ASPECTS[options.aspect]
    if (width / height > ratio) height = Math.round(width / ratio)
    else width = Math.round(height * ratio)
  }
  return {
    width,
    height,
    window: {
      x: Math.round((width - windowW) / 2),
      y: Math.round((height - windowH) / 2),
      width: windowW,
      height: windowH,
    },
    bar,
  }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)))
}

export function drawFrame(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  imageSize: { width: number; height: number },
  options: FrameOptions & { backdrop: string[] },
  scale = 1,
): void {
  const layout = layoutFrame(imageSize.width, imageSize.height, options)
  canvas.width = Math.round(layout.width * scale)
  canvas.height = Math.round(layout.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)

  const stops = options.backdrop
  if (stops.length > 1) {
    const gradient = ctx.createLinearGradient(0, 0, layout.width, layout.height)
    stops.forEach((stop, i) => gradient.addColorStop(i / (stops.length - 1), stop))
    ctx.fillStyle = gradient
  } else {
    ctx.fillStyle = stops[0] ?? '#ffffff'
  }
  ctx.fillRect(0, 0, layout.width, layout.height)

  const { x, y, width, height } = layout.window
  const radius = options.radius
  if (options.shadow > 0) {
    ctx.save()
    ctx.shadowColor = `rgba(15, 23, 42, ${0.18 + options.shadow * 0.32})`
    ctx.shadowBlur = 20 + options.shadow * 70
    ctx.shadowOffsetY = 8 + options.shadow * 22
    roundedRectPath(ctx, x, y, width, height, radius)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.restore()
  }

  ctx.save()
  roundedRectPath(ctx, x, y, width, height, radius)
  ctx.clip()
  if (layout.bar) {
    const dark = options.chrome === 'mac-dark'
    ctx.fillStyle = dark ? '#1f2937' : '#f3f4f6'
    ctx.fillRect(x, y, width, layout.bar)
    ctx.fillStyle = dark ? '#111827' : '#e5e7eb'
    ctx.fillRect(x, y + layout.bar - 1, width, 1)
    const dot = layout.bar * 0.22
    const cy = y + (options.chrome === 'browser' ? layout.bar * 0.5 : layout.bar / 2)
    ;['#ff5f57', '#febc2e', '#28c840'].forEach((color, i) => {
      ctx.beginPath()
      ctx.arc(x + layout.bar * 0.55 + i * dot * 3.1, cy, dot, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    })
    const label = options.title.trim()
    if (options.chrome === 'browser') {
      const barW = Math.min(width * 0.55, width - layout.bar * 4)
      const barH = layout.bar * 0.56
      const bx = x + (width - barW) / 2
      roundedRectPath(ctx, bx, cy - barH / 2, barW, barH, barH / 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      if (label) {
        ctx.fillStyle = '#6b7280'
        ctx.font = `${Math.round(barH * 0.5)}px -apple-system, 'Segoe UI', Roboto, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, x + width / 2, cy, barW - barH)
      }
    } else if (label) {
      ctx.fillStyle = dark ? '#d1d5db' : '#4b5563'
      ctx.font = `600 ${Math.round(layout.bar * 0.4)}px -apple-system, 'Segoe UI', Roboto, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x + width / 2, cy, width * 0.6)
    }
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, x, y + layout.bar, imageSize.width, imageSize.height)
  ctx.restore()
}
