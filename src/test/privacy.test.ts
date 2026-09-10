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

const NETWORK_ALLOWLIST = new Set([
  join(srcRoot, 'lib/ocr.ts'),
  join(srcRoot, 'lib/cutout.ts'),
])

describe('privacy: processors do not upload', () => {
  it('lib modules never call fetch or XMLHttpRequest except allowlisted engines', () => {
    const files = walk(join(srcRoot, 'lib')).filter((file) => !NETWORK_ALLOWLIST.has(file))
    expect(files.length).toBeGreaterThan(20)
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/\bfetch\s*\(/)
      expect(text, file).not.toMatch(/XMLHttpRequest/)
      expect(text, file).not.toMatch(/navigator\.sendBeacon/)
    }
  })

  it('allowlisted engines fetch models, not user files', () => {
    for (const file of NETWORK_ALLOWLIST) {
      const text = readFileSync(file, 'utf8')
      expect(text).toMatch(/cdn\.jsdelivr\.net|storage\.googleapis\.com|tessdata/)
      expect(text).not.toMatch(/fetch\s*\(\s*file/)
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
