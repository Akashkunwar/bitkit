import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compressImage } from '../lib/image/compress'
import { upsertNote } from '../lib/db'
import { renderMarkdown } from '../lib/markdown'
import { markdownHtmlToPdf } from '../lib/pdf'

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path)
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : []
  })
}

describe('privacy: processors do not upload', () => {
  it('core modules never call fetch or XMLHttpRequest', () => {
    const files = [
      join(srcRoot, 'lib/image/compress.ts'),
      join(srcRoot, 'lib/db.ts'),
      join(srcRoot, 'lib/markdown.ts'),
      join(srcRoot, 'lib/pdf.ts'),
      join(srcRoot, 'lib/clipboard.ts'),
      join(srcRoot, 'lib/download.ts'),
    ]
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/\bfetch\s*\(/)
      expect(text, file).not.toMatch(/XMLHttpRequest/)
      expect(text, file).not.toMatch(/navigator\.sendBeacon/)
    }
  })

  it('source tree does not include analytics SDKs', () => {
    const hits = walk(srcRoot).filter((file) => {
      if (file.includes('/test/')) return false
      const text = readFileSync(file, 'utf8')
      return /gtag\(|analytics\.js|plausible\(|posthog/i.test(text)
    })
    expect(hits).toEqual([])
  })

  it('exposes processor functions that operate on local blobs', () => {
    expect(typeof compressImage).toBe('function')
    expect(typeof upsertNote).toBe('function')
    expect(typeof renderMarkdown).toBe('function')
    expect(typeof markdownHtmlToPdf).toBe('function')
  })
})
