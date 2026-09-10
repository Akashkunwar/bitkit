/** Honest warnings for formats this toolbox does not fully handle. */
export function imageFormatHint(file: Blob): string | null {
  const type = file.type.toLowerCase()
  const name = file instanceof File ? file.name.toLowerCase() : ''
  if (type.includes('heic') || type.includes('heif') || /\.hei[cf]$/i.test(name)) {
    return 'HEIC/HEIF depends on this browser’s decoder. Safari usually works; Chrome often does not. Export a JPEG from Photos if this fails.'
  }
  if (type === 'image/gif' || name.endsWith('.gif')) {
    return 'Animated GIFs use the first frame only. This is not a GIF editor.'
  }
  return null
}

export function isHeicLike(file: Blob): boolean {
  const type = file.type.toLowerCase()
  const name = file instanceof File ? file.name.toLowerCase() : ''
  return type.includes('heic') || type.includes('heif') || /\.hei[cf]$/i.test(name)
}
