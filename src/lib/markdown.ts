import DOMPurify from 'dompurify'
import { marked } from 'marked'
import type { Config } from 'dompurify'

marked.setOptions({
  gfm: true,
  breaks: false,
})

const purifyConfig: Config = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  ALLOW_DATA_ATTR: false,
}

/**
 * GFM task items arrive as <input type="checkbox">, which the sanitiser
 * rightly forbids. They are drawn as glyphs instead, so "- [x] done" keeps
 * its tick in the preview, in print, and in exported pages.
 */
function taskBoxes(html: string): string {
  return html.replace(/<input\b[^>]*type="checkbox"[^>]*>/gi, (tag) =>
    /\bchecked\b/i.test(tag)
      ? '<span class="task-box is-done" role="img" aria-label="Done">☑</span>'
      : '<span class="task-box" role="img" aria-label="Not done">☐</span>',
  )
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z]+;|&#\d+;/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'
  )
}

/** Stable, unique ids on headings so a table of contents can link to them. */
function headingIds(html: string): string {
  const seen = new Map<string, number>()
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_m, level: string, inner: string) => {
    const base = `h-${slugify(inner)}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return `<h${level} id="${count ? `${base}-${count}` : base}">${inner}</h${level}>`
  })
}

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string
  return DOMPurify.sanitize(headingIds(taskBoxes(html)), purifyConfig)
}

/** Sanitises HTML that came from a file on disk before it touches the DOM. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, purifyConfig)
}

export function extractTitle(source: string): string {
  const heading = source.match(/^#\s+(.+)$/m)
  if (heading) return heading[1].trim()
  const line = source.split('\n').find((row) => row.trim())
  return (line ?? 'Untitled').slice(0, 80)
}

export function tocFromMarkdown(source: string): { level: number; text: string }[] {
  return source
    .split('\n')
    .map((line) => line.match(/^(#{1,3})\s+(.+)/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ level: m[1].length, text: m[2].trim() }))
}
