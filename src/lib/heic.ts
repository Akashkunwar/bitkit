/**
 * HEIC/HEIF fallback. Safari usually decodes these itself; Chrome often
 * does not. The decoder (heic-to, LGPL-3.0) is loaded only when a HEIC
 * file arrives, and the picture is converted in this tab.
 */

export async function decodeHeic(file: Blob): Promise<ImageBitmap> {
  const { heicTo } = await import('heic-to')
  try {
    return await heicTo({ blob: file, type: 'bitmap' })
  } catch {
    const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 })
    return createImageBitmap(jpeg)
  }
}
