import { describe, expect, it } from 'vitest'
import { encodeBmp, formatForMime, inscribedSize, outputSize, renameFor, rotatedBounds } from '../lib/image/transform'
import { autoColumns, layoutCollage, type CollageOptions } from '../lib/collage'
import { chromeHeight, layoutFrame } from '../lib/frame'

describe('rotation geometry', () => {
  it('grows the bounding box by the rotated corners', () => {
    expect(rotatedBounds(100, 50, 0)).toEqual({ width: 100, height: 50 })
    const quarter = rotatedBounds(100, 50, 90)
    expect(quarter.width).toBeCloseTo(50)
    expect(quarter.height).toBeCloseTo(100)
    const diag = rotatedBounds(100, 100, 45)
    expect(diag.width).toBeCloseTo(141.42, 1)
  })

  it('crops a straightened image to a same-ratio rectangle with no empty corners', () => {
    const { width, height } = inscribedSize(400, 300, 10)
    expect(width / height).toBeCloseTo(400 / 300)
    expect(width).toBeLessThan(400)
    // Every corner of the crop must fall inside the rotated source.
    const rad = (10 * Math.PI) / 180
    for (const [x, y] of [
      [width / 2, height / 2],
      [-width / 2, height / 2],
    ]) {
      const u = x * Math.cos(rad) + y * Math.sin(rad)
      const v = -x * Math.sin(rad) + y * Math.cos(rad)
      expect(Math.abs(u)).toBeLessThanOrEqual(200 + 1e-6)
      expect(Math.abs(v)).toBeLessThanOrEqual(150 + 1e-6)
    }
    expect(inscribedSize(400, 300, 0)).toEqual({ width: 400, height: 300 })
  })

  it('sizes the output for quarter turns, scaling, and a max side', () => {
    expect(outputSize(400, 300, { rotation: 90 })).toEqual({ width: 300, height: 400 })
    expect(outputSize(400, 300, { scale: 0.5 })).toEqual({ width: 200, height: 150 })
    expect(outputSize(4000, 3000, { maxSide: 1000 })).toEqual({ width: 1000, height: 750 })
    // Never upscales.
    expect(outputSize(400, 300, { maxSide: 4000 })).toEqual({ width: 400, height: 300 })
    // Stays within the canvas limit.
    const huge = outputSize(20000, 10000, {})
    expect(Math.max(huge.width, huge.height)).toBeLessThanOrEqual(8192)
  })
})

describe('bmp encoder', () => {
  it('writes a valid 24-bit header and bottom-up BGR rows padded to 4 bytes', () => {
    // 2x2: red, green / blue, white (RGBA, top row first).
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255])
    const bmp = encodeBmp(rgba, 2, 2)
    const view = new DataView(bmp.buffer)
    expect(String.fromCharCode(bmp[0], bmp[1])).toBe('BM')
    expect(view.getUint32(2, true)).toBe(bmp.length)
    expect(view.getInt32(18, true)).toBe(2)
    expect(view.getUint16(28, true)).toBe(24)
    // Rows are 6 bytes of pixels padded to 8.
    expect(bmp.length).toBe(54 + 8 * 2)
    // First stored row is the bottom one: blue then white, as BGR.
    expect([...bmp.slice(54, 60)]).toEqual([255, 0, 0, 255, 255, 255])
    expect([...bmp.slice(62, 68)]).toEqual([0, 0, 255, 0, 255, 0])
  })
})

describe('naming and formats', () => {
  it('renames with the new extension', () => {
    expect(renameFor('holiday.photo.jpeg', 'webp')).toBe('holiday.photo.webp')
    expect(renameFor('scan', 'png', '-edited')).toBe('scan-edited.png')
    expect(renameFor('.png', 'jpeg')).toBe('image.jpg')
  })

  it('maps mime types back to formats', () => {
    expect(formatForMime('image/jpeg')).toBe('jpeg')
    expect(formatForMime('image/jpg')).toBe('jpeg')
    expect(formatForMime('image/webp')).toBe('webp')
    expect(formatForMime('image/gif')).toBeNull()
  })
})

