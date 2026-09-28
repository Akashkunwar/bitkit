import { describe, expect, it } from 'vitest'
import {
  MARGINS,
  PAGE_SIZES,
  PX_TO_PT,
  moveItem,
  pageFor,
  placeImage,
  rotatedSize,
  targetPixels,
} from '../lib/pageLayout'
import { sortImages, turn } from '../lib/image/useImageList'
import { pageFileName, scaleForDpi } from '../lib/pdfRaster'
import { kindOf, toolsForFiles } from '../lib/fileRoutes'
import { scoreTool, searchTools, tools } from '../registry'
import { SEND_TARGETS } from '../lib/handoff'

const file = (name: string, type = '') => new File(['x'], name, { type })

describe('page layout', () => {
  it('sizes a fit page to the image at 96 dpi, plus margins', () => {
    expect(pageFor(1200, 800, 'fit', 'auto', 0)).toEqual({ width: 1200 * PX_TO_PT, height: 800 * PX_TO_PT })
    expect(pageFor(100, 100, 'fit', 'auto', 18)).toEqual({ width: 75 + 36, height: 75 + 36 })
  })

  it('turns the page for wide images only in auto orientation', () => {
    const [w, h] = PAGE_SIZES.a4
    expect(pageFor(4000, 3000, 'a4', 'auto', 0)).toEqual({ width: h, height: w })
    expect(pageFor(3000, 4000, 'a4', 'auto', 0)).toEqual({ width: w, height: h })
    expect(pageFor(4000, 3000, 'a4', 'portrait', 0)).toEqual({ width: w, height: h })
    expect(pageFor(3000, 4000, 'a4', 'landscape', 0)).toEqual({ width: h, height: w })
  })

  it('centres a contained image inside the margins', () => {
    const { dest, crop } = placeImage(200, 100, 600, 800, 50, 'contain')
    expect(crop).toEqual({ x: 0, y: 0, width: 200, height: 100 })
    expect(dest.width).toBeCloseTo(500)
    expect(dest.height).toBeCloseTo(250)
    expect(dest.x).toBeCloseTo(50)
    expect(dest.y).toBeCloseTo(50 + (700 - 250) / 2)
  })

  it('crops the centre for cover so nothing is drawn outside the box', () => {
    const { dest, crop } = placeImage(400, 100, 200, 200, 0, 'cover')
    expect(dest).toEqual({ x: 0, y: 0, width: 200, height: 200 })
    expect(crop).toEqual({ x: 150, y: 0, width: 100, height: 100 })
  })

  it('stretches to the content box', () => {
    const { dest } = placeImage(10, 90, 300, 300, MARGINS.small, 'stretch')
    expect(dest).toEqual({ x: 18, y: 18, width: 264, height: 264 })
  })

  it('swaps dimensions for quarter turns only', () => {
    expect(rotatedSize(10, 20, 90)).toEqual({ width: 20, height: 10 })
    expect(rotatedSize(10, 20, 180)).toEqual({ width: 10, height: 20 })
    expect(rotatedSize(10, 20, 270)).toEqual({ width: 20, height: 10 })
  })

  it('caps embedded pixels at the target dpi and never upscales', () => {
    // A 6000px photo in a 3-inch box at 300 dpi needs 900px.
    const big = targetPixels({ x: 0, y: 0, width: 6000, height: 4000 }, { x: 0, y: 0, width: 216, height: 144 }, 300)
    expect(big).toEqual({ width: 900, height: 600 })
    const small = targetPixels({ x: 0, y: 0, width: 100, height: 50 }, { x: 0, y: 0, width: 500, height: 250 }, 300)
    expect(small).toEqual({ width: 100, height: 50 })
    expect(targetPixels({ x: 0, y: 0, width: 6000, height: 10 }, { x: 0, y: 0, width: 1, height: 1 }, null)).toEqual({
      width: 6000,
      height: 10,
    })
  })

  it('moves one item without disturbing the rest', () => {
    // "Move the 2nd image to 4th": index 1 to index 3.
    expect(moveItem(['a', 'b', 'c', 'd', 'e'], 1, 3)).toEqual(['a', 'c', 'd', 'b', 'e'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
})

describe('image list ordering', () => {
  const list = [
    { name: 'img10.jpg', lastModified: 3, size: 5 },
    { name: 'img2.jpg', lastModified: 1, size: 50 },
    { name: 'IMG1.jpg', lastModified: 2, size: 20 },
  ]

  it('sorts names naturally and case-insensitively', () => {
    expect(sortImages(list, 'name-asc').map((i) => i.name)).toEqual(['IMG1.jpg', 'img2.jpg', 'img10.jpg'])
    expect(sortImages(list, 'name-desc').map((i) => i.name)).toEqual(['img10.jpg', 'img2.jpg', 'IMG1.jpg'])
  })

  it('sorts by date and size without mutating the input', () => {
    expect(sortImages(list, 'date-asc').map((i) => i.lastModified)).toEqual([1, 2, 3])
    expect(sortImages(list, 'date-desc').map((i) => i.lastModified)).toEqual([3, 2, 1])
    expect(sortImages(list, 'size-desc').map((i) => i.size)).toEqual([50, 20, 5])
    expect(list[0].name).toBe('img10.jpg')
  })

  it('wraps rotation in both directions', () => {
    expect(turn(0, -90)).toBe(270)
    expect(turn(270, 90)).toBe(0)
    expect(turn(90, 180)).toBe(270)
  })
})

describe('pdf rasterising', () => {
  it('converts dpi to a pdf.js scale and caps oversized pages', () => {
    expect(scaleForDpi(595, 842, 72)).toBe(1)
    expect(scaleForDpi(595, 842, 144)).toBe(2)
    // A0 at 300 dpi would be ~14000px tall; it is capped to the canvas limit.
    const scale = scaleForDpi(2384, 3370, 300)
    expect(3370 * scale).toBeLessThanOrEqual(8192)
  })

  it('zero-pads page numbers so files sort in order', () => {
    expect(pageFileName('report', 3, 12, 'png')).toBe('report-page-03.png')
    expect(pageFileName('report', 7, 150, 'jpeg')).toBe('report-page-007.jpg')
    expect(pageFileName('a', 1, 1, 'webp')).toBe('a-page-01.webp')
  })
})

describe('smart drop routing', () => {
  it('classifies files by type and extension', () => {
    expect(kindOf(file('a.JPG'))).toBe('image')
    expect(kindOf(file('x', 'image/png'))).toBe('image')
    expect(kindOf(file('logo.svg'))).toBe('svg')
    expect(kindOf(file('doc.pdf'))).toBe('pdf')
    expect(kindOf(file('brief.docx'))).toBe('word')
    expect(kindOf(file('data.csv'))).toBe('sheet')
    expect(kindOf(file('readme.md'))).toBe('markdown')
    expect(kindOf(file('clip.mp4'))).toBe('video')
    expect(kindOf(file('blob.bin'))).toBe('other')
  })

  it('offers PDF to images first for one PDF, and merging for several', () => {
    expect(toolsForFiles([file('a.pdf')])[0].id).toBe('pdf-images')
    expect(toolsForFiles([file('a.pdf'), file('b.pdf')])[0].id).toBe('pages')
  })

  it('offers images to PDF first for several images', () => {
    expect(toolsForFiles([file('a.png'), file('b.jpg')])[0].id).toBe('image-pdf')
  })

  it('always ends with tools that take any file, without duplicates', () => {
    const ids = toolsForFiles([file('blob.bin')]).map((t) => t.id)
    expect(ids).toEqual(['archive', 'checksum'])
    const pdfIds = toolsForFiles([file('a.pdf')]).map((t) => t.id)
    expect(new Set(pdfIds).size).toBe(pdfIds.length)
  })
})

describe('ranked search', () => {
  it('finds tools by the words people type, ignoring filler', () => {
    expect(searchTools('pdf to jpg')[0].id).toBe('pdf-images')
    expect(searchTools('jpg to pdf')[0].id).toBe('image-pdf')
    expect(searchTools('convert pdf to png').some((t) => t.id === 'pdf-images')).toBe(true)
  })

  it('ranks a title match above a blurb match', () => {
    const regex = tools.find((t) => t.id === 'regex')!
    const json = tools.find((t) => t.id === 'json')!
    expect(scoreTool(regex, 'regex')).toBeGreaterThan(scoreTool(json, 'regex'))
  })

  it('returns nothing for words no tool mentions', () => {
    expect(searchTools('zzzqqq')).toEqual([])
  })
})

describe('send targets', () => {
  it('derive from the registry so every accepting tool is listed once', () => {
    const accepting = tools.filter((t) => t.accepts?.length).map((t) => t.id)
    expect(SEND_TARGETS.map((t) => t.id)).toEqual(accepting)
    expect(SEND_TARGETS.find((t) => t.id === 'pdf-images')?.accepts).toEqual(['pdf'])
  })
})
