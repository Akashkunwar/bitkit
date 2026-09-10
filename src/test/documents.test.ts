import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  blocksToHtml,
  blocksToMarkdown,
  blocksToText,
  countWords,
  documentTitle,
  type DocBlock,
} from '../lib/docBlocks'
import { buildDocx, docxBlocksFromXml, readDocx } from '../lib/docx'
import { blocksFromHtml } from '../lib/pdf'
import { rtfToText, detectSource } from '../lib/office'
import { extractPdfText } from '../lib/pdfText'
import {
  DEFAULT_NUMBERS,
  DEFAULT_WATERMARK,
  deletePages,
  expandTokens,
  numberLabel,
  rotatePages,
  stampPdf,
  unsupportedGlyphs,
} from '../lib/stamp'
import { zipIndex, unzip } from '../lib/zipRead'
import { zipStore } from '../lib/zip'
import { inspectPdf } from '../lib/pdfPages'
import { tools, searchTools } from '../registry'
import { suggestPath } from '../lib/handoff'

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

function docXml(body: string): string {
  return `<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`
}

describe('docx reading', () => {
  it('maps styles to headings and keeps bold and italic runs', () => {
    const blocks = docxBlocksFromXml(
      docXml(
        '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Report</w:t></w:r></w:p>' +
          '<w:p><w:r><w:t xml:space="preserve">Plain </w:t></w:r>' +
          '<w:r><w:rPr><w:b/></w:rPr><w:t>bold</w:t></w:r>' +
          '<w:r><w:rPr><w:i/></w:rPr><w:t> italic</w:t></w:r></w:p>',
      ),
    )
    expect(blocks[0]).toEqual({ kind: 'h', level: 1, runs: [{ text: 'Report' }] })
    const para = blocks[1] as Extract<DocBlock, { kind: 'p' }>
    expect(para.kind).toBe('p')
    expect(para.runs).toEqual([{ text: 'Plain ' }, { text: 'bold', bold: true }, { text: ' italic', italic: true }])
  })

  it('treats w:val="0" as bold off, not bold on', () => {
    const blocks = docxBlocksFromXml(
      docXml('<w:p><w:r><w:rPr><w:b w:val="0"/></w:rPr><w:t>normal</w:t></w:r></w:p>'),
    )
    expect((blocks[0] as Extract<DocBlock, { kind: 'p' }>).runs[0].bold).toBeUndefined()
  })

  it('numbers an ordered list and bullets an unordered one', () => {
    const numbering = `<?xml version="1.0"?><w:numbering ${W}>
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>
      <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>
      <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
      <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
    </w:numbering>`
    const item = (numId: string, text: string) =>
      `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`
    const blocks = docxBlocksFromXml(docXml(item('1', 'first') + item('1', 'second') + item('2', 'dot')), numbering)
    expect(blocks.map((b) => (b.kind === 'li' ? b.marker : b.kind))).toEqual(['1.', '2.', '•'])
  })

  it('reads a table and detects a bold header row', () => {
    const cell = (text: string, bold = false) =>
      `<w:tc><w:p><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t>${text}</w:t></w:r></w:p></w:tc>`
    const blocks = docxBlocksFromXml(
      docXml(
        `<w:tbl><w:tr>${cell('Name', true)}${cell('Qty', true)}</w:tr><w:tr>${cell('Bolt')}${cell('4')}</w:tr></w:tbl>`,
      ),
    )
    expect(blocks[0]).toEqual({ kind: 'table', rows: [['Name', 'Qty'], ['Bolt', '4']], header: true })
  })

  it('emits a page break for an explicit break', () => {
    const blocks = docxBlocksFromXml(docXml('<w:p><w:r><w:br w:type="page"/><w:t>after</w:t></w:r></w:p>'))
    expect(blocks.some((b) => b.kind === 'break')).toBe(true)
  })
})

