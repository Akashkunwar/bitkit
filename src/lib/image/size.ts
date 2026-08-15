export type FitMode = 'contain' | 'cover' | 'stretch'

export type SizeOptions = {
  width?: number
  height?: number
  maxWidth?: number
  maxHeight?: number
  fit?: FitMode
}

export type DrawRect = {
  width: number
  height: number
  sx: number
  sy: number
  sw: number
  sh: number
}

function round(n: number): number {
  return Math.max(1, Math.round(n))
}

export function computeTargetSize(
  srcW: number,
  srcH: number,
  opts: SizeOptions,
): DrawRect {
  const fit = opts.fit ?? 'contain'
  const hasExact = Boolean(opts.width || opts.height)

  if (hasExact) {
    const targetW = opts.width ?? (opts.height ? (opts.height * srcW) / srcH : srcW)
    const targetH = opts.height ?? (opts.width ? (opts.width * srcH) / srcW : srcH)

    if (fit === 'stretch') {
      return { width: round(targetW), height: round(targetH), sx: 0, sy: 0, sw: srcW, sh: srcH }
    }

    if (fit === 'cover') {
      const scale = Math.max(targetW / srcW, targetH / srcH)
      const sw = targetW / scale
      const sh = targetH / scale
      return {
        width: round(targetW),
        height: round(targetH),
        sx: (srcW - sw) / 2,
        sy: (srcH - sh) / 2,
        sw,
        sh,
      }
    }

    const scale = Math.min(targetW / srcW, targetH / srcH)
    return {
      width: round(srcW * scale),
      height: round(srcH * scale),
      sx: 0,
      sy: 0,
      sw: srcW,
      sh: srcH,
    }
  }

  let width = srcW
  let height = srcH
  const maxW = opts.maxWidth ?? srcW
  const maxH = opts.maxHeight ?? srcH
  const scale = Math.min(1, maxW / srcW, maxH / srcH)
  width = srcW * scale
  height = srcH * scale
  return { width: round(width), height: round(height), sx: 0, sy: 0, sw: srcW, sh: srcH }
}

export function nextQualityBounds(
  low: number,
  high: number,
  quality: number,
  size: number,
  maxBytes: number,
): { low: number; high: number; quality: number } {
  if (size > maxBytes) {
    return { low, high: quality, quality: (low + quality) / 2 }
  }
  return { low: quality, high, quality: (quality + high) / 2 }
}

export const FORM_PRESETS = [
  { id: '450kb-free', label: 'Keep ratio · 450 KB', maxBytes: 450 * 1024 },
  { id: '300kb-free', label: 'Keep ratio · 300 KB', maxBytes: 300 * 1024 },
  { id: '2mb-free', label: 'Keep ratio · 2 MB', maxBytes: 2 * 1024 * 1024 },
  { id: '450sq', label: '450 × 450 · 450 KB', width: 450, height: 450, maxBytes: 450 * 1024, fit: 'cover' as const },
  { id: '40sq', label: '40 × 40', width: 40, height: 40, fit: 'cover' as const },
  { id: '200-50kb', label: '200 × 200 · 50 KB', width: 200, height: 200, maxBytes: 50 * 1024, fit: 'cover' as const },
  { id: 'passport', label: 'Passport 600 × 600', width: 600, height: 600, fit: 'cover' as const },
]
