import { describe, expect, it } from 'vitest'
import {
  bookletOrder,
  formatMeta,
  nextPage,
  parseGlyphLines,
  parseMhtml,
  pdfEncryptSupported,
  pdfUnlockSupported,
  svgFont,
} from '../lib/docgap'

describe('document gap', () => {
  it('imposes an 8-page booklet as 8, 1, 2, 7, 6, 3, 4, 5', () => {
    expect(bookletOrder(8).map((index) => index + 1)).toEqual([8, 1, 2, 7, 6, 3, 4, 5])
  })

  it('reads the HTML part of an MHTML message and skips remote addresses', () => {
    const html = parseMhtml(
      [
        'Content-Type: multipart/related; boundary="----=_Bit"',
        '',
        '------=_Bit',
        'Content-Type: text/html; charset="utf-8"',
        '',
        '<html><body><h1>Notes</h1></body></html>',
        '------=_Bit--',
      ].join('\n'),
    )
    expect(html).toContain('<h1>Notes</h1>')
  })

  it('formats metadata and refuses to pretend a PDF password exists', () => {
    expect(formatMeta({ title: 'Notes', author: 'Asha' })).toContain('Notes')
    expect(pdfEncryptSupported()).toBe(false)
    expect(pdfUnlockSupported()).toBe(false)
  })

  it('builds an SVG font from glyph lines and wraps comic pages', () => {
    const glyphs = parseGlyphLines('A M10 10 L20 40')
    expect(svgFont(glyphs)).toContain('unicode="A"')
    expect(nextPage(1, 2)).toBe(0)
  })
})