describe('docx writing', () => {
  const blocks: DocBlock[] = [
    { kind: 'h', level: 1, runs: [{ text: 'Quarterly note' }] },
    { kind: 'p', runs: [{ text: 'Revenue is ' }, { text: 'up', bold: true }] },
    { kind: 'li', runs: [{ text: 'One item' }], depth: 0, marker: '•' },
    { kind: 'table', rows: [['A', 'B'], ['1', '2']], header: true },
  ]

  it('produces a package Word can open', async () => {
    const bytes = buildDocx(blocks)
    const names = zipIndex(bytes).map((entry) => entry.name)
    expect(names).toContain('[Content_Types].xml')
    expect(names).toContain('word/document.xml')
    expect(names).toContain('word/styles.xml')
    expect(names).toContain('_rels/.rels')
  })

  it('round-trips headings, emphasis, and tables', async () => {
    const back = await readDocx(buildDocx(blocks))
    expect(back[0]).toEqual({ kind: 'h', level: 1, runs: [{ text: 'Quarterly note' }] })
    const para = back[1] as Extract<DocBlock, { kind: 'p' }>
    expect(para.runs).toEqual([{ text: 'Revenue is ' }, { text: 'up', bold: true }])
    expect(back.some((b) => b.kind === 'table' && b.rows[1][1] === '2')).toBe(true)
  })

  it('strips control characters that would make Word reject the file', async () => {
    const dirty = `a${String.fromCharCode(7)}bc`
    const back = await readDocx(buildDocx([{ kind: 'p', runs: [{ text: dirty }] }]))
    expect((back[0] as Extract<DocBlock, { kind: 'p' }>).runs[0].text).toBe('abc')
  })

  it('rejects a file that is not a Word package', async () => {
    const notWord = zipStore([{ name: 'hello.txt', data: new TextEncoder().encode('hi') }])
    await expect(readDocx(notWord)).rejects.toThrow(/not a Word/i)
  })
})

describe('block exporters', () => {
  const blocks: DocBlock[] = [
    { kind: 'h', level: 2, runs: [{ text: 'Notes' }] },
    { kind: 'p', runs: [{ text: 'Ship ' }, { text: 'today', bold: true }] },
    { kind: 'li', runs: [{ text: 'first' }], depth: 0, marker: '•' },
    { kind: 'table', rows: [['H'], ['v']], header: true },
  ]

  it('writes markdown with emphasis and a pipe table', () => {
    const md = blocksToMarkdown(blocks)
    expect(md).toContain('## Notes')
    expect(md).toContain('**today**')
    expect(md).toContain('| H |')
  })

  it('keeps table rows in one block so the pipe table stays valid', () => {
    const md = blocksToMarkdown(blocks)
    expect(md).toContain('| H |\n| --- |\n| v |')
  })

  it('writes html with the matching tags', () => {
    const html = blocksToHtml(blocks)
    expect(html).toContain('<h2>Notes</h2>')
    expect(html).toContain('<strong>today</strong>')
    expect(html).toContain('<th>H</th>')
  })

  it('writes plain text without markup', () => {
    const text = blocksToText(blocks)
    expect(text).toContain('Ship today')
    expect(text).not.toContain('**')
  })

  it('counts words and names the document from its first heading', () => {
    expect(countWords(blocks)).toBeGreaterThan(3)
    expect(documentTitle(blocks)).toBe('Notes')
  })
})

describe('html to blocks', () => {
  it('round-trips a nested list through html without losing depth', () => {
    const nested: DocBlock[] = [
      { kind: 'li', runs: [{ text: 'alpha' }], depth: 0, marker: '1.' },
      { kind: 'li', runs: [{ text: 'beta' }], depth: 1, marker: '\u2022' },
      { kind: 'li', runs: [{ text: 'gamma' }], depth: 0, marker: '2.' },
    ]
    const html = blocksToHtml(nested)
    expect(html).toBe('<ol><li>alpha<ul><li>beta</li></ul></li><li>gamma</li></ol>')
    const back = blocksFromHtml(html) as Extract<DocBlock, { kind: 'li' }>[]
    expect(back.map((b) => [b.depth, b.marker])).toEqual([
      [0, '1.'],
      [1, '\u2022'],
      [0, '2.'],
    ])
  })

  it('keeps nested lists, ordered markers, and inline emphasis', () => {
    const blocks = blocksFromHtml(
      '<h1>T</h1><ol><li>alpha<ul><li><em>beta</em></li></ul></li><li>gamma</li></ol>',
    )
    const items = blocks.filter((b) => b.kind === 'li') as Extract<DocBlock, { kind: 'li' }>[]
    expect(items.map((i) => i.marker)).toEqual(['1.', '•', '2.'])
    expect(items[1].depth).toBe(1)
    expect(items[1].runs[0].italic).toBe(true)
  })
})

