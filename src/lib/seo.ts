export const SERP_TITLE_PX = 600
export const SERP_DESC_PX = 920

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function lines(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function robotsTxt(options: { userAgent: string; allow: string; disallow: string; sitemap: string }): string {
  const agent = options.userAgent.trim() || '*'
  const allow = lines(options.allow).map((path) => `Allow: ${path}`)
  const disallow = lines(options.disallow).map((path) => `Disallow: ${path}`)
  const sitemap = options.sitemap.trim() ? [`Sitemap: ${options.sitemap.trim()}`] : []
  return [`User-agent: ${agent}`, ...allow, ...disallow, ...sitemap].join('\n') + '\n'
}

export function canonicalTag(url: string): string {
  const href = url.trim()
  if (!href) throw new Error('The canonical URL is empty.')
  return `<link rel="canonical" href="${escapeAttr(href)}">`
}

export function sitemapXml(input: string): string {
  const urls = lines(input)
  if (!urls.length) throw new Error('Paste one URL per line.')
  const body = urls.map((url) => `  <url><loc>${escapeAttr(url)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

export type SchemaInput =
  | { kind: 'faq'; questions: { q: string; a: string }[] }
  | { kind: 'howto'; name: string; steps: string[] }
  | { kind: 'article'; headline: string; author: string; date: string }

export function jsonLd(input: SchemaInput): string {
  if (input.kind === 'faq') {
    const questions = input.questions.filter((item) => item.q.trim() && item.a.trim())
    if (!questions.length) throw new Error('Add a question and an answer.')
    return JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: questions.map((item) => ({
          '@type': 'Question',
          name: item.q.trim(),
          acceptedAnswer: { '@type': 'Answer', text: item.a.trim() },
        })),
      },
      null,
      2,
    )
  }
  if (input.kind === 'howto') {
    const steps = input.steps.map((step) => step.trim()).filter(Boolean)
    if (!input.name.trim() || !steps.length) throw new Error('The how-to needs a name and one step.')
    return JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: input.name.trim(),
        step: steps.map((text, index) => ({ '@type': 'HowToStep', position: index + 1, text })),
      },
      null,
      2,
    )
  }
  if (!input.headline.trim()) throw new Error('The article needs a headline.')
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: input.headline.trim(),
      ...(input.author.trim() ? { author: { '@type': 'Person', name: input.author.trim() } } : {}),
      ...(input.date.trim() ? { datePublished: input.date.trim() } : {}),
    },
    null,
    2,
  )
}

export function serpFit(px: number, limit: number): 'fits' | 'wide' {
  return px <= limit ? 'fits' : 'wide'
}
