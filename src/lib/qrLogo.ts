export type QrLogoOptions = {
  /** Outer size of the logo along its long side, as a percent of the QR code. */
  scale: number
  /** Width divided by height of the image being placed. */
  aspect?: number
}

/** Places a logo in the middle of a QR SVG. The clear space is already in the image. */
export function embedQrLogo(svg: string, logoHref: string, options: QrLogoOptions): string {
  const box = svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/)
  if (!box) return svg
  const width = Number(box[1])
  const height = Number(box[2])
  const side = Math.min(width, height)
  const aspect = options.aspect && options.aspect > 0 ? options.aspect : 1
  const long = clamp(options.scale, 12, aspect >= 1.4 ? 56 : 34)
  const artW = ((aspect >= 1 ? long : long * aspect) / 100) * side
  const artH = ((aspect >= 1 ? long / aspect : long) / 100) * side
  const x = (width - artW) / 2
  const y = (height - artH) / 2
  const href = logoHref.replace(/&/g, '&amp;').replace(/"/g, '')
  const image = `<image class="qr-logo" href="${href}" x="${n(x)}" y="${n(y)}" width="${n(artW)}" height="${n(artH)}" preserveAspectRatio="xMidYMid meet"/>`
  return svg.replace('</svg>', `${image}</svg>`)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function n(value: number): string {
  return value.toFixed(2)
}
