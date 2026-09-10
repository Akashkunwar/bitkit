import { describe, expect, it } from 'vitest'
import { searchTools, tools } from '../registry'
import { contrastRatio, parseHex, wcagLevel } from '../lib/contrast'
import { diffLines, diffStats, unifiedPatch } from '../lib/diff'
import { crc32, zipStore } from '../lib/zip'
import { parsePageRange, mergePdfs, pdfPageCount } from '../lib/pdfPages'
import { PDFDocument } from 'pdf-lib'
import { gpsDecimal, stripJpeg, stripPng } from '../lib/exif'
import { passportLayout } from '../lib/passport'
import { buildIco } from '../lib/favicon'
import { fileKind, suggestPath, setHandoff, takeHandoff } from '../lib/handoff'

describe('tool registry', () => {
  it('registers expansion tools', () => {
    const ids = tools.map((t) => t.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'pages',
        'image-pdf',
        'exif',
        'favicon',
        'passport',
        'contrast',
        'diff',
        'convert',
        'encode',
        'text',
        'links',
        'regex',
        'ocr',
        'svg',
        'cutout',
        'forms',
        'picker',
      ]),
    )
  })

  it('finds new synonyms', () => {
    expect(searchTools('gps').some((t) => t.id === 'exif')).toBe(true)
    expect(searchTools('merge').some((t) => t.id === 'pages')).toBe(true)
    expect(searchTools('wcag').some((t) => t.id === 'contrast')).toBe(true)
    expect(searchTools('scan').some((t) => t.id === 'qr')).toBe(true)
  })
})

describe('contrast', () => {
  it('reports 21:1 for black on white', () => {
    const a = parseHex('#000000')
    const b = parseHex('#ffffff')
    expect(a && b && contrastRatio(a, b)).toBeCloseTo(21, 5)
    expect(wcagLevel(21, false)).toBe('AAA')
    expect(wcagLevel(4.5, false)).toBe('AA')
    expect(wcagLevel(3, false)).toBe('fail')
    expect(wcagLevel(3, true)).toBe('AA')
  })
})

describe('diff', () => {
  it('marks added and removed lines', () => {
    const ops = diffLines('a\nb\nc', 'a\nx\nc')
    expect(ops.filter((o) => o.type === 'del').map((o) => o.text)).toEqual(['b'])
    expect(ops.filter((o) => o.type === 'add').map((o) => o.text)).toEqual(['x'])
    expect(diffStats(ops)).toEqual({ added: 1, removed: 1, unchanged: 2 })
    expect(unifiedPatch('a', 'b')).toContain('-a')
  })
})

describe('zip store', () => {
  it('writes a readable local header', () => {
    const data = new TextEncoder().encode('hello')
    const zip = zipStore([{ name: 'hello.txt', data }])
    expect(zip[0]).toBe(0x50)
    expect(zip[1]).toBe(0x4b)
    expect(crc32(data)).toBe(0x3610a686)
  })
})

describe('pdf pages', () => {
  it('parses ranges and merges documents', async () => {
    expect(parsePageRange('1-3,5', 6)).toEqual([0, 1, 2, 4])
    expect(() => parsePageRange('9', 3)).toThrow()
    const a = await PDFDocument.create()
    a.addPage([100, 100])
    const b = await PDFDocument.create()
    b.addPage([80, 80])
    b.addPage([80, 80])
    const merged = await mergePdfs([await a.save(), await b.save()])
    expect(await pdfPageCount(merged)).toBe(3)
  })
})

describe('exif helpers', () => {
  it('converts GPS DMS to decimal', () => {
    const gps = gpsDecimal([12, 30, 0], 'N', [77, 36, 0], 'E')
    expect(gps?.lat).toBeCloseTo(12.5)
    expect(gps?.lon).toBeCloseTo(77.6)
  })

  it('strips JPEG APP1 and PNG text chunks', () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66, 0xff, 0xd9])
    const stripped = stripJpeg(jpeg)
    expect(stripped[0]).toBe(0xff)
    expect(stripped[1]).toBe(0xd8)
    expect([...stripped].join(',')).not.toContain('69,102')

    const png = new Uint8Array(8 + 12)
    png.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
    const strippedPng = stripPng(png)
    expect(strippedPng.length).toBeGreaterThanOrEqual(8)
  })
})

