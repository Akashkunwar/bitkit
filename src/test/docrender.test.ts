import { describe, expect, it } from 'vitest'
import { findCutRow, parseHexColor } from '../lib/domRaster'
import { detectDocKind, normalizeDocxCss } from '../lib/docRender'
import { docThemeCss, DOC_THEMES, mmToPx } from '../lib/docThemes'
import { buildDocument, printPageCss, standaloneHtml, tocFromHtml, wordStats } from '../lib/markdownDoc'

/** A width×height white image with dark "text" rows. */
function page(width: number, height: number, inkRows: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (const y of inkRows) {
    for (let x = 2; x < width - 2; x += 1) {
      const i = (y * width + x) * 4
      data[i] = data[i + 1] = data[i + 2] = 20
    }
  }
  return data
}

describe('page cutting', () => {
  it('cuts on the nearest blank row above the ideal line', () => {
    // Text on rows 40-49; the ideal cut at 45 would slice it, so move up to 39.
    const rows = Array.from({ length: 10 }, (_, i) => 40 + i)
    const data = page(100, 100, rows)
    expect(findCutRow(data, 100, 45, 0, [255, 255, 255])).toBe(39)
  })

  it('keeps the ideal line when it is already blank', () => {
    expect(findCutRow(page(100, 100, [10]), 100, 60, 0, [255, 255, 255])).toBe(60)
  })

  it('falls back to the ideal line when nothing above it is blank', () => {
    const rows = Array.from({ length: 100 }, (_, i) => i)
    expect(findCutRow(page(50, 100, rows), 50, 80, 20, [255, 255, 255])).toBe(80)
  })

  it('treats near-background pixels as blank', () => {
    const data = page(10, 10, [])
    data[5 * 10 * 4] = 250
    expect(findCutRow(data, 10, 5, 0, [255, 255, 255])).toBe(5)
  })

  it('parses hex colours', () => {
    expect(parseHexColor('#ff8000')).toEqual([255, 128, 0])
    expect(parseHexColor('nope')).toEqual([255, 255, 255])
  })
})

describe('word rendering helpers', () => {
  it('maps Symbol-font bullets to real characters and drops the font', () => {
    const css = 'p.docx-num-1-0:before { content: "\\9"; font-family: Symbol; }'
    const out = normalizeDocxCss(css)
    expect(out).toContain('•')
    expect(out).not.toMatch(/Symbol/)
    expect(normalizeDocxCss('x { content: ""; font-family: Wingdings; }')).toContain('▪')
  })

  it('recognises legacy .doc so it can explain rather than fail', () => {
    expect(detectDocKind(new File([''], 'old.doc'))).toBe('doc')
    expect(detectDocKind(new File([''], 'new.docx'))).toBe('docx')
    expect(detectDocKind(new File([''], 'notes.md'))).toBe('markdown')
    expect(detectDocKind(new File([''], 'blob.bin'))).toBeNull()
  })

  it('ships scoped CSS for every theme', () => {
    for (const theme of DOC_THEMES) {
      const css = docThemeCss(theme.id)
      expect(css).toContain('.doc-page')
      // Every rule is scoped, so a theme cannot restyle the app around it.
      const selectors = css.match(/(^|\})\s*([^{}@]+)\{/g) ?? []
      for (const s of selectors) expect(s, theme.id).toMatch(/\.doc-page/)
    }
    expect(Math.round(mmToPx(25.4))).toBe(96)
  })
})

describe('markdown documents', () => {
  it('turns page-break markers into breaks', () => {
    for (const marker of ['\\pagebreak', '\\newpage', '<!-- pagebreak -->']) {
      const { html } = buildDocument(`one\n\n${marker}\n\ntwo`, { toc: false, titleBlock: false })
      expect(html, marker).toContain('class="page-break"')
    }
  })

  it('embeds dropped images by the name used in the markdown', () => {
    const { html } = buildDocument('![logo](my-logo.png)', {
      toc: false,
      titleBlock: false,
      images: { 'my-logo.png': 'data:image/png;base64,AAAA' },
    })
    expect(html).toContain('src="data:image/png;base64,AAAA"')
  })

  it('builds a linked table of contents from headings', () => {
    const { html, toc } = buildDocument('# Title\n\n## One\n\n### Deep\n\n## Two', { toc: true, titleBlock: false })
    expect(toc.map((t) => t.text)).toEqual(['Title', 'One', 'Deep', 'Two'])
    expect(html).toContain('<nav class="doc-toc">')
    expect(html).toContain('href="#h-one"')
  })

  it('replaces a matching leading H1 with the title block', () => {
    const { html, title } = buildDocument('# Report\n\nBody', {
      toc: false,
      titleBlock: true,
      subtitle: 'Q3 · Finance',
    })
    expect(title).toBe('Report')
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('doc-title-block')
    expect(html).toContain('Q3 · Finance')
  })

  it('escapes user text placed into the title block and toc', () => {
    const { html } = buildDocument('Body', { toc: false, titleBlock: true, title: '<img src=x onerror=1>' })
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
  })

  it('writes page rules with running header, footer, and numbers', () => {
    const css = printPageCss({ paper: 'letter', marginMm: 20, header: 'Acme "Q3"', footer: 'Draft', pageNumbers: true })
    expect(css).toContain('size: letter')
    expect(css).toContain('margin: 20mm')
    expect(css).toContain('counter(pages)')
    expect(css).toContain('"Acme \\"Q3\\""')
    expect(printPageCss({ paper: 'a4', marginMm: 18, pageNumbers: false })).not.toContain('counter(')
  })

  it('produces a self-contained HTML file', () => {
    const html = standaloneHtml('A & B', '<p>Hi</p>', 'github', { paper: 'a4', marginMm: 18, pageNumbers: true })
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<title>A &amp; B</title>')
    expect(html).toContain('.doc-page')
    expect(html).not.toMatch(/<link|<script/)
  })

  it('reads headings back out of rendered html', () => {
    expect(tocFromHtml('<h2 id="h-a">A <em>b</em></h2><h4 id="h-c">C</h4>')).toEqual([
      { level: 2, id: 'h-a', text: 'A b' },
    ])
  })

  it('counts words, ignoring code blocks and markup', () => {
    expect(wordStats('# Hello world\n\n```\nconst a = 1\n```\n\n**bold** text').words).toBe(4)
  })
})
