/**
 * Writes public/sitemap.xml from the tool registry, so adding a tool cannot
 * leave the sitemap stale.
 *
 * Override the host with SITE_URL, e.g.
 *   SITE_URL=https://bitkit.example npm run sitemap
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const SITE = (process.env.SITE_URL ?? 'https://bitkit.pages.dev').replace(/\/$/, '')

const registry = readFileSync(resolve(ROOT, 'src/registry.ts'), 'utf8')
// The registry is the single source of truth; a regex avoids needing a TS
// build step just to list routes.
const paths = [...registry.matchAll(/^\s{4}path: '([^']+)',$/gm)].map((m) => m[1])

if (!paths.length) {
  throw new Error('No tool paths found in src/registry.ts — has its shape changed?')
}

const routes = ['/', '/privacy', ...paths]
const today = new Date().toISOString().slice(0, 10)

const body = routes
  .map(
    (route) =>
      `  <url>\n    <loc>${SITE}${route}</loc>\n    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n  </url>`,
  )
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

writeFileSync(resolve(ROOT, 'public/sitemap.xml'), xml)
writeFileSync(
  resolve(ROOT, 'public/robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
)
console.log(`wrote public/sitemap.xml (${routes.length} routes) and robots.txt for ${SITE}`)
