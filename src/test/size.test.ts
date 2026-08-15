import { describe, expect, it } from 'vitest'
import { computeTargetSize, nextQualityBounds } from '../lib/image/size'
import { applyFilenamePattern, parseByteLimit, formatBytes } from '../lib/format'

describe('computeTargetSize', () => {
  it('contains inside exact box without stretching', () => {
    const r = computeTargetSize(2000, 1000, { width: 450, height: 450, fit: 'contain' })
    expect(r.width).toBe(450)
    expect(r.height).toBe(225)
  })

  it('covers and crops the center', () => {
    const r = computeTargetSize(2000, 1000, { width: 450, height: 450, fit: 'cover' })
    expect(r.width).toBe(450)
    expect(r.height).toBe(450)
    expect(r.sw).toBe(1000)
    expect(r.sh).toBe(1000)
    expect(r.sx).toBe(500)
  })

  it('only downscales for max dimensions', () => {
    const small = computeTargetSize(100, 80, { maxWidth: 450, maxHeight: 450 })
    expect(small.width).toBe(100)
    const large = computeTargetSize(2000, 1000, { maxWidth: 450, maxHeight: 450 })
    expect(large.width).toBe(450)
    expect(large.height).toBe(225)
  })
})

describe('byte limits', () => {
  it('parses kb and mb', () => {
    expect(parseByteLimit('450kb')).toBe(450 * 1024)
    expect(parseByteLimit('2 MB')).toBe(2 * 1024 * 1024)
  })

  it('widens the floor when a quality already fits', () => {
    const next = nextQualityBounds(0.3, 0.9, 0.5, 300_000, 400_000)
    expect(next.low).toBe(0.5)
    expect(next.quality).toBeGreaterThan(0.5)
  })

  it('tightens quality when over budget', () => {
    const next = nextQualityBounds(0.3, 0.9, 0.8, 500_000, 400_000)
    expect(next.high).toBe(0.8)
    expect(next.quality).toBeLessThan(0.8)
  })

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
  })
})

describe('filename pattern', () => {
  it('injects original and extension', () => {
    expect(applyFilenamePattern('{original}-out', { original: 'Shot.PNG', ext: 'jpg' })).toBe('Shot-out.jpg')
  })
})
