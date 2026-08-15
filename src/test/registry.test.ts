import { describe, expect, it } from 'vitest'
import { searchTools, tools } from '../registry'

describe('tool registry', () => {
  it('registers all tools with unique ids, paths, and titles', () => {
    const ids = tools.map((t) => t.id)
    const paths = tools.map((t) => t.path)
    const titles = tools.map((t) => t.title)
    expect(ids.length).toBeGreaterThanOrEqual(40)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
    expect(new Set(titles).size).toBe(titles.length)
    // Every tool must be reachable and describable.
    for (const tool of tools) {
      expect(tool.path.startsWith('/')).toBe(true)
      expect(tool.blurb.length).toBeGreaterThan(8)
      expect(tool.keywords.length).toBeGreaterThan(0)
    }
  })

  it('finds tools by synonym', () => {
    expect(searchTools('450').some((t) => t.id === 'compress')).toBe(true)
    expect(searchTools('scratch').some((t) => t.id === 'notes')).toBe(true)
    expect(searchTools('uuid').some((t) => t.id === 'password')).toBe(true)
    expect(searchTools('wifi').some((t) => t.id === 'qr')).toBe(true)
    expect(searchTools('signature').some((t) => t.id === 'pdf')).toBe(true)
    expect(searchTools('oklch').some((t) => t.id === 'tailwind')).toBe(true)
    expect(searchTools('unix').some((t) => t.id === 'convert')).toBe(true)
    expect(searchTools('jwt').some((t) => t.id === 'encode')).toBe(true)
    expect(searchTools('whatsapp').some((t) => t.id === 'links')).toBe(true)
    expect(searchTools('tesseract').some((t) => t.id === 'ocr')).toBe(true)
  })
})
