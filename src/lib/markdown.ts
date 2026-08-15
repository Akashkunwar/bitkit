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

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string
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
