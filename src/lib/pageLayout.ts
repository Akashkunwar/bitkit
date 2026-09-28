/**
 * Page geometry for placing images on PDF pages. Pure, so the edge cases —
 * orientation, margins, cover cropping — are unit-tested without a canvas.
 *
 * Units are PDF points (1/72 inch) for pages and pixels for source images.
 */

export type PageSize = 'fit' | 'a4' | 'letter' | 'legal' | 'a3' | 'a5'
export type Orientation = 'auto' | 'portrait' | 'landscape'
export type ImageFit = 'contain' | 'cover' | 'stretch'
export type Rotation = 0 | 90 | 180 | 270

/** Portrait width × height in points. */
export const PAGE_SIZES: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
}

export const PAGE_SIZE_LABELS: Record<PageSize, string> = {
  fit: 'Same as image',
  a4: 'A4',
  letter: 'US Letter',
  legal: 'US Legal',
  a3: 'A3',
  a5: 'A5',
}

export const MARGINS = { none: 0, small: 18, medium: 36, large: 54 } as const
export type Margin = keyof typeof MARGINS

/**
 * Screen pixels are 1/96 inch, PDF points 1/72: a 1200px-wide screenshot on a
 * "same as image" page is 900pt (12.5in) wide, which prints at its on-screen
 * size instead of as a 16-inch poster.
 */
export const PX_TO_PT = 0.75

export type Rect = { x: number; y: number; width: number; height: number }

export function rotatedSize(width: number, height: number, rotation: Rotation): { width: number; height: number } {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height }
}

export function pageFor(
  imageWidth: number,
  imageHeight: number,
  size: PageSize,
  orientation: Orientation,
  marginPt: number,
): { width: number; height: number } {
  if (size === 'fit') {
    return {
      width: imageWidth * PX_TO_PT + marginPt * 2,
      height: imageHeight * PX_TO_PT + marginPt * 2,
    }
  }
  const [w, h] = PAGE_SIZES[size]
  const landscape = orientation === 'landscape' || (orientation === 'auto' && imageWidth > imageHeight)
  return landscape ? { width: h, height: w } : { width: w, height: h }
}

/**
 * Where an image lands on its page, and which part of the source to draw.
 *
 * `dest` uses PDF coordinates (origin bottom-left). `crop` is in source
 * pixels: the whole image for contain and stretch, a centred window with the
 * content box's aspect ratio for cover — so cover never needs clipping.
 */
export function placeImage(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  marginPt: number,
  fit: ImageFit,
): { dest: Rect; crop: Rect } {
  const boxW = Math.max(1, pageWidth - marginPt * 2)
  const boxH = Math.max(1, pageHeight - marginPt * 2)
  const full: Rect = { x: 0, y: 0, width: imageWidth, height: imageHeight }

  if (fit === 'stretch') {
    return { dest: { x: marginPt, y: marginPt, width: boxW, height: boxH }, crop: full }
  }

  if (fit === 'cover') {
    const boxRatio = boxW / boxH
    const imageRatio = imageWidth / imageHeight
    let cropW = imageWidth
    let cropH = imageHeight
    if (imageRatio > boxRatio) cropW = imageHeight * boxRatio
    else cropH = imageWidth / boxRatio
    return {
      dest: { x: marginPt, y: marginPt, width: boxW, height: boxH },
      crop: { x: (imageWidth - cropW) / 2, y: (imageHeight - cropH) / 2, width: cropW, height: cropH },
    }
  }

  const scale = Math.min(boxW / imageWidth, boxH / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    dest: { x: marginPt + (boxW - width) / 2, y: marginPt + (boxH - height) / 2, width, height },
    crop: full,
  }
}

/**
 * Pixels worth keeping for a given printed size. Embedding a 6000px photo in
 * a 3-inch box wastes megabytes; capping at `dpi` keeps print quality while
 * the file shrinks. Never upscales.
 */
export function targetPixels(crop: Rect, dest: Rect, dpi: number | null): { width: number; height: number } {
  const width = Math.max(1, Math.round(crop.width))
  const height = Math.max(1, Math.round(crop.height))
  if (!dpi) return { width, height }
  const maxW = Math.ceil((dest.width / 72) * dpi)
  const maxH = Math.ceil((dest.height / 72) * dpi)
  const scale = Math.min(1, maxW / width, maxH / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Moves one item to a new index, returning a new array. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return [...list]
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item)
  return next
}