describe('passport layout', () => {
  it('tiles six 600px photos on 4x6', () => {
    const layout = passportLayout('4x6', 6)
    expect(layout.cells).toHaveLength(6)
    expect(layout.pageW).toBe(1200)
    expect(layout.cells[0].w).toBe(600)
  })
})

describe('favicon ico', () => {
  it('writes an ICONDIR header', () => {
    const png = new Uint8Array([137, 80, 78, 71])
    const ico = buildIco([{ size: 16, bytes: png }])
    expect(ico[2]).toBe(1)
    expect(ico[4]).toBe(1)
    expect(ico[6]).toBe(16)
  })
})

describe('handoff', () => {
  it('classifies files and is single-consume', () => {
    const image = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    const pdf = new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' })
    expect(fileKind(image)).toBe('image')
    expect(fileKind(pdf)).toBe('pdf')
    expect(suggestPath([image])).toBe('/compress')
    expect(suggestPath([pdf, pdf])).toBe('/pages')
    setHandoff({ files: [image], from: 'test' })
    expect(takeHandoff()?.from).toBe('test')
    expect(takeHandoff()).toBeNull()
  })
})

describe('convert / encode / text / links / regex', () => {
  it('parses unix and formats a zone', async () => {
    const { parseInstant, formatInZone } = await import('../lib/time')
    const instant = parseInstant('1710000000')
    expect(instant?.unixSec).toBe(1710000000)
    expect(formatInZone(instant!.date, 'UTC')).toContain('2024')
  })

  it('converts units, percent, and clamp', async () => {
    const { convert, percentOf, addTax, splitBill, fluidClamp } = await import('../lib/units')
    expect(convert('length', 1, 'm', 'cm')).toBeCloseTo(100)
    expect(convert('type', 32, 'px', 'rem', 16)).toBeCloseTo(2)
    expect(percentOf(18, 1000)).toBeCloseTo(180)
    expect(addTax(100, 18).total).toBeCloseTo(118)
    expect(splitBill(100, 4, 0).each).toBeCloseTo(25)
    expect(fluidClamp(16, 32)).toContain('clamp(')
  })

  it('encodes base64 and inspects a JWT', async () => {
    const { encodeTextBase64, decodeTextBase64, decodeJwt } = await import('../lib/encode')
    expect(decodeTextBase64(encodeTextBase64('kit'))).toBe('kit')
    const jwt = decodeJwt(
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiJraXQiLCJpYXQiOjE3MTAwMDAwMDB9.x',
    )
    expect((jwt.payload as { sub: string }).sub).toBe('kit')
  })

  it('transforms text and csv', async () => {
    const { applyCase, textStats, csvToJson, jsonToCsv, dummyPeople } = await import('../lib/textbench')
    expect(applyCase('Hello World', 'kebab')).toBe('hello-world')
    expect(textStats('one two').words).toBe(2)
    expect(csvToJson('a,b\n1,2')[0]).toEqual({ a: '1', b: '2' })
    expect(jsonToCsv('[{"a":"1"}]')).toContain('a')
    expect(dummyPeople(2)[0].email).toContain('@example.com')
  })

  it('builds everyday links', async () => {
    const { whatsappLink, utmLink, vcard, icsEvent } = await import('../lib/links')
    expect(whatsappLink('91 98 0000 0000', 'hi')).toBe('https://wa.me/919800000000?text=hi')
    expect(utmLink({ url: 'example.com', source: 'x', medium: 'y', campaign: 'z' })).toContain('utm_campaign=z')
    expect(vcard({ name: 'Asha' })).toContain('FN:Asha')
    expect(icsEvent({ title: 'Standup', start: '2026-03-09T10:00:00Z' })).toContain('BEGIN:VEVENT')
  })

  it('runs regex replace', async () => {
    const { runRegex } = await import('../lib/regex')
    const result = runRegex('(o+)', 'g', 'foo bar', '[$1]')
    expect(result.hits).toHaveLength(1)
    expect(result.replaced).toBe('f[oo] bar')
  })
})

