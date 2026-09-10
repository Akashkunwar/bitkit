import { stageDownscale } from './limits'

/** Draw a source onto a canvas no larger than CANVAS_SAFE_MAX so 40MP photos do not crash the tab. */
export function workingBitmap(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
): { source: CanvasImageSource; width: number; height: number; capped: boolean } {
  const staged = stageDownscale(srcW, srcH)
  if (staged.width === srcW && staged.height === srcH) {
    return { source, width: srcW, height: srcH, capped: false }
  }
  const canvas = document.createElement('canvas')
  canvas.width = staged.width
  canvas.height = staged.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')
  ctx.drawImage(source, 0, 0, srcW, srcH, 0, 0, staged.width, staged.height)
  return { source: canvas, width: staged.width, height: staged.height, capped: true }
}

export const CAPPED_HINT =
  'This photo was larger than this browser can hold in a canvas, so BitKit scaled it down before drawing.'
