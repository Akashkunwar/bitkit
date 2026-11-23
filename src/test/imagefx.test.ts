import { describe, expect, it } from 'vitest'
import {
  asciiFromLuma,
  boothStripCount,
  fisheyeIndex,
  seasonalDrapes,
  sortRow,
  strokeToFill,
  traceBlock,
  uniqueColors,
} from '../lib/imagefx'

const RAMP = '@%#*+=-:. '

describe('uniqueColors', () => {
  it('caps the swatch list and reports the full unique count', () => {
    const pixels = 15
    const data = new Uint8ClampedArray(pixels * 4)
    for (let i = 0; i < pixels; i += 1) {
      data[i * 4] = i
      data[i * 4 + 1] = 20
      data[i * 4 + 2] = 40
      data[i * 4 + 3] = 255
    }
    const capped = uniqueColors(data)
    expect(capped.total).toBe(15)
    expect(capped.colors).toHaveLength(12)
    expect(capped.colors.every((color) => /^#[0-9a-f]{6}$/.test(color))).toBe(true)
    expect(new Set(capped.colors).size).toBe(12)
    const tight = uniqueColors(data, 4)
    expect(tight.colors).toHaveLength(4)
    expect(tight.total).toBe(15)
  })

  it('counts duplicate pixels once', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255])
    const result = uniqueColors(data)
    expect(result.total).toBe(2)
    expect(result.colors).toContain('#ff0000')
    expect(result.colors).toContain('#0000ff')
  })
})

describe('fisheyeIndex', () => {
  it('maps the center pixel to itself and moves a corner', () => {
    const width = 21
    const height = 15
    const x = Math.floor((width - 1) / 2)
    const y = Math.floor((height - 1) / 2)
    expect(fisheyeIndex(x, y, width, height)).toBe(y * width + x)
    const corner = fisheyeIndex(0, 0, width, height)
    expect(corner).not.toBe(0)
    expect(Number.isInteger(corner)).toBe(true)
    expect(corner).toBeGreaterThanOrEqual(0)
    expect(corner).toBeLessThan(width * height)
    const far = fisheyeIndex(width - 1, height - 1, width, height)
    expect(far).not.toBe((height - 1) * width + (width - 1))
  })
})

describe('seasonalDrapes', () => {
  it('lists four seasons with four hex colors each', () => {
    const seasons = seasonalDrapes()
    expect(seasons).toHaveLength(4)
    expect(new Set(seasons.map((season) => season.id)).size).toBe(4)
    for (const season of seasons) {
      expect(season.colors).toHaveLength(4)
      for (const color of season.colors) expect(color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('strokeToFill', () => {
  it('changes a stroked rect into a filled rect', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="8" height="8" fill="none" stroke="#112233" stroke-width="2"/></svg>'
    const output = strokeToFill(input)
    expect(output).not.toBe(input)
    expect(output).toContain('<rect')
    expect(output).toContain('fill="#112233"')
    expect(output).not.toContain('fill="none"')
    expect(output).not.toContain('stroke="#112233"')
    expect(output).toContain('stroke="none"')
  })
})

describe('traceBlock', () => {
  it('emits one filled shape for a 2 by 2 black block', () => {
    const svg = traceBlock()
    expect(svg).toMatch(/<(rect|path)\b[^>]*fill="#000000"/)
    expect(svg).toMatch(/<rect\b[^>]*width="2"/)
    expect(svg).toMatch(/<rect\b[^>]*height="2"/)
    expect(svg.match(/<(rect|path)\b/g)?.length).toBe(1)
  })
})

describe('asciiFromLuma', () => {
  it('wraps rows to the given width and uses a denser character for darker luma', () => {
    const text = asciiFromLuma([0, 40, 80, 120, 160, 200, 240, 255], 4)
    const lines = text.split('\n')
    expect(lines).toHaveLength(2)
    for (const line of lines) expect(line).toHaveLength(4)
    const dark = asciiFromLuma([0], 1)
    const light = asciiFromLuma([255], 1)
    expect(dark).not.toBe(light)
    expect(RAMP.indexOf(dark)).toBeLessThan(RAMP.indexOf(light))
  })
})

describe('sortRow', () => {
  it('sorts ascending without mutating the input', () => {
    const input = [4, 1, 4, 2]
    const output = sortRow(input)
    expect(output).toEqual([1, 2, 4, 4])
    expect(input).toEqual([4, 1, 4, 2])
    expect(output).not.toBe(input)
  })
})

describe('boothStripCount', () => {
  it('clamps the frame count to 2, 3, or 4', () => {
    expect(boothStripCount(0)).toBe(2)
    expect(boothStripCount(2)).toBe(2)
    expect(boothStripCount(3.2)).toBe(3)
    expect(boothStripCount(4)).toBe(4)
    expect(boothStripCount(10)).toBe(4)
    expect(boothStripCount(Number.NaN)).toBe(2)
  })
})