describe('audit fixes', () => {
  it('treats 11–12 digit instants as milliseconds', async () => {
    const { parseInstant } = await import('../lib/time')
    expect(parseInstant('1710000000')?.unixSec).toBe(1710000000)
    expect(parseInstant('1710000000000')?.unixMs).toBe(1710000000000)
    const twelve = parseInstant('171000000000')
    expect(twelve?.unixMs).toBe(171000000000)
    expect(twelve?.unixSec).not.toBe(171000000000)
  })

  it('extracts GST from an inclusive amount', async () => {
    const { extractTax } = await import('../lib/units')
    const result = extractTax(118, 18)
    expect(result.base).toBeCloseTo(100)
    expect(result.tax).toBeCloseTo(18)
    expect(result.total).toBe(118)
  })

  it('rejects invalid annotation colours as black', async () => {
    const { hexToRgb } = await import('../lib/pdfEdit')
    expect(hexToRgb('#ffffff').red).toBe(1)
    expect(hexToRgb('#fff').green).toBe(1)
    expect(hexToRgb('nope').red).toBe(0)
    expect(hexToRgb('#gggggg').blue).toBe(0)
  })

  it('warns honestly about HEIC and animated GIF', async () => {
    const { imageFormatHint } = await import('../lib/image/formatHint')
    expect(imageFormatHint(new File([], 'a.heic', { type: 'image/heic' }))).toMatch(/HEIC/)
    expect(imageFormatHint(new File([], 'a.gif', { type: 'image/gif' }))).toMatch(/first frame/)
    expect(imageFormatHint(new File([], 'a.png', { type: 'image/png' }))).toBeNull()
  })

  it('refuses to hash files above the memory cap', async () => {
    const { HASH_MAX_BYTES, hashFile } = await import('../lib/checksum')
    const huge = { size: HASH_MAX_BYTES + 1 } as Blob
    await expect(hashFile(huge, 'SHA-256')).rejects.toThrow(/256/)
  })

  it('explains encrypted PDFs instead of pretending to decrypt them', async () => {
    const { encryptionWarning } = await import('../lib/pdfLoad')
    expect(encryptionWarning(false)).toBeNull()
    expect(encryptionWarning(true)).toMatch(/cannot decrypt/i)
    expect(encryptionWarning(true, 'pdfjs')).toMatch(/password/i)
  })

  it('maps pdf.js password failures to a typed error', async () => {
    const { PdfPasswordError, openPdfJs } = await import('../lib/pdfJs')
    await expect(
      openPdfJs(
        {
          getDocument: () => ({
            promise: Promise.reject(Object.assign(new Error('No password given'), { name: 'PasswordException', code: 1 })),
          }),
        },
        new Uint8Array([1]),
      ),
    ).rejects.toBeInstanceOf(PdfPasswordError)
    await expect(
      openPdfJs(
        {
          getDocument: () => ({
            promise: Promise.reject(Object.assign(new Error('Incorrect Password'), { name: 'PasswordException', code: 2 })),
          }),
        },
        new Uint8Array([1]),
        'wrong',
      ),
    ).rejects.toMatchObject({ kind: 'incorrect' })
  })

  it('advances a pipeline run to the next tool', async () => {
    const {
      advanceRun,
      continueRun,
      endRun,
      newPipeline,
      peekPipelineOutput,
      reportPipelineOutput,
      startRun,
      upsertPipeline,
    } = await import('../lib/pipelines')
    const pipeline = { ...newPipeline('audit'), steps: [{ toolId: 'compress' }, { toolId: 'finish' }] }
    await upsertPipeline(pipeline)
    startRun(pipeline.id)
    reportPipelineOutput({ text: 'ready' })
    expect(peekPipelineOutput()?.text).toBe('ready')
    const next = await continueRun()
    expect(next).toEqual({ path: '/finish' })
    expect(advanceRun({ pipelineId: pipeline.id, index: 0, startedAt: 1 }).index).toBe(1)
    endRun()
  })

  it('restores a handoff only when the generation still matches', async () => {
    const { handoffGeneration, restoreHandoff, setHandoff, takeHandoff } = await import('../lib/handoff')
    setHandoff({ text: 'first', from: 'test' })
    const gen = handoffGeneration()
    const payload = takeHandoff()
    setHandoff({ text: 'second', from: 'test' })
    restoreHandoff(payload!, gen)
    expect(takeHandoff()?.text).toBe('second')
  })
})
