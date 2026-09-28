/**
 * Stylesheets for rendered documents: Markdown previews, printed pages, and
 * the page images Word to image produces.
 *
 * Everything is scoped under `.doc-page` so a theme can sit inside the app
 * without leaking. Fonts are system stacks on purpose: a web font does not
 * load inside an SVG image, and print should not wait on a download.
 */

export type DocThemeId = 'github' | 'modern' | 'academic' | 'minimal'

export const DOC_THEMES: { id: DocThemeId; label: string; hint: string }[] = [
  { id: 'github', label: 'GitHub', hint: 'Familiar README styling.' },
  { id: 'modern', label: 'Modern', hint: 'Clean sans with an accent colour.' },
  { id: 'academic', label: 'Academic', hint: 'Serif body, justified, for papers.' },
  { id: 'minimal', label: 'Minimal', hint: 'Quiet and compact.' },
]

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'`
const SERIF = `'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', 'Noto Serif', serif`
const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`

/** Rules every theme shares: sizing, tables, code, images, page breaks. */
const BASE = `
.doc-page { box-sizing: border-box; color: #1f2328; background: #fff; font-size: 11pt; line-height: 1.6;
  -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-wrap: break-word; }
.doc-page *, .doc-page *::before, .doc-page *::after { box-sizing: border-box; }
.doc-page > :first-child { margin-top: 0 !important; }
.doc-page p, .doc-page ul, .doc-page ol, .doc-page blockquote, .doc-page pre, .doc-page table, .doc-page dl, .doc-page figure { margin: 0 0 0.9em; }
.doc-page h1, .doc-page h2, .doc-page h3, .doc-page h4, .doc-page h5, .doc-page h6 { line-height: 1.25; margin: 1.4em 0 0.55em; font-weight: 650; break-after: avoid; page-break-after: avoid; }
.doc-page h1 { font-size: 2em; }
.doc-page h2 { font-size: 1.5em; }
.doc-page h3 { font-size: 1.25em; }
.doc-page h4 { font-size: 1.05em; }
.doc-page h5, .doc-page h6 { font-size: 0.95em; }
.doc-page a { color: var(--doc-accent); text-decoration: underline; text-underline-offset: 2px; }
.doc-page strong { font-weight: 650; }
.doc-page del { opacity: 0.7; }
.doc-page ul, .doc-page ol { padding-left: 1.6em; }
.doc-page li { margin: 0.2em 0; }
.doc-page li > p { margin: 0.2em 0; }
.doc-page li > ul, .doc-page li > ol { margin: 0.2em 0; }
.doc-page li:has(> .task-box) { list-style: none; margin-left: -1.3em; }
.doc-page .task-box { display: inline-block; width: 1.2em; margin-right: 0.15em; color: #8c959f; }
.doc-page .task-box.is-done { color: var(--doc-accent); }
.doc-page [align="center"] { text-align: center; }
.doc-page [align="right"] { text-align: right; }
.doc-page code, .doc-page kbd, .doc-page samp { font-family: ${MONO}; font-size: 0.86em; }
.doc-page :not(pre) > code { padding: 0.15em 0.4em; border-radius: 5px; background: rgba(129, 139, 152, 0.14); }
.doc-page kbd { padding: 0.1em 0.4em; border: 1px solid #d0d7de; border-bottom-width: 2px; border-radius: 5px; background: #f6f8fa; }
.doc-page pre { padding: 0.9em 1.1em; border-radius: 8px; background: #f6f8fa; border: 1px solid #e6e8eb; overflow: hidden; white-space: pre-wrap; line-height: 1.5; font-size: 0.9em; break-inside: avoid; page-break-inside: avoid; }
.doc-page pre code { padding: 0; background: none; font-size: inherit; }
.doc-page blockquote { padding: 0.1em 1em; color: #59636e; border-left: 4px solid var(--doc-rule); }
.doc-page blockquote > :last-child { margin-bottom: 0; }
.doc-page hr { height: 2px; border: 0; margin: 1.6em 0; background: #e6e8eb; }
.doc-page table { border-collapse: collapse; width: 100%; font-size: 0.94em; break-inside: auto; }
.doc-page tr { break-inside: avoid; page-break-inside: avoid; }
.doc-page th, .doc-page td { padding: 0.45em 0.75em; border: 1px solid #d1d9e0; text-align: left; vertical-align: top; }
.doc-page th { font-weight: 650; background: #f6f8fa; }
.doc-page tbody tr:nth-child(even) td { background: #fafbfc; }
.doc-page img { max-width: 100%; height: auto; border-radius: 4px; break-inside: avoid; }
.doc-page figure figcaption { font-size: 0.85em; color: #59636e; text-align: center; margin-top: 0.4em; }
.doc-page .page-break, .doc-page hr.page-break { break-after: page; page-break-after: always; height: 0; margin: 0; border: 0; background: none; }
.doc-page .doc-toc { margin: 0 0 1.6em; padding: 1em 1.2em; border: 1px solid #e6e8eb; border-radius: 8px; background: #fafbfc; }
.doc-page .doc-toc h2 { margin: 0 0 0.5em; font-size: 1em; text-transform: uppercase; letter-spacing: 0.06em; color: #59636e; }
.doc-page .doc-toc ol { margin: 0; padding-left: 1.2em; }
.doc-page .doc-toc li { margin: 0.15em 0; }
.doc-page .doc-toc a { color: inherit; text-decoration: none; }
.doc-page .doc-title-block { margin: 0 0 2em; padding-bottom: 1.2em; border-bottom: 2px solid var(--doc-accent); }
.doc-page .doc-title-block h1 { margin: 0 0 0.3em; border: 0; padding: 0; }
.doc-page .doc-title-block p { margin: 0; color: #59636e; }
`

const THEMES: Record<DocThemeId, string> = {
  github: `
.doc-page { --doc-accent: #0969da; --doc-rule: #d1d9e0; font-family: ${SANS}; }
.doc-page h1, .doc-page h2 { padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
`,
  modern: `
.doc-page { --doc-accent: #5b53e8; --doc-rule: #c7c4fb; font-family: ${SANS}; color: #111827; line-height: 1.65; }
.doc-page h1 { font-size: 2.2em; font-weight: 750; letter-spacing: -0.02em; color: #0f1222; }
.doc-page h2 { font-size: 1.45em; font-weight: 700; letter-spacing: -0.01em; color: #312e81; }
.doc-page h2::before { content: ''; display: block; width: 2.2em; height: 3px; margin-bottom: 0.45em; border-radius: 3px; background: var(--doc-accent); }
.doc-page h3 { color: #3730a3; }
.doc-page blockquote { color: #374151; background: #f5f5ff; border-left-color: var(--doc-accent); border-radius: 0 8px 8px 0; padding: 0.6em 1em; }
.doc-page th { background: #eef0ff; color: #312e81; }
.doc-page pre { background: #0f172a; color: #e2e8f0; border-color: #0f172a; }
.doc-page :not(pre) > code { background: #eef0ff; color: #3730a3; }
`,
  academic: `
.doc-page { --doc-accent: #7c2d12; --doc-rule: #d6d3d1; font-family: ${SERIF}; font-size: 11.5pt; line-height: 1.55; color: #1c1917; text-align: justify; hyphens: auto; }
.doc-page h1, .doc-page h2, .doc-page h3, .doc-page h4 { font-family: ${SERIF}; text-align: left; font-weight: 700; }
.doc-page h1 { text-align: center; font-size: 1.9em; }
.doc-page h2 { font-size: 1.3em; font-variant: small-caps; letter-spacing: 0.02em; }
.doc-page h3 { font-size: 1.1em; font-style: italic; font-weight: 600; }
.doc-page blockquote { font-style: italic; border-left-width: 2px; }
.doc-page th, .doc-page td { border: 0; border-bottom: 1px solid #d6d3d1; }
.doc-page thead th { border-top: 2px solid #1c1917; border-bottom: 1px solid #1c1917; background: none; }
.doc-page tbody tr:last-child td { border-bottom: 2px solid #1c1917; }
.doc-page tbody tr:nth-child(even) td { background: none; }
.doc-page pre { font-size: 0.85em; }
`,
  minimal: `
.doc-page { --doc-accent: #111827; --doc-rule: #e5e7eb; font-family: ${SANS}; font-size: 10.5pt; line-height: 1.55; color: #111827; }
.doc-page h1 { font-size: 1.7em; font-weight: 700; }
.doc-page h2 { font-size: 1.25em; font-weight: 650; }
.doc-page h3 { font-size: 1.05em; }
.doc-page th, .doc-page td { border: 0; border-bottom: 1px solid #e5e7eb; }
.doc-page th { background: none; }
.doc-page tbody tr:nth-child(even) td { background: none; }
.doc-page pre { background: #f9fafb; }
`,
}

export function docThemeCss(theme: DocThemeId): string {
  return BASE + THEMES[theme]
}

/** Paper sizes in CSS pixels (96 per inch), portrait. */
export const PAPER_PX = {
  a4: { width: 794, height: 1123 },
  letter: { width: 816, height: 1056 },
  legal: { width: 816, height: 1344 },
} as const

export type Paper = keyof typeof PAPER_PX

/** Millimetres to CSS pixels. */
export function mmToPx(mm: number): number {
  return (mm / 25.4) * 96
}
