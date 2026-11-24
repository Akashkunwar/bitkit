import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { compareTax, hraExemption } from '../lib/tax'
import { parseSubnet } from '../lib/subnet'
import { toDevanagari, toRoman } from '../lib/transliterate'
import { findReplace, transformLines } from '../lib/lines'
import { jsonToTypeScript, jsonToZod } from '../lib/jsonTypes'
import { formatCss, formatHtml, formatSql, htmlToMarkdown } from '../lib/codeFormat'
import { paletteFromPixels, swatchHex } from '../lib/palette'
import { diffPixels } from '../lib/pixels'
import { labelGrid } from '../lib/labelSheet'
import { decodeGif, encodeGif } from '../lib/gif'
import { rectsOverlap, redactPdf } from '../lib/pdfRedact'
import { deleteNamedPreset, readNamedPresets, saveNamedPreset } from '../lib/namedPresets'
import { fileFromPastedText } from '../lib/homeStage'
import { amountToWords, integerToWords } from '../lib/numwords'
import { wrapLines } from '../lib/cards'
import { normalizeRect } from '../lib/markup'

const TINY_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
)

describe('income tax', () => {
  const base = {
    gross: 1_275_000,
    salaried: true,
    age: 'below60' as const,
    resident: true,
    basic: 600_000,
    hraReceived: 0,
    rentPaid: 0,
    metro: true,
    oldDeductions: 0,
  }

  it('zeros new-regime tax at ₹12.75 lakh of salary', () => {
    const result = compareTax(base)
    expect(result.new.taxable).toBe(1_200_000)
    expect(result.new.standardDeduction).toBe(75_000)
    expect(result.new.total).toBe(0)
  })

  it('exempts HRA as the least of the three statutory amounts', () => {
    expect(hraExemption(400_000, 200_000, 240_000, true)).toBe(200_000)
    expect(hraExemption(400_000, 200_000, 240_000, false)).toBe(160_000)
    const result = compareTax({
      ...base,
      gross: 800_000,
      basic: 400_000,
      hraReceived: 200_000,
      rentPaid: 240_000,
      oldDeductions: 150_000,
    })
    expect(result.old.hraExemption).toBe(200_000)
    expect(result.old.taxable).toBe(400_000)
    expect(result.old.total).toBe(0)
    expect(result.new.hraExemption).toBe(0)
  })

  it('does not invent old-regime marginal relief above ₹5 lakh', () => {
    const result = compareTax({ ...base, gross: 510_000, salaried: false })
    expect(result.old.taxable).toBe(510_000)
    expect(result.old.rebate).toBe(0)
    expect(result.old.slabTax).toBe(14_500)
    expect(result.old.total).toBe(15_080)
  })
})

describe('subnet', () => {
  it('splits a /24 and treats /31 and /32 as usable', () => {
    const lan = parseSubnet('192.168.1.10/24')
    expect(lan.network).toBe('192.168.1.0')
    expect(lan.broadcast).toBe('192.168.1.255')
    expect(lan.first).toBe('192.168.1.1')
    expect(lan.last).toBe('192.168.1.254')
    expect(lan.hosts).toBe(254)
    expect(lan.netmask).toBe('255.255.255.0')
    expect(parseSubnet('10.0.0.1/32').hosts).toBe(1)
    expect(parseSubnet('10.0.0.0/31').hosts).toBe(2)
  })
})

describe('transliteration', () => {
  it('writes common words and reads them back', () => {
    expect(toDevanagari('namaste')).toBe('नमस्ते')
    expect(toDevanagari('kit')).toBe('कित')
    expect(toDevanagari('kitt')).toBe('किट')
    expect(toDevanagari('bhaarat')).toBe('भारत')
    expect(toRoman('नमस्ते')).toBe('namaste')
    expect(toRoman('भारत')).toBe('bhaarat')
  })
})

