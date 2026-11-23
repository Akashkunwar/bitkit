import { describe, expect, it } from 'vitest'
import { bezierCss, boxShadowCss, clipCss, radiusCss, triangleCss } from '../lib/cssStudio'

describe('css studio', () => {
  it('builds shadow, radius, clip, easing, and a triangle', () => {
    expect(boxShadowCss(2, 4, 8, 0, '#000', true)).toBe('inset 2px 4px 8px 0px #000')
    expect(radiusCss(4, 8, 12, 0)).toBe('4px 8px 12px 0px')
    expect(clipCss('diamond')).toContain('polygon')
    expect(bezierCss(0.4, 0, 0.2, 1)).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
    expect(triangleCss(12, '#abc', 'up')).toContain('border-bottom: 12px solid #abc')
  })
})
