import { describe, expect, it } from 'vitest'
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library'
import {
  BarcodeError,
  CODE128,
  CODE39_TABLE,
  barcodeSvg,
  bitsToWidths,
  code128Values,
  encodeBarcode,
  gs1CheckDigit,
  type Symbology,
} from '../lib/barcode'
import { chunkText, pickVoice } from '../lib/speech'

const FORMATS: Record<Symbology, BarcodeFormat> = {
  code128: BarcodeFormat.CODE_128,
  ean13: BarcodeFormat.EAN_13,
  ean8: BarcodeFormat.EAN_8,
  upca: BarcodeFormat.UPC_A,
  code39: BarcodeFormat.CODE_39,
}

/** Rasterises module widths to a luminance image and decodes it with ZXing. */
function decode(symbology: Symbology, widths: number[]): string {
  const scale = 3
  const quiet = 12
  const modules = widths.reduce((a, b) => a + b, 0)
  const width = (modules + quiet * 2) * scale
  const height = 40
  const row = new Uint8ClampedArray(width).fill(255)
  let x = quiet * scale
  widths.forEach((w, i) => {
    if (i % 2 === 0) row.fill(0, x, x + w * scale)
    x += w * scale
  })
  const pixels = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y += 1) pixels.set(row, y * width)
  const source = new RGBLuminanceSource(pixels, width, height, width, height, 0, 0)
  const reader = new MultiFormatReader()
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [FORMATS[symbology]]],
    [DecodeHintType.TRY_HARDER, true],
  ])
  return reader.decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText()
}

describe('barcode tables', () => {
  it('has 107 Code 128 patterns of 11 modules (13 for stop), all distinct', () => {
    expect(CODE128).toHaveLength(107)
    CODE128.forEach((p, v) => {
      const sum = [...p].reduce((a, b) => a + Number(b), 0)
      expect(sum, `value ${v}`).toBe(v === 106 ? 13 : 11)
    })
    expect(new Set(CODE128).size).toBe(107)
  })

  it('gives every Code 39 character exactly three wide elements', () => {
    for (const [ch, pattern] of Object.entries(CODE39_TABLE)) {
      expect(pattern, ch).toHaveLength(9)
      expect(
        [...pattern].filter((e) => e === 'w'),
        ch,
      ).toHaveLength(3)
    }
    expect(new Set(Object.values(CODE39_TABLE)).size).toBe(Object.keys(CODE39_TABLE).length)
  })
})

describe('check digits', () => {
  it('matches published GS1 examples', () => {
    expect(gs1CheckDigit('400638133393')).toBe(1) // EAN-13 4006381333931
    expect(gs1CheckDigit('03600029145')).toBe(2) // UPC-A 036000291452
    expect(gs1CheckDigit('9638507')).toBe(4) // EAN-8 96385074
  })

  it('rejects a wrong check digit and explains it', () => {
    expect(() => encodeBarcode('ean13', '4006381333932')).toThrow(/should be 1/)
    expect(() => encodeBarcode('ean13', '123')).toThrow(BarcodeError)
    expect(() => encodeBarcode('upca', '12a45678901')).toThrow(/digits only/)
  })
})

describe('code 128 encoding', () => {
  it('computes the checksum over weighted values', () => {
    const values = code128Values('Wikipedia')
    expect(values[0]).toBe(104)
    const data = values.slice(0, -2)
    const expected = data.reduce((sum, v, i) => sum + v * (i === 0 ? 1 : i), 0) % 103
    expect(values.at(-2)).toBe(expected)
    expect(values.at(-1)).toBe(106)
  })

  it('packs long digit runs two to a symbol', () => {
    // Start C + 6 pairs + checksum + stop.
    expect(code128Values('123456789012')).toHaveLength(9)
    expect(code128Values('123456789012')[0]).toBe(105)
  })

  it('rejects characters outside printable ASCII', () => {
    expect(() => code128Values('héllo')).toThrow(/cannot encode/)
    expect(() => code128Values('')).toThrow()
  })
})

describe('barcodes scan back to what was encoded', () => {
  const cases: [Symbology, string, string][] = [
    ['code128', 'BitKit-2026', 'BitKit-2026'],
    ['code128', 'Order #A7/42 ok', 'Order #A7/42 ok'],
    ['code128', '123456789012', '123456789012'],
    ['code128', 'AB12345', 'AB12345'],
    ['code128', '12345X', '12345X'],
    ['code128', 'X1234567Y', 'X1234567Y'],
    ['ean13', '400638133393', '4006381333931'],
    ['ean13', '8901030865275', '8901030865275'],
    ['upca', '03600029145', '036000291452'],
    ['ean8', '9638507', '96385074'],
    ['code39', 'PART-1234', 'PART-1234'],
    ['code39', 'hello world', 'HELLO WORLD'],
    ['code39', '$5.00 +10%', '$5.00 +10%'],
  ]
  for (const [symbology, input, expected] of cases) {
    it(`${symbology}: ${input}`, () => {
      const encoded = encodeBarcode(symbology, input)
      expect(encoded.widths.length % 2).toBe(1) // starts and ends with a bar
      expect(decode(symbology, encoded.widths)).toBe(expected)
    })
  }
})

describe('rendering', () => {
  it('converts bit strings to runs starting with a bar', () => {
    expect(bitsToWidths('1011001')).toEqual([1, 1, 2, 2, 1])
    expect(() => bitsToWidths('01')).toThrow()
  })

  it('draws one rect per bar and escapes the label', () => {
    const encoded = { widths: [1, 1, 2], text: 'A<B' }
    const svg = barcodeSvg(encoded, {
      moduleWidth: 2,
      height: 50,
      quietZone: 10,
      showText: true,
      foreground: '#000',
      background: '#fff',
    })
    expect(svg.match(/<rect x=/g)).toHaveLength(2)
    expect(svg).toContain('A&lt;B')
    expect(svg).toContain('width="48"')
  })
})

describe('speech helpers', () => {
  it('splits long text at sentence ends within the chunk limit', () => {
    const text = 'One sentence here. Another one follows! And a question? '.repeat(20)
    const chunks = chunkText(text, 120)
    expect(chunks.length).toBeGreaterThan(5)
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(120)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' ').trim())
  })

  it('handles Hindi sentence marks and a single short sentence', () => {
    expect(chunkText('नमस्ते। आप कैसे हैं?', 16)).toEqual(['नमस्ते।', 'आप कैसे हैं?'])
    expect(chunkText('Hi')).toEqual(['Hi'])
  })

  it('prefers on-device voices over online ones', () => {
    const online = { name: 'Cloud', default: true, localService: false }
    const local = { name: 'Local', default: false, localService: true }
    expect(pickVoice([online, local])?.name).toBe('Local')
    expect(pickVoice([online])?.name).toBe('Cloud')
    expect(pickVoice([])).toBeUndefined()
  })
})