describe('office sources', () => {
  it('detects a source kind from the extension', () => {
    expect(detectSource(new File([''], 'a.docx'))).toBe('docx')
    expect(detectSource(new File([''], 'a.PPTX'))).toBe('pptx')
    expect(detectSource(new File([''], 'a.zip'))).toBe(null)
  })

  it('recovers text from RTF', () => {
    const rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Calibri;}}\\f0\\fs22 Hello \\b world\\b0\\par Second line\\par}'
    const text = rtfToText(rtf)
    expect(text).toContain('Hello')
    expect(text).toContain('world')
    expect(text).toContain('Second line')
    expect(text).not.toContain('\\par')
  })
})

describe('pdf text extraction', () => {
  /** A stand-in for pdf.js: items carry the same transform/width shape. */
  function fakeDoc(pages: { str: string; x: number; y: number; size: number; width: number }[][]) {
    return {
      numPages: pages.length,
      getPage: async (n: number) => ({
        getTextContent: async () => ({
          items: pages[n - 1].map((item) => ({
            str: item.str,
            transform: [item.size, 0, 0, item.size, item.x, item.y],
            width: item.width,
            height: item.size,
          })),
        }),
        cleanup: () => {},
      }),
    }
  }

  it('joins a line, splits paragraphs on a gap, and promotes big type to a heading', async () => {
    const doc = fakeDoc([
      [
        { str: 'Big Title', x: 50, y: 700, size: 24, width: 120 },
        { str: 'One sentence of body text', x: 50, y: 640, size: 10, width: 200 },
        { str: 'that wraps onto a second line.', x: 50, y: 628, size: 10, width: 200 },
        { str: 'A separate paragraph.', x: 50, y: 560, size: 10, width: 120 },
      ],
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await extractPdfText(doc as any, { headings: true })
    expect(out.hasTextLayer).toBe(true)
    expect(out.blocks[0]).toEqual({ kind: 'h', level: 1, runs: [{ text: 'Big Title' }] })
    const paras = out.blocks.filter((b) => b.kind === 'p') as Extract<DocBlock, { kind: 'p' }>[]
    expect(paras[0].runs[0].text).toBe('One sentence of body text that wraps onto a second line.')
    expect(paras[1].runs[0].text).toBe('A separate paragraph.')
  })

  it('reports a missing text layer instead of returning an empty document', async () => {
    const out = await extractPdfText(fakeDoc([[]]) as never, {})
    expect(out.hasTextLayer).toBe(false)
    expect(out.blocks).toEqual([])
  })

  it('rebuilds a table from column-aligned lines, ignoring pdf.js space runs', async () => {
    // pdf.js fills a column gap with a wide run of spaces; the gap has to be
    // measured from the last real glyph or every row reads as one cell.
    const row = (y: number, a: string, b: string, c: string) => [
      { str: a, x: 55, y, size: 9, width: 17 },
      { str: '   ', x: 72, y, size: 9, width: 136 },
      { str: b, x: 208, y, size: 9, width: 57 },
      { str: '   ', x: 265, y, size: 9, width: 134 },
      { str: c, x: 399, y, size: 9, width: 12 },
    ]
    const doc = fakeDoc([
      [...row(463, 'Plot', 'Rainfall', 'pH'), ...row(442, 'A', '412', '6.4'), ...row(420, 'B', '388', '6.6')],
    ])
    const out = await extractPdfText(doc as never, {})
    expect(out.blocks).toEqual([
      {
        kind: 'table',
        rows: [
          ['Plot', 'Rainfall', 'pH'],
          ['A', '412', '6.4'],
          ['B', '388', '6.6'],
        ],
        header: true,
      },
    ])
  })

  it('leaves ordinary prose alone rather than seeing tables everywhere', async () => {
    const doc = fakeDoc([
      [
        { str: 'A plain sentence of running text.', x: 50, y: 700, size: 10, width: 180 },
        { str: 'A second line of the same paragraph.', x: 50, y: 688, size: 10, width: 190 },
      ],
    ])
    const out = await extractPdfText(doc as never, {})
    expect(out.blocks.every((b) => b.kind !== 'table')).toBe(true)
  })

  it('turns a leading bullet into a list item', async () => {
    const doc = fakeDoc([[{ str: '• first point', x: 50, y: 700, size: 10, width: 80 }]])
    const out = await extractPdfText(doc as never, {})
    expect(out.blocks[0]).toEqual({ kind: 'li', runs: [{ text: 'first point' }], depth: 0, marker: '•' })
  })
})

describe('pdf stamping', () => {
  async function samplePdf(pages = 3): Promise<Uint8Array> {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    for (let i = 0; i < pages; i += 1) {
      const page = doc.addPage([595, 842])
      page.drawText(`Page ${i + 1}`, { x: 60, y: 700, size: 12, font })
    }
    return doc.save()
  }

  it('formats every page-number style', () => {
    const spec = { ...DEFAULT_NUMBERS }
    expect(numberLabel({ ...spec, format: 'n' }, 3, 10)).toBe('3')
    expect(numberLabel({ ...spec, format: 'n-of-m' }, 3, 10)).toBe('3 / 10')
    expect(numberLabel({ ...spec, format: 'page-n' }, 3, 10)).toBe('Page 3')
    expect(numberLabel({ ...spec, format: 'page-n-of-m' }, 3, 10)).toBe('Page 3 of 10')
    expect(numberLabel({ ...spec, format: 'bates', prefix: 'ACME', digits: 6 }, 42, 99)).toBe('ACME000042')
  })

  it('expands header and footer tokens', () => {
    expect(expandTokens('{file} — {n}/{total}', { n: 2, total: 8, filename: 'deal.pdf' })).toBe('deal.pdf — 2/8')
  })

  it('flags glyphs the built-in fonts cannot draw', () => {
    expect(unsupportedGlyphs('DRAFT')).toEqual([])
    expect(unsupportedGlyphs('मसौदा').length).toBeGreaterThan(0)
  })

  it('stamps without changing the page count', async () => {
    const source = await samplePdf(3)
    const out = await stampPdf(source, {
      watermark: { ...DEFAULT_WATERMARK, text: 'DRAFT', tile: true },
      numbers: DEFAULT_NUMBERS,
      header: 'Confidential',
      footer: '{date}',
      margin: 28,
    })
    expect((await inspectPdf(out)).pages).toBe(3)
    expect(out.length).toBeGreaterThan(source.length)
  })

  it('refuses a watermark it cannot draw rather than writing a broken file', async () => {
    await expect(
      stampPdf(await samplePdf(1), {
        watermark: { ...DEFAULT_WATERMARK, text: 'मसौदा' },
        margin: 28,
      }),
    ).rejects.toThrow(/cannot draw/i)
  })

  it('rotates and removes pages by range', async () => {
    const source = await samplePdf(4)
    const rotated = await rotatePages(source, '2', 1)
    expect((await inspectPdf(rotated)).pages).toBe(4)

    const trimmed = await deletePages(source, '2-3')
    expect((await inspectPdf(trimmed)).pages).toBe(2)
    await expect(deletePages(source, '1-4')).rejects.toThrow(/every page/i)
  })
})

describe('zip archive', () => {
  it('lists entries and reads them back', async () => {
    const data = new TextEncoder().encode('hello archive')
    const zip = zipStore([{ name: 'notes/readme.txt', data }])
    const index = zipIndex(zip)
    expect(index).toEqual([{ name: 'notes/readme.txt', size: data.length, compressed: data.length }])
    const back = await unzip(zip)
    expect(new TextDecoder().decode(back[0].data)).toBe('hello archive')
  })

  it('rejects bytes that are not a ZIP', () => {
    expect(() => zipIndex(new Uint8Array([1, 2, 3, 4]))).toThrow(/not a ZIP/i)
  })
})

describe('registry additions', () => {
  it('registers the document and archive tools', () => {
    const ids = tools.map((t) => t.id)
    expect(ids).toEqual(expect.arrayContaining(['office', 'pdf-text', 'stamp', 'archive']))
  })

  it('routes a dropped Word file and a dropped archive to their tools', () => {
    expect(suggestPath([new File([''], 'brief.docx')])).toBe('/office')
    expect(suggestPath([new File([''], 'deck.pptx')])).toBe('/office')
    expect(suggestPath([new File([''], 'bundle.zip')])).toBe('/archive')
    // Formats that already had a home keep it.
    expect(suggestPath([new File([''], 'scan.pdf', { type: 'application/pdf' })])).toBe('/pdf')
  })

  it('finds them by the words people actually search for', () => {
    expect(searchTools('word to pdf').some((t) => t.id === 'office')).toBe(true)
    expect(searchTools('docx').some((t) => t.id === 'office')).toBe(true)
    expect(searchTools('pdf to word').some((t) => t.id === 'pdf-text')).toBe(true)
    expect(searchTools('watermark').some((t) => t.id === 'stamp')).toBe(true)
    expect(searchTools('bates').some((t) => t.id === 'stamp')).toBe(true)
    expect(searchTools('unzip').some((t) => t.id === 'archive')).toBe(true)
  })
})