describe('line and code tools', () => {
  it('sorts, dedupes, and replaces', () => {
    expect(transformLines('b\na\na', 'unique')).toBe('b\na')
    expect(transformLines('10\n2', 'sort')).toBe('2\n10')
    expect(findReplace('Cat cat', 'cat', 'dog', {})).toBe('dog dog')
  })

  it('infers a type and a zod schema', () => {
    const value = { name: 'kit', n: 1, tags: ['a'] }
    expect(jsonToTypeScript(value)).toContain('name: string')
    expect(jsonToTypeScript(value)).toContain('tags: string[]')
    expect(jsonToZod(value)).toContain('z.object')
    expect(jsonToZod([{ a: 1 }, { a: 2, b: true }])).toContain('optional()')
  })

  it('formats sql, css, and html, and turns html into markdown', () => {
    expect(formatSql('select a from t where b = 1')).toContain('\nFROM')
    expect(formatCss('a{color:red;}')).toContain('color: red;')
    expect(formatHtml('<p>Hi</p>')).toContain('<p>Hi</p>')
    expect(htmlToMarkdown('<h1>Title</h1><p>Hello <strong>there</strong></p>')).toBe('# Title\n\nHello **there**')
  })
})

describe('images and pdf helpers', () => {
  it('picks the dominant colour', () => {
    const data = new Uint8ClampedArray([200, 10, 10, 255, 200, 10, 10, 255])
    const [swatch] = paletteFromPixels(data, 2)
    expect(swatchHex(swatch)).toBe('#c80a0a')
  })

  it('marks a changed pixel', () => {
    const a = new Uint8ClampedArray([0, 0, 0, 255])
    const b = new Uint8ClampedArray([255, 255, 255, 255])
    const diff = diffPixels(a, b)
    expect(diff.changed).toBe(1)
    expect(diff.overlay[0]).toBe(220)
  })

  it('lays labels out inside the page', () => {
    const cells = labelGrid({ page: 'a4', cols: 2, rows: 2, margin: 36, gap: 12 })
    expect(cells).toHaveLength(4)
    expect(cells[0].y).toBeGreaterThan(cells[2].y)
  })

  it('round-trips a two-colour gif', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255])
    const bytes = encodeGif([{ width: 2, height: 2, rgba, delayCs: 10 }])
    const decoded = decodeGif(bytes)
    expect(decoded.width).toBe(2)
    expect(decoded.height).toBe(2)
    expect(decoded.frames[0]).toHaveLength(4)
    expect(decoded.frames[0][0]).toBe(decoded.frames[0][2])
    expect(decoded.frames[0][1]).not.toBe(decoded.frames[0][0])
  })

  it('removes text from a redacted page', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    page.drawText('SECRET', { x: 72, y: 720, size: 24, font })
    const source = await doc.save()
    const out = await redactPdf(
      source,
      [{ sourceIndex: 0, boxes: [{ x: 60, y: 40, w: 200, h: 40 }] }],
      async () => TINY_PNG,
    )
    expect(new TextDecoder().decode(out)).not.toContain('SECRET')
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 2, h: 2 })).toBe(true)
  })
})

describe('presets, paste routing, and hindi amounts', () => {
  it('saves and deletes a named preset', async () => {
    const saved = await saveNamedPreset('test-tool', 'Portal', { maxBytes: '450kb', fit: 'contain' })
    expect(saved[0].name).toBe('Portal')
    expect((await readNamedPresets('test-tool'))[0].value.maxBytes).toBe('450kb')
    expect(await deleteNamedPreset('test-tool', saved[0].id)).toEqual([])
  })

  it('routes pasted text by shape', () => {
    expect(fileFromPastedText('{"a":1}').name).toBe('pasted.json')
    expect(fileFromPastedText('a,b\n1,2').name).toBe('pasted.csv')
    expect(fileFromPastedText('# Hello').name).toBe('pasted.md')
  })

  it('spells rupees in Hindi', () => {
    expect(integerToWords(100_000, 'indian', 'hi')).toBe('एक लाख')
    expect(amountToWords(101, { language: 'hi' })).toBe('एक सौ एक रुपये मात्र')
  })

  it('wraps quote lines and normalises a drag rectangle', () => {
    expect(wrapLines('one two three', 7)).toEqual(['one two', 'three'])
    expect(normalizeRect(4, 1, 1, 5)).toEqual({ x: 1, y: 1, w: 3, h: 4 })
  })
})
