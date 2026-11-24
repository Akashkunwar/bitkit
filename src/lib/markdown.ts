import DOMPurify from 'dompurify'
import { marked } from 'marked'
import type { Config } from 'dompurify'

marked.setOptions({
  gfm: true,
  breaks: false,
})

const purifyConfig: Config = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    'script',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'button',
    'video',
    'audio',
    'source',
    'track',
    'link',
    'meta',
    'base',
  ],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  ALLOW_DATA_ATTR: false,
}

/** A URL the browser would request from another host. Relative names and data: URLs stay. */
function isRemoteUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false
  if (trimmed.startsWith('//')) return true
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
}

/** Drop URLs that would fetch a remote resource. Clicked links and local filenames stay. */
function dropRemoteResources(html: string): string {
  if (typeof document === 'undefined') return html
  const root = document.createElement('div')
  root.innerHTML = html
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    for (const attr of ['src', 'srcset', 'poster']) {
      const value = el.getAttribute(attr)
      if (value == null) continue
      if (attr === 'srcset') {
        const remote = value.split(',').some((part) => isRemoteUrl(part.trim().split(/\s+/)[0] ?? ''))
        if (remote) el.removeAttribute(attr)
        continue
      }
      if (isRemoteUrl(value)) el.removeAttribute(attr)
    }
    const style = el.getAttribute('style')
    if (style && /url\s*\([^)]+\)/i.test(style)) {
      const urls = style.match(/url\s*\(\s*['"]?[^'")]+/gi) ?? []
      const remote = urls.some((raw) => isRemoteUrl(raw.replace(/^url\s*\(\s*['"]?/i, '')))
      if (remote) el.removeAttribute('style')
    }
  }
  return root.innerHTML
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
  return dropRemoteResources(DOMPurify.sanitize(headingIds(taskBoxes(html)), purifyConfig))
}

/** Sanitises HTML that came from a file on disk before it touches the DOM. */
export function sanitizeHtml(html: string): string {
  return dropRemoteResources(DOMPurify.sanitize(html, purifyConfig))
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
