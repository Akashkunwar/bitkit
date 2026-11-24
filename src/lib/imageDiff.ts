export type PixelDiff = { changed: number; total: number }

function delta(a: Uint8ClampedArray, b: Uint8ClampedArray, index: number): number {
  return Math.max(
    Math.abs(a[index] - b[index]),
    Math.abs(a[index + 1] - b[index + 1]),
    Math.abs(a[index + 2] - b[index + 2]),
  )
}

/** Counts pixels whose largest channel gap is above the threshold. */
export function diffPixels(a: Uint8ClampedArray, b: Uint8ClampedArray, threshold: number): PixelDiff {
  if (a.length !== b.length || a.length % 4 !== 0) {
    throw new Error('The two images need the same number of pixels to compare.')
  }
  let changed = 0
  const total = a.length / 4
  for (let i = 0; i < a.length; i += 4) {
    if (delta(a, b, i) > threshold) changed += 1
  }
  return { changed, total }
}

/**
 * A copy of `base` with unchanged pixels dimmed and changed pixels drawn in lime,
 * so the difference is visible on both light and dark photos.
 */
export function highlightChanges(
  base: Uint8ClampedArray,
  other: Uint8ClampedArray,
  threshold: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(base)
  for (let i = 0; i < base.length; i += 4) {
    if (delta(base, other, i) > threshold) {
      out[i] = 190
      out[i + 1] = 242
      out[i + 2] = 70
      out[i + 3] = 255
    } else {
      out[i] = Math.round(base[i] * 0.35)
      out[i + 1] = Math.round(base[i + 1] * 0.35)
      out[i + 2] = Math.round(base[i + 2] * 0.35)
    }
  }
  return out
}
