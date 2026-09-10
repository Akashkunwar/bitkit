import { describe, expect, it } from 'vitest'
import { CANVAS_SAFE_MAX, stageDownscale } from '../lib/image/limits'
import { rotatedCropSize } from '../lib/image/filters'

describe('large image safeguards', () => {
  it('caps canvas dimensions', () => {
    expect(CANVAS_SAFE_MAX).toBe(8192)
    expect(stageDownscale(20000, 10000)).toEqual({ width: 8192, height: 4096 })
  })

  it('leaves already-safe sizes alone', () => {
    expect(stageDownscale(1920, 1080)).toEqual({ width: 1920, height: 1080 })
  })
})

describe('finish crop vs rotate', () => {
  it('swaps crop width and height after a 90° rotate', () => {
    expect(rotatedCropSize({ w: 400, h: 200 }, 0)).toEqual({ width: 400, height: 200 })
    expect(rotatedCropSize({ w: 400, h: 200 }, 90)).toEqual({ width: 200, height: 400 })
    expect(rotatedCropSize({ w: 400, h: 200 }, 270)).toEqual({ width: 200, height: 400 })
    expect(rotatedCropSize({ w: 400, h: 200 }, 180)).toEqual({ width: 400, height: 200 })
  })
})
