/**
 * Renders a document file into page images.
 *
 * Word files go through docx-preview, which reproduces fonts, colours,
 * tables, images, headers, and footers, and breaks pages where Word last
 * did when the file carries those markers. Everything else — Markdown,
 * HTML, text, spreadsheets, slide outlines — is laid out on a themed page.
 * In both cases content that overflows a page is cut on blank rows into
 * further pages rather than being squashed or clipped.
 */
import { blocksToHtml } from './docBlocks'
import { detectSource, fileToBlocks, rtfToText, type SourceKind } from './office'
import { renderMarkdown, sanitizeHtml } from './markdown'
import { docThemeCss, mmToPx, PAPER_PX, type DocThemeId, type Paper } from './docThemes'
import { rasterizeHtml, slicePages, stripExternalImages } from './domRaster'

export type DocKind = SourceKind | 'doc'

export type RenderOptions = {
  /** Pixels per CSS pixel: 1 is 96 DPI, 2 is 192 DPI. */
  scale: number
  /** Page setup for formats that have none of their own. */
  paper: Paper
  marginMm: number
  theme: DocThemeId
  onProgress?: (done: number, total: number) => void
}

export type RenderedDocument = {
  kind: DocKind
  pages: HTMLCanvasElement[]
  /** Page size in CSS pixels, for PDF export. */
  pageWidth: number
  pageHeight: number
}

export function detectDocKind(file: File): DocKind | null {
  if (/\.doc$/i.test(file.name) || file.type === 'application/msword') return 'doc'
  return detectSource(file)
}

const BACKGROUND = '#ffffff'

/**
 * Word draws bullets from the Symbol and Wingdings fonts at private-use code
 * points (U+F0B7 is Word's round bullet). Browsers have neither font, so the
 * bullets vanish; this maps the common ones to real Unicode characters and
 * drops the font request.
 */
const SYMBOL_BULLETS: Record<string, string> = {
  '\uf0b7': '•',
  '\uf0a7': '▪',
  '\uf0a8': '□',
  '\uf06e': '■',
  '\uf076': '❖',
  '\uf0d8': '➢',
  '\uf0e0': '→',
  '\uf0fc': '✓',
  '\uf0f0': '⇒',
}

export function normalizeDocxCss(css: string): string {
  return css
    .replace(/[\uf000-\uf0ff]/g, (ch) => SYMBOL_BULLETS[ch] ?? '•')
    .replace(/font-family:\s*["']?(?:Symbol|Wingdings[^;"']*)["']?\s*;?/gi, '')
}