describe('collage layout', () => {
  const base: CollageOptions = {
    layout: 'grid',
    columns: 0,
    aspect: 'square',
    fit: 'cover',
    width: 1000,
    gap: 10,
    padding: 20,
  }
  const imgs = (n: number, w = 400, h = 300) => Array.from({ length: n }, () => ({ width: w, height: h }))

  it('picks a near-square grid', () => {
    expect(autoColumns(1)).toBe(1)
    expect(autoColumns(4)).toBe(2)
    expect(autoColumns(5)).toBe(3)
    expect(autoColumns(9)).toBe(3)
  })

  it('lays out equal square cells inside the padding', () => {
    const { width, height, placements } = layoutCollage(imgs(4), base)
    expect(width).toBe(1000)
    const cell = (1000 - 40 - 10) / 2
    expect(placements[0].cell).toEqual({ x: 20, y: 20, width: cell, height: cell })
    expect(placements[3].cell.x).toBeCloseTo(20 + cell + 10)
    expect(height).toBe(Math.round(40 + cell * 2 + 10))
  })

  it('crops for cover and letterboxes for contain', () => {
    const cover = layoutCollage(imgs(1, 400, 200), { ...base, columns: 1 }).placements[0]
    expect(cover.crop).toEqual({ x: 100, y: 0, width: 200, height: 200 })
    const contain = layoutCollage(imgs(1, 400, 200), { ...base, columns: 1, fit: 'contain' }).placements[0]
    expect(contain.draw.height).toBeCloseTo(contain.cell.width / 2)
    expect(contain.crop.width).toBe(400)
  })

  it('centres a short last row', () => {
    const { placements } = layoutCollage(imgs(3), { ...base, columns: 2 })
    const cell = placements[0].cell.width
    expect(placements[2].cell.x).toBeCloseTo(20 + (cell + 10) / 2)
  })

  it('puts images side by side at one height that fills the width', () => {
    const { placements, height } = layoutCollage(
      [
        { width: 200, height: 100 },
        { width: 100, height: 100 },
      ],
      { ...base, layout: 'row', padding: 0, gap: 0, width: 300 },
    )
    expect(placements[0].cell.height).toBeCloseTo(100)
    expect(placements[0].cell.width + placements[1].cell.width).toBeCloseTo(300)
    expect(height).toBe(100)
  })

  it('stacks images at the full inner width', () => {
    const { placements, height } = layoutCollage(
      [
        { width: 100, height: 50 },
        { width: 100, height: 100 },
      ],
      { ...base, layout: 'column', padding: 0, gap: 10, width: 200 },
    )
    expect(placements[1].cell.y).toBeCloseTo(110)
    expect(height).toBe(100 + 10 + 200)
  })
})

describe('screenshot frame layout', () => {
  const base = { padding: 0.1, radius: 12, shadow: 0.5, chrome: 'none' as const, aspect: 'auto' as const, title: '' }

  it('pads around the screenshot by a share of its longer side', () => {
    const layout = layoutFrame(1000, 600, base)
    expect(layout.width).toBe(1200)
    expect(layout.height).toBe(800)
    expect(layout.window).toEqual({ x: 100, y: 100, width: 1000, height: 600 })
  })

  it('adds a title bar for window chrome', () => {
    const layout = layoutFrame(1000, 600, { ...base, chrome: 'mac-light' })
    expect(layout.bar).toBe(chromeHeight('mac-light', 1000))
    expect(layout.window.height).toBe(600 + layout.bar)
    expect(chromeHeight('browser', 1000)).toBeGreaterThan(chromeHeight('mac-dark', 1000))
  })

  it('grows the canvas to hit an aspect ratio without cropping', () => {
    const square = layoutFrame(1600, 900, { ...base, aspect: '1:1' })
    expect(square.width).toBe(square.height)
    expect(square.window.width).toBe(1600)
    const wide = layoutFrame(400, 800, { ...base, aspect: '16:9' })
    expect(wide.width / wide.height).toBeCloseTo(16 / 9, 2)
    expect(wide.window.x).toBeGreaterThan(0)
  })
})
