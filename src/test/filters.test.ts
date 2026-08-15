import { describe, expect, it } from 'vitest'
import { cssFilter, clampUnit } from '../lib/image/filters'

describe('image finishing helpers', () => {
  it('builds a css filter string', () => {
    expect(cssFilter({ brightness: 1.1, contrast: 0.9, saturation: 1 })).toBe(
      'brightness(1.1) contrast(0.9) saturate(1)',
    )
  })

  it('clamps adjustment range', () => {
    expect(clampUnit(-1)).toBe(0)
    expect(clampUnit(3)).toBe(2)
  })
})
