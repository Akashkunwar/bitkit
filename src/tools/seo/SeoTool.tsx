import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useCopied } from '../../lib/useCopied'
import { SERP_DESC_PX, SERP_TITLE_PX, canonicalTag, jsonLd, robotsTxt, serpFit, sitemapXml } from '../../lib/seo'

type Mode = 'robots' | 'canonical' | 'sitemap' | 'schema' | 'serp'
type SchemaKind = 'faq' | 'howto' | 'article'

function measure(text: string, size: number): number {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return text.length * size * 0.5
  ctx.font = `${size}px Arial, sans-serif`
  return ctx.measureText(text).width
}

export default function SeoTool() {
  const [mode, setMode] = useState<Mode>('robots')
  const [agent, setAgent] = useState('*')
  const [allow, setAllow] = useState('/')
  const [disallow, setDisallow] = useState('/admin')
  const [sitemap, setSitemap] = useState('')
  const [canonical, setCanonical] = useState('https://example.com/page')
  const [urls, setUrls] = useState('https://example.com/\nhttps://example.com/about')
  const [schema, setSchema] = useState<SchemaKind>('faq')
  const [question, setQuestion] = useState('Where does this run?')
  const [answer, setAnswer] = useState('In the browser. Nothing is uploaded.')
  const [name, setName] = useState('How to export')
  const [steps, setSteps] = useState('Open the tool\nFill the form\nCopy the result')
  const [headline, setHeadline] = useState('A local tool')
  const [author, setAuthor] = useState('')
  const [date, setDate] = useState('')
  const [title, setTitle] = useState('A title that fits a search result')
  const [description, setDescription] = useState('A short description under the title.')
  const { copied, copy } = useCopied()

  const output = useMemo(() => {
    try {
      if (mode === 'robots') return { text: robotsTxt({ userAgent: agent, allow, disallow, sitemap }), error: null }
      if (mode === 'canonical') return { text: canonicalTag(canonical), error: null }
      if (mode === 'sitemap') return { text: sitemapXml(urls), error: null }
      if (mode === 'schema') {
        const text =
          schema === 'faq'
            ? jsonLd({ kind: 'faq', questions: [{ q: question, a: answer }] })
            : schema === 'howto'
              ? jsonLd({ kind: 'howto', name, steps: steps.split('\n') })
              : jsonLd({ kind: 'article', headline, author, date })
        return { text, error: null }
      }
      return { text: '', error: null }
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : 'Could not build that.' }
    }
  }, [
    mode,
    agent,
    allow,
    disallow,
    sitemap,
    canonical,
    urls,
    schema,
    question,
    answer,
    name,
    steps,
    headline,
    author,
    date,
  ])

  const titlePx = measure(title, 20)
  const descPx = measure(description, 14)

  return (
    <ToolLayout
      title="SEO tags"
      lede="robots.txt, a canonical tag, a sitemap from a pasted list, JSON-LD, and a search-result width check. Nothing is fetched."
    >
      <Segmented
        label="Tag"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'robots', label: 'robots.txt' },
          { value: 'canonical', label: 'Canonical' },
          { value: 'sitemap', label: 'Sitemap' },
          { value: 'schema', label: 'JSON-LD' },
          { value: 'serp', label: 'Preview' },
        ]}
      />
      {mode === 'robots' ? (
        <>
          <label className="field">
            <span>User-agent</span>
            <input className="text-input" value={agent} onChange={(e) => setAgent(e.target.value)} />
          </label>
          <label className="field">
            <span>Allow, one path per line</span>
            <textarea className="code-area" rows={3} value={allow} onChange={(e) => setAllow(e.target.value)} />
          </label>
          <label className="field">
            <span>Disallow, one path per line</span>
            <textarea className="code-area" rows={3} value={disallow} onChange={(e) => setDisallow(e.target.value)} />
          </label>
          <label className="field">
            <span>Sitemap URL</span>
            <input className="text-input" value={sitemap} onChange={(e) => setSitemap(e.target.value)} />
          </label>
        </>
      ) : null}
      {mode === 'canonical' ? (
        <label className="field">
          <span>Canonical URL</span>
          <input className="text-input" value={canonical} onChange={(e) => setCanonical(e.target.value)} />
        </label>
      ) : null}
      {mode === 'sitemap' ? (
        <label className="field">
          <span>URLs, one per line</span>
          <textarea className="code-area" rows={8} value={urls} onChange={(e) => setUrls(e.target.value)} />
        </label>
      ) : null}
      {mode === 'schema' ? (
        <>
          <Segmented
            label="Schema"
            value={schema}
            onChange={setSchema}
            options={[
              { value: 'faq', label: 'FAQ' },
              { value: 'howto', label: 'HowTo' },
              { value: 'article', label: 'Article' },
            ]}
          />
          {schema === 'faq' ? (
            <>
              <label className="field">
                <span>Question</span>
                <input className="text-input" value={question} onChange={(e) => setQuestion(e.target.value)} />
              </label>
              <label className="field">
                <span>Answer</span>
                <textarea className="code-area" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </label>
            </>
          ) : null}
          {schema === 'howto' ? (
            <>
              <label className="field">
                <span>Name</span>
                <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span>Steps, one per line</span>
                <textarea className="code-area" rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} />
              </label>
            </>
          ) : null}
          {schema === 'article' ? (
            <>
              <label className="field">
                <span>Headline</span>
                <input className="text-input" value={headline} onChange={(e) => setHeadline(e.target.value)} />
              </label>
              <label className="field">
                <span>Author</span>
                <input className="text-input" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </label>
              <label className="field">
                <span>Date</span>
                <input
                  className="text-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="2026-11-23"
                />
              </label>
            </>
          ) : null}
        </>
      ) : null}
      {mode === 'serp' ? (
        <>
          <label className="field">
            <span>Title</span>
            <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              className="code-area"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <p className="hint">
            Title {Math.round(titlePx)} px of {SERP_TITLE_PX} · {serpFit(titlePx, SERP_TITLE_PX)}. Description{' '}
            {Math.round(descPx)} px of {SERP_DESC_PX} · {serpFit(descPx, SERP_DESC_PX)}. Measured in Arial, which is
            what the result page uses.
          </p>
          <div style={{ maxWidth: 600, padding: '0.75rem', border: '1px solid var(--line)' }}>
            <div style={{ color: '#1a0dab', font: '20px Arial, sans-serif', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {title}
            </div>
            <div style={{ color: '#4d5156', font: '14px Arial, sans-serif' }}>{description}</div>
          </div>
        </>
      ) : null}
      {output.error ? <p className="status-bad">{output.error}</p> : null}
      {output.text ? <textarea className="code-area" rows={10} readOnly value={output.text} /> : null}
      {output.text ? (
        <button type="button" className="btn btn-primary" onClick={() => void copy(output.text, 'tag')}>
          {copied === 'tag' ? 'Copied ✓' : 'Copy'}
        </button>
      ) : null}
    </ToolLayout>
  )
}
