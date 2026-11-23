/**
 * Draws a white edge that follows the opaque pixels of a logo, then the logo on top.
 * gapRatio is the border thickness as a fraction of the logo's shorter side.
 * Zero leaves the mark with no white edge.
 */
export function frameLogo(
  image: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  gapRatio: number,
  color: string,
): { url: string; aspect: number; outerOverArt: number } {
  const maxSide = 280
  const fit = Math.min(1, maxSide / Math.max(sourceW, sourceH, 1))
  const width = Math.max(1, Math.round(sourceW * fit))
  const height = Math.max(1, Math.round(sourceH * fit))
  const src = document.createElement('canvas')
  src.width = width
  src.height = height
  const srcCtx = src.getContext('2d', { willReadFrequently: true })
  if (!srcCtx) return { url: '', aspect: sourceW / sourceH || 1, outerOverArt: 1 }
  srcCtx.drawImage(image, 0, 0, width, height)
  const pixels = srcCtx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 20) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return { url: src.toDataURL('image/png'), aspect: width / height, outerOverArt: 1 }
  const artW = maxX - minX + 1
  const artH = maxY - minY + 1
  const pad = gapRatio <= 0 ? 0 : Math.max(1, Math.round(Math.min(artW, artH) * gapRatio))
  if (pad === 0) {
    const trimmed = document.createElement('canvas')
    trimmed.width = artW
    trimmed.height = artH
    const trimmedCtx = trimmed.getContext('2d')
    if (!trimmedCtx) return { url: src.toDataURL('image/png'), aspect: artW / artH, outerOverArt: 1 }
    trimmedCtx.drawImage(src, minX, minY, artW, artH, 0, 0, artW, artH)
    return { url: trimmed.toDataURL('image/png'), aspect: artW / artH, outerOverArt: 1 }
  }
  const out = document.createElement('canvas')
  out.width = artW + pad * 2
  out.height = artH + pad * 2
  const ctx = out.getContext('2d')
  if (!ctx) return { url: src.toDataURL('image/png'), aspect: artW / artH, outerOverArt: 1 }
  const steps = 28
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2
    ctx.drawImage(src, minX, minY, artW, artH, pad + Math.cos(angle) * pad, pad + Math.sin(angle) * pad, artW, artH)
  }
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(src, minX, minY, artW, artH, pad, pad, artW, artH)
  return {
    url: out.toDataURL('image/png'),
    aspect: out.width / out.height,
    outerOverArt: Math.max(out.width, out.height) / Math.max(artW, artH),
  }
}
