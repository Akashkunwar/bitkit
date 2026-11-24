import { describe, expect, it } from 'vitest'
import { formatQueryResult, queryJson } from '../lib/jsonQuery'
import { hexRows, sniffType } from '../lib/hex'
import { diffPixels, highlightChanges } from '../lib/imageDiff'
import { formatSrt, mergeCues, parseCaptions, shiftCues } from '../lib/captions'
import { convertAmount, inverseRate } from '../lib/exchange'
import { decodeBase32, totpCode } from '../lib/totp'
import { applyRename, conflictsWithExisting, planRename } from '../lib/rename'
import { tarExtract, tarPack } from '../lib/tar'
import { zipDeflate } from '../lib/zip'
import { unzip } from '../lib/zipRead'
import { HI_TOOLS } from '../lib/hiTools'
import { tools } from '../registry'

const books = {
  store: {
    book: [
      { title: 'Local', price: 8 },
      { title: 'Remote', price: 12 },
    ],
  },
}

describe('json query', () => {
  it('reads a property, an index, a wildcard, and a filter', () => {
    expect(queryJson(books, '$.store.book[0].title')).toEqual(['Local'])
    expect(queryJson(books, '$.store.book[*].title')).toEqual(['Local', 'Remote'])
    expect(queryJson(books, '$.store.book[?(@.price<10)].title')).toEqual(['Local'])
    expect(formatQueryResult(queryJson(books, '$.store.book[0].price'))).toBe('8')
  })

  it('rejects a path that does not start at the root', () => {
    expect(() => queryJson(books, 'store.book')).toThrow(/\$/)
  })
})

describe('hex view', () => {
  it('renders offset, hex, and printable ascii', () => {
    const rows = hexRows(new Uint8Array([0x48, 0x69, 0x0a]), 16)
    expect(rows).toHaveLength(1)
    expect(rows[0].offset).toBe('00000000')
    expect(rows[0].hex).toBe('48 69 0a')
    expect(rows[0].ascii).toBe('Hi·')
  })

  it('names a file from its opening bytes', () => {
    expect(sniffType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('PNG')
    expect(sniffType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe('PDF')
    expect(sniffType(new Uint8Array([0x1f, 0x8b, 0x00]))).toBe('gzip')
    expect(sniffType(new Uint8Array([0x00, 0x01]))).toBe('Unknown')
  })
})

describe('image diff', () => {
  it('counts only pixels past the threshold and highlights those', () => {
    const a = new Uint8ClampedArray([0, 0, 0, 255, 10, 10, 10, 255])
    const b = new Uint8ClampedArray([0, 0, 0, 255, 10, 10, 40, 255])
    expect(diffPixels(a, b, 12)).toEqual({ changed: 1, total: 2 })
    expect(diffPixels(a, b, 40)).toEqual({ changed: 0, total: 2 })
    const marked = highlightChanges(a, b, 12)
    expect(marked[4]).toBe(190)
    expect(marked[0]).toBe(0)
  })
})

describe('captions', () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,000\nHello\n'

  it('shifts, merges, and writes SRT', () => {
    const cues = parseCaptions(srt, 'a.srt')
    expect(shiftCues(cues, 1.5)[0]).toMatchObject({ start: 2.5, end: 3.5 })
    expect(shiftCues(cues, -5)[0].start).toBe(0)
    const merged = mergeCues(cues, parseCaptions('WEBVTT\n\n00:00:04.000 --> 00:00:05.000\nLater\n', 'b.vtt'))
    expect(merged.map((cue) => cue.text)).toEqual(['Hello', 'Later'])
    expect(formatSrt(shiftCues(cues, 1))).toContain('00:00:02,000 --> 00:00:03,000')
  })
})

describe('exchange rate', () => {
  it('multiplies by the typed rate and inverts it', () => {
    expect(convertAmount(1000, 0.012)).toBeCloseTo(12)
    expect(inverseRate(4)).toBeCloseTo(0.25)
    expect(() => convertAmount(1, 0)).toThrow(/rate/)
  })
})

describe('totp', () => {
  it('matches the RFC 6238 SHA-1 vector at 59 seconds', async () => {
    const secret = new TextEncoder().encode('12345678901234567890')
    expect(await totpCode(secret, 59_000)).toBe('287082')
  })

  it('decodes the Base32 form of that secret', () => {
    const decoded = decodeBase32('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(new TextDecoder().decode(decoded)).toBe('12345678901234567890')
  })
})

describe('batch rename', () => {
  it('fills tokens and refuses two files with the same new name', () => {
    const date = new Date(2026, 0, 2, 3, 4, 5)
    expect(applyRename('Photo.JPG', '{date}-{nn}-{name}.{ext}', 0, date)).toBe('2026-01-02-01-Photo.JPG')
    expect(planRename(['a.txt', 'b.txt'], '{n}-{name}.{ext}')).toEqual([
      { from: 'a.txt', to: '1-a.txt' },
      { from: 'b.txt', to: '2-b.txt' },
    ])
    expect(() => planRename(['a.txt', 'b.txt'], 'file.{ext}')).toThrow(/twice/)
    expect(conflictsWithExisting([{ from: 'a.txt', to: 'keep.txt' }], ['a.txt', 'keep.txt'])).toBe('keep.txt')
  })
})

describe('tar and deflate', () => {
  it('round-trips a ustar archive', () => {
    const packed = tarPack([{ name: 'notes/readme.txt', data: new TextEncoder().encode('hello') }], 1_700_000_000)
    const files = tarExtract(packed)
    expect(files.map((file) => file.name)).toEqual(['notes/readme.txt'])
    expect(new TextDecoder().decode(files[0].data)).toBe('hello')
  })

  it('writes a deflated zip that still extracts', async () => {
    const text = 'hello hello hello hello'
    const zip = await zipDeflate([{ name: 'hello.txt', data: new TextEncoder().encode(text) }])
    const files = await unzip(zip)
    expect(new TextDecoder().decode(files[0].data)).toBe(text)
  })
})

describe('hindi catalog', () => {
  it('names every tool', () => {
    for (const tool of tools) {
      expect(HI_TOOLS[tool.id]?.title.length, tool.id).toBeGreaterThan(0)
      expect(HI_TOOLS[tool.id]?.blurb.length, tool.id).toBeGreaterThan(8)
    }
  })
})
