import { describe, expect, it } from 'vitest'
import { renderMarkdown, extractTitle, tocFromMarkdown } from '../lib/markdown'

describe('markdown sanitization', () => {
  it('renders gfm tables and headings', () => {
    const html = renderMarkdown('# Hello\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n')
    expect(html).toContain('<h1')
    expect(html).toContain('<table')
  })

  it('strips script tags', () => {
    const html = renderMarkdown('<script>alert(1)</script>ok')
    expect(html.toLowerCase()).not.toContain('<script')
    expect(html).toContain('ok')
  })

  it('strips onerror handlers', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">')
    expect(html.toLowerCase()).not.toContain('onerror')
  })

  it('builds a local pdf blob from sanitized html', async () => {
    const { markdownHtmlToPdf } = await import('../lib/pdf')
    const blob = await markdownHtmlToPdf('<p>Hello table</p>', '# Hello', {
      pageSize: 'a4',
      marginMm: 16,
      footer: 'BitKit',
    })
    expect(blob.size).toBeGreaterThan(100)
  })
})
