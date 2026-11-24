import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { colorHarmonies } from '../lib/colorMix'
import { gpa, reduceRatio } from '../lib/figures'
import { cueAt, parseSrt } from '../lib/media'
import { cropBox, cropPdf } from '../lib/pdfPages'
import { circleCrop, pixelate, sharpen, withBorder } from '../lib/picture'
import { canonicalTag, jsonLd, robotsTxt, serpFit, sitemapXml } from '../lib/seo'
import { rowsToCsv, splitRows } from '../lib/sheetSplit'
import { placeholderSvg } from '../lib/shapes'
import { agreementText, billOfSale, businessCardSvg, resumeText, signatureHtml } from '../lib/stationery'
import { keywordDensity, morseDecode, morseEncode, parseUrlParts, rot13, vigenere } from '../lib/textlab'
import { csvToXml, jsonToXml, xmlToJson } from '../lib/xml'

describe('frontend copies from AllToolKit and TinyWow', () => {
  it('counts words, rotates letters, and splits a URL', () => {
    expect(keywordDensity('Red red blue')[0]).toMatchObject({ word: 'red', count: 2 })
    expect(rot13(rot13('BitKit'))).toBe('BitKit')
    expect(vigenere(vigenere('Hello', 'key'), 'key', true)).toBe('Hello')
    expect(morseDecode(morseEncode('sos'))).toBe('sos')
    expect(parseUrlParts('example.com/a?b=1').params).toEqual([{ key: 'b', value: '1' }])
  })

  it('builds tags from pasted input and measures a title', () => {
    expect(robotsTxt({ userAgent: '*', allow: '/', disallow: '/admin', sitemap: '' })).toContain('Disallow: /admin')
    expect(canonicalTag('https://example.com/a')).toContain('rel="canonical"')
    expect(sitemapXml('https://example.com/')).toContain('<loc>https://example.com/</loc>')
    expect(jsonLd({ kind: 'faq', questions: [{ q: 'Q', a: 'A' }] })).toContain('FAQPage')
    expect(serpFit(100, 600)).toBe('fits')
    expect(serpFit(700, 600)).toBe('wide')
  })

  it('edits pixels, splits rows, and turns XML back into JSON', () => {
    const px = new Uint8ClampedArray(4 * 4 * 4).fill(255)
    expect(circleCrop(px, 4, 4)[3]).toBe(0)
    expect(circleCrop(px, 4, 4)[(1 * 4 + 1) * 4 + 3]).toBe(255)
    const framed = withBorder(px.slice(0, 4), 1, 1, 1, { r: 0, g: 0, b: 255, a: 255 })
    expect(framed.width).toBe(3)
    expect(framed.data[0]).toBe(0)
    expect(framed.data[2]).toBe(255)
    const sharp = sharpen(
      new Uint8ClampedArray([
        0, 0, 0, 255, 0, 0, 0, 255, 100, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0,
        255, 0, 0, 0, 255,
      ]),
      3,
      3,
    )
    expect(sharp[8]).toBe(255)
    const blocks = pixelate(
      new Uint8ClampedArray([0, 0, 0, 255, 100, 0, 0, 255, 0, 0, 0, 255, 100, 0, 0, 255]),
      2,
      2,
      2,
    )
    expect(blocks[0]).toBe(blocks[4])
    expect(splitRows([['h'], ['a'], ['b']], 1, true)).toEqual([
      [['h'], ['a']],
      [['h'], ['b']],
    ])
    expect(rowsToCsv([['a,b', 'c']])).toBe('"a,b",c')
    expect(xmlToJson(jsonToXml({ kit: true }))).toEqual({ kit: true })
    expect(xmlToJson('<kit>true</kit>')).toEqual({ kit: true })
    expect(csvToXml('name\nAda')).toContain('<name>Ada</name>')
    expect(colorHarmonies('#ff0000')[0]?.colors[1]).toBe('#00ffff')
  })

  it('fills local templates, reduces a ratio, and crops a PDF page', async () => {
    expect(
      resumeText({ name: 'Ada', title: '', email: '', phone: '', summary: '', experience: '', education: '' }),
    ).toContain('Ada')
    expect(signatureHtml({ name: 'Ada', title: 'Dev', company: '', email: '', phone: '', website: '' })).toContain(
      'Ada',
    )
    expect(
      signatureHtml({
        name: '<img src=x onerror=alert(1)>',
        title: '',
        company: '',
        email: '',
        phone: '',
        website: '',
      }),
    ).toContain('&lt;img')
    expect(businessCardSvg({ name: 'Ada', title: '', company: '', email: '', phone: '' })).toContain('Ada')
    expect(billOfSale({ seller: 'A', buyer: 'B', item: 'pen', price: '1', date: '', notes: '' })).toContain('pen')
    expect(agreementText({ partyA: 'A', partyB: 'B', date: '', subject: 'work', terms: '' })).toContain('work')
    expect(
      gpa([
        { credits: 3, grade: 'A' },
        { credits: 1, grade: 'C' },
      ]),
    ).toBe(3.5)
    expect(reduceRatio(1920, 1080).label).toBe('16:9')
    expect(placeholderSvg(32, 16)).toContain('width="32"')
    expect(cropBox(200, 100, { top: 10, right: 20, bottom: 30, left: 40 })).toEqual({
      x: 40,
      y: 30,
      width: 140,
      height: 60,
    })
    const doc = await PDFDocument.create()
    doc.addPage([200, 100])
    const cropped = await cropPdf(await doc.save(), { top: 10, right: 20, bottom: 30, left: 40 })
    const page = (await PDFDocument.load(cropped)).getPage(0)
    expect(page.getCropBox()).toMatchObject({ x: 40, y: 30, width: 140, height: 60 })
    const cues = parseSrt('1\n00:00:01,000 --> 00:00:03,000\nHello')
    expect(cueAt(cues, 1.5)).toBe('Hello')
    expect(cueAt(cues, 0.2)).toBe('')
  })
})
