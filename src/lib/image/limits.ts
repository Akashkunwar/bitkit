export const CANVAS_SAFE_MAX = 8192

export function stageDownscale(width: number, height: number, max = CANVAS_SAFE_MAX): { width: number; height: number } {
  const cap = Math.max(width, height)
  if (cap <= max) return { width, height }
  const scale = max / cap
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function sourcePixelSize(source: { width: number; height: number; naturalWidth?: number; naturalHeight?: number }): {
  width: number
  height: number
} {
  if (source.naturalWidth && source.naturalHeight) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  return { width: source.width, height: source.height }
}
