import { describe, expect, it } from 'vitest'
import { CANVAS_SAFE_MAX, stageDownscale } from '../lib/image/limits'

describe('large image safeguards', () => {
  it('caps canvas dimensions', () => {
    expect(CANVAS_SAFE_MAX).toBe(8192)
    expect(stageDownscale(20000, 10000)).toEqual({ width: 8192, height: 4096 })
  })

  it('leaves already-safe sizes alone', () => {
    expect(stageDownscale(1920, 1080)).toEqual({ width: 1920, height: 1080 })
  })
})
