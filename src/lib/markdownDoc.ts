/**
 * Markdown → a finished document: page breaks, embedded images, a linked
 * table of contents, an optional title block, and the CSS that makes the
 * browser's print dialog produce proper pages with numbers.
 */
import { renderMarkdown } from './markdown'
import { docThemeCss, type DocThemeId, type Paper } from './docThemes'

/** Lines that force a new page: \pagebreak, \newpage, <!-- pagebreak -->. */
const PAGE_BREAK = /^[ \t]*(?:\\pagebreak|\\newpage|<!--\s*page-?break\s*-->)[ \t]*$/gim

export type TocEntry = { level: number; id: string; text: string }

export type DocOptions = {
  toc: boolean
  titleBlock: boolean
  title?: string
  subtitle?: string
  /** Images dropped into the editor, by the name used in the Markdown. */
  images?: Record<string, string>
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export function tocFromHtml(html: string, maxLevel = 3): TocEntry[] {
  const out: TocEntry[] = []
  for (const m of html.matchAll(/<h([1-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)) {
    const level = Number(m[1])
    if (level <= maxLevel) out.push({ level, id: m[2], text: stripTags(m[3]) })
  }
  return out
}

/** Swaps image references that name a dropped file for its data: URL. */
function resolveImages(html: string, images: Record<string, string>): string {
  if (!Object.keys(images).length) return html
  return html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g, (whole, open: string, src: string, close: string) => {
    let key = src
    try {
      key = decodeURIComponent(src)
    } catch {
      /* keep as written */
    }
    const data = images[key] ?? images[key.replace(/^\.\//, '')]
    return data ? `${open}${data}${close}` : whole
  })
}

export function buildDocument(source: string, options: DocOptions): { html: string; toc: TocEntry[]; title: string } {
  const prepared = source.replace(PAGE_BREAK, '\n<div class="page-break"></div>\n')
  let html = resolveImages(renderMarkdown(prepared), options.images ?? {})
  const toc = tocFromHtml(html)
  const firstHeading = /<h1 id="[^"]+">([\s\S]*?)<\/h1>/.exec(html)
  const title = options.title?.trim() || (firstHeading ? stripTags(firstHeading[1]) : 'Document')

  let front = ''
  if (options.titleBlock) {
    // The title block replaces a leading H1 that says the same thing.
    if (firstHeading && stripTags(firstHeading[1]) === title && html.trimStart().startsWith('<h1')) {
      html = html.replace(firstHeading[0], '')
    }
    const subtitle = options.subtitle?.trim()
    front += `<header class="doc-title-block"><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</header>`
  }
  if (options.toc && toc.length > 1) {
    const entries = toc.filter((entry) => !(options.titleBlock && entry.level === 1 && entry.text === title))
    const items = entries
      .map(
        (entry) =>
          `<li style="margin-left:${(entry.level - 1) * 1.1}em"><a href="#${entry.id}">${escapeHtml(entry.text)}</a></li>`,
      )
      .join('')
    if (items) front += `<nav class="doc-toc"><h2>Contents</h2><ol>${items}</ol></nav>`
  }
  return { html: front + html, toc, title }
}

export type PrintSetup = {
  paper: Paper
  marginMm: number
  header?: string
  footer?: string
  pageNumbers: boolean
}

function cssString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
}

/**
 * @page rules for the print dialog. Margin boxes put the header, footer, and
 * "Page 3 of 9" on every page in browsers that support them (Chromium 131+);
 * elsewhere the pages still print, just without those extras.
 */
export function printPageCss(setup: PrintSetup): string {
  const size = setup.paper === 'letter' ? 'letter' : setup.paper === 'legal' ? 'legal' : 'A4'
  const boxes = [
    setup.header
      ? `@top-left { content: ${cssString(setup.header)}; font: 9pt system-ui, sans-serif; color: #6b7280; }`
      : '',
    setup.footer
      ? `@bottom-left { content: ${cssString(setup.footer)}; font: 9pt system-ui, sans-serif; color: #6b7280; }`
      : '',
    setup.pageNumbers
      ? `@bottom-right { content: "Page " counter(page) " of " counter(pages); font: 9pt system-ui, sans-serif; color: #6b7280; }`
      : '',
  ].join(' ')
  return `@page { size: ${size}; margin: ${setup.marginMm}mm; ${boxes} }`
}

/** A self-contained HTML file: open it anywhere, or print it to PDF later. */
export function standaloneHtml(title: string, bodyHtml: string, theme: DocThemeId, setup: PrintSetup): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body { margin: 0; background: #f3f4f6; }
.doc-page { max-width: 820px; margin: 2rem auto; padding: 3rem; box-shadow: 0 1px 3px rgba(0,0,0,.1), 0 10px 30px -12px rgba(0,0,0,.25); }
${docThemeCss(theme)}
@media print {
  body { background: #fff; }
  .doc-page { max-width: none; margin: 0; padding: 0; box-shadow: none; }
  ${printPageCss(setup)}
}
</style>
</head>
<body>
<article class="doc-page">
${bodyHtml}
</article>
</body>
</html>
`
}

export function wordStats(source: string): { words: number; minutes: number } {
  const text = source.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~[\]()!|-]/g, ' ')
  const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  return { words, minutes: Math.max(1, Math.round(words / 230)) }
}
