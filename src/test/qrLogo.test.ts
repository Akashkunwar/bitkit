import { describe, expect, it } from 'vitest'
import { embedQrLogo } from '../lib/qrLogo'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><path d="M0 0h1v1H0z"/></svg>'

describe('embedQrLogo', () => {
  it('centers the logo and does not paint a rectangle behind it', () => {
    const out = embedQrLogo(SVG, 'data:image/png;base64,abc', { scale: 22, aspect: 1 })
    expect(out).toContain('class="qr-logo"')
    expect(out).not.toContain('<rect')
    const image = out.match(/<image[^>]* x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/)
    expect(image).not.toBeNull()
    const x = Number(image?.[1])
    const width = Number(image?.[3])
    expect(x + width / 2).toBeCloseTo(14.5, 1)
    expect(Number(image?.[4])).toBeCloseTo(width, 1)
  })

  it('keeps a wide wordmark wide', () => {
    const out = embedQrLogo(SVG, 'data:image/png;base64,abc', { scale: 48, aspect: 3 })
    const image = out.match(/width="([^"]+)" height="([^"]+)"/)
    expect(Number(image?.[1])).toBeGreaterThan(Number(image?.[2]) * 2)
  })

  it('leaves the svg alone when it has no viewBox', () => {
    expect(embedQrLogo('<svg></svg>', 'data:image/png;base64,abc', { scale: 18 })).toBe('<svg></svg>')
  })
})
