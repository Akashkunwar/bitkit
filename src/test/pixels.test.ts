import { describe, expect, it } from 'vitest'
import { ditherRgba, halftoneRgba, invertRgba } from '../lib/pixels'

describe('pixel edits', () => {
  it('inverts RGB and leaves alpha alone', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 255, 255, 0, 0, 128])
    expect(Array.from(invertRgba(data))).toEqual([245, 235, 225, 255, 0, 255, 255, 128])
  })

  it('turns a dark cell into a larger halftone dot', () => {
    const data = new Uint8ClampedArray(8 * 8 * 4)
    const dots = halftoneRgba(data, 8, 8, 8)
    const center = (4 * 8 + 4) * 4
    const corner = 0
    expect(dots[center]).toBe(20)
    expect(dots[corner]).toBe(255)
  })

  it('dithers to black and white', () => {
    const data = new Uint8ClampedArray([40, 40, 40, 255, 200, 200, 200, 255])
    const out = ditherRgba(data, 2, 1)
    expect([out[0], out[4]]).toEqual([0, 255])
  })
})
