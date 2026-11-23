import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library'

const FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.ITF,
]

/** Read a barcode from RGBA pixels. Returns null when the picture has no code. */
export function decodeBarcodeRgba(rgba: Uint8ClampedArray, width: number, height: number): string | null {
  if (width < 8 || height < 8 || rgba.length < width * height * 4) return null
  const lum = new Uint8ClampedArray(width * height)
  for (let i = 0; i < lum.length; i += 1) {
    const p = i * 4
    lum[i] = Math.round(rgba[p] * 0.3 + rgba[p + 1] * 0.59 + rgba[p + 2] * 0.11)
  }
  try {
    const source = new RGBLuminanceSource(lum, width, height, width, height, 0, 0)
    const reader = new MultiFormatReader()
    const hints = new Map<DecodeHintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, FORMATS],
      [DecodeHintType.TRY_HARDER, true],
    ])
    return reader.decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText()
  } catch {
    return null
  }
}