/** An off-screen but laid-out host, so elements have real sizes to measure. */
function createHost(width?: number): HTMLDivElement {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-100000px;top:0;pointer-events:none;contain:layout style;${width ? `width:${width}px;` : ''}`
  document.body.appendChild(host)
  return host
}

async function rasterizeSection(
  section: HTMLElement,
  css: string,
  wrapperClass: string,
  scale: number,
): Promise<HTMLCanvasElement[]> {
  const style = getComputedStyle(section)
  const width = Math.ceil(section.offsetWidth)
  const pageHeight = Math.ceil(parseFloat(style.minHeight) || section.offsetHeight)
  const height = Math.max(pageHeight, Math.ceil(section.scrollHeight))
  const padTop = parseFloat(style.paddingTop) || 0
  const padBottom = parseFloat(style.paddingBottom) || 0

  // Serialise a wrapper so the section's own selectors (".docx-wrapper > section") still match.
  const wrapper = document.createElement('div')
  wrapper.className = wrapperClass
  wrapper.setAttribute('style', 'padding:0;margin:0;background:transparent;display:block')
  const clone = section.cloneNode(true) as HTMLElement
  clone.style.margin = '0'
  clone.style.boxShadow = 'none'
  wrapper.appendChild(clone)

  const tall = await rasterizeHtml(wrapper, { css, width, height, scale, background: BACKGROUND })
  return slicePages(tall, {
    pageHeight: Math.round(pageHeight * scale),
    marginTop: Math.round(padTop * scale),
    marginBottom: Math.round(padBottom * scale),
    background: BACKGROUND,
  })
}

async function renderDocx(file: File, options: RenderOptions): Promise<RenderedDocument> {
  const { renderAsync } = await import('docx-preview')
  const host = createHost()
  const styles = document.createElement('div')
  host.appendChild(styles)
  const body = document.createElement('div')
  host.appendChild(body)
  try {
    await renderAsync(await file.arrayBuffer(), body, styles, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      renderChanges: false,
      renderComments: false,
    })
    // Fix bullets in the live styles too, so layout and raster agree.
    for (const style of host.querySelectorAll('style')) style.textContent = normalizeDocxCss(style.textContent ?? '')
    const css = [...host.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n')
    const sections = [...body.querySelectorAll<HTMLElement>('section.docx')]
    if (!sections.length) throw new Error('No pages found in this Word file.')
    const pages: HTMLCanvasElement[] = []
    for (let i = 0; i < sections.length; i += 1) {
      stripExternalImages(sections[i])
      pages.push(...(await rasterizeSection(sections[i], css, 'docx-wrapper', options.scale)))
      options.onProgress?.(i + 1, sections.length)
    }
    const first = sections[0]
    const firstStyle = getComputedStyle(first)
    return {
      kind: 'docx',
      pages,
      pageWidth: first.offsetWidth,
      pageHeight: parseFloat(firstStyle.minHeight) || first.offsetHeight,
    }
  } finally {
    host.remove()
  }
}

/** HTML for a non-Word source, ready to be laid out on themed pages. */
async function htmlFor(file: File, kind: SourceKind): Promise<string> {
  if (kind === 'markdown') return renderMarkdown(await file.text())
  if (kind === 'html') return sanitizeHtml(await file.text())
  if (kind === 'text') {
    const escaped = (await file.text()).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<pre style="white-space:pre-wrap;background:none;border:0;padding:0;font-size:0.95em">${escaped}</pre>`
  }
  if (kind === 'rtf') {
    return rtfToText(await file.text())
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`)
      .join('')
  }
  const { blocks } = await fileToBlocks(file)
  return blocksToHtml(blocks)
}

/**
 * Lays out HTML on themed pages and returns page images. Shared by Word to
 * image (non-Word inputs) and Markdown to PDF's exact-look export.
 */
export async function renderHtmlPages(html: string, options: RenderOptions): Promise<RenderedDocument> {
  const paper = PAPER_PX[options.paper]
  const margin = Math.round(mmToPx(options.marginMm))
  const css = docThemeCss(options.theme)
  const host = createHost(paper.width)
  const style = document.createElement('style')
  style.textContent = css
  host.appendChild(style)
  const page = document.createElement('article')
  page.className = 'doc-page'
  page.setAttribute('style', `width:${paper.width}px;min-height:${paper.height}px;padding:${margin}px`)
  page.innerHTML = html
  stripExternalImages(page)
  host.appendChild(page)
  try {
    // Explicit page breaks split the document first; each part then flows onto as many pages as it needs.
    const parts = splitOnBreaks(page)
    const pages: HTMLCanvasElement[] = []
    for (let i = 0; i < parts.length; i += 1) {
      pages.push(...(await rasterizeSection(parts[i], css, 'doc-host', options.scale)))
      options.onProgress?.(i + 1, parts.length)
    }
    return { kind: 'html', pages, pageWidth: paper.width, pageHeight: paper.height }
  } finally {
    host.remove()
  }
}

/** Splits a laid-out page at `.page-break` markers into sibling page elements. */
function splitOnBreaks(page: HTMLElement): HTMLElement[] {
  const breaks = page.querySelectorAll(':scope > .page-break, :scope > hr.page-break')
  if (!breaks.length) return [page]
  const parts: HTMLElement[] = []
  let current = page.cloneNode(false) as HTMLElement
  for (const child of [...page.childNodes]) {
    if (child instanceof HTMLElement && child.classList.contains('page-break')) {
      parts.push(current)
      current = page.cloneNode(false) as HTMLElement
      continue
    }
    current.appendChild(child)
  }
  parts.push(current)
  page.replaceWith(...parts)
  return parts.filter((part) => part.childNodes.length)
}

export async function renderDocument(file: File, options: RenderOptions): Promise<RenderedDocument> {
  const kind = detectDocKind(file)
  if (kind === 'doc') {
    throw new Error(
      'Old .doc files use a binary format browsers cannot read. Open it in Word, LibreOffice, or Google Docs and save as .docx, then drop that.',
    )
  }
  if (!kind)
    throw new Error(`BitKit cannot read “${file.name}”. Try a .docx, .md, .html, .txt, .rtf, .csv, .xlsx, or .pptx.`)
  if (kind === 'docx') return renderDocx(file, options)
  const html = await htmlFor(file, kind)
  if (!html.trim()) throw new Error(`No readable content in “${file.name}”.`)
  const rendered = await renderHtmlPages(html, options)
  return { ...rendered, kind }
}

/**
 * Page images into a PDF at the document's own page size. The PDF looks
 * exactly like the preview; the trade-off, stated in the UI, is that its
 * text is part of the image and cannot be selected or searched.
 */
export async function pagesToPdf(
  pages: HTMLCanvasElement[],
  pageWidthPx: number,
  pageHeightPx: number,
  options: { title?: string; quality?: number } = {},
): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')
  const { canvasToBlob } = await import('./domRaster')
  const pdf = await PDFDocument.create()
  if (options.title) pdf.setTitle(options.title)
  pdf.setCreator('BitKit')
  const width = pageWidthPx * 0.75
  const height = pageHeightPx * 0.75
  for (const page of pages) {
    const blob = await canvasToBlob(page, 'image/jpeg', options.quality ?? 0.92)
    const image = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()))
    // Every page keeps the document's size even if a slice came out shorter.
    const imageHeight = (page.height / page.width) * width
    const pageHeight = Math.max(height, imageHeight)
    // PDF y runs upward, so top-align the image on the page.
    pdf.addPage([width, pageHeight]).drawImage(image, { x: 0, y: pageHeight - imageHeight, width, height: imageHeight })
  }
  return pdf.save()
}
