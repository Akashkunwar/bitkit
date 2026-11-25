import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, ChevronRight, Link2, Star } from 'lucide-react'
import { PipelineBanner } from './PipelineBanner'
import { ToolIcon } from './ToolIcon'
import { toolForPath, tools, type ToolMeta } from '../registry'
import { usePins } from '../lib/usePins'
import { useCopied } from '../lib/useCopied'
import { useI18n } from '../lib/i18n'
import { toolText } from '../lib/hiTools'

type Props = {
  title: string
  lede?: string
  actions?: ReactNode
  children: ReactNode
}

/** Up to four tools that share a file type or a keyword, then the same category. */
function relatedTools(tool: ToolMeta): ToolMeta[] {
  const accepts = new Set(tool.accepts ?? [])
  const words = new Set(tool.keywords.map((word) => word.toLowerCase()))
  const ranked = tools
    .filter((other) => other.id !== tool.id)
    .map((other) => {
      let score = other.category === tool.category ? 2 : 0
      for (const kind of other.accepts ?? []) if (accepts.has(kind)) score += 4
      for (const word of other.keywords) if (words.has(word.toLowerCase())) score += 1
      return { other, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.other.title.localeCompare(b.other.title))
  const picked = ranked.slice(0, 4).map((row) => row.other)
  for (const other of tools) {
    if (picked.length >= 4) break
    if (other.id !== tool.id && other.category === tool.category && !picked.includes(other)) picked.push(other)
  }
  return picked
}

/**
 * The frame every tool renders inside: breadcrumb, title, actions, the
 * pipeline banner when a pipeline is running, and related tools at the foot.
 *
 * The tool's registry entry is looked up from the route, so tools only pass
 * the copy they own and pick up icon, category, and shortcut for free.
 */
export function ToolLayout({ title, lede, actions, children }: Props) {
  const { pathname } = useLocation()
  const tool = toolForPath(pathname)
  const { isPinned, toggle } = usePins()
  const { copied, copy } = useCopied(1600)
  const { t, language } = useI18n()
  const pinned = tool ? isPinned(tool.id) : false
  const related = tool ? relatedTools(tool) : []
  const heading = tool ? toolText(language, tool) : null
  const shownTitle = heading?.title ?? title
  const shownLede = language === 'hi' && heading ? heading.blurb : lede

  return (
    <article className="tool-layout">
      <header className="tool-hero no-print">
        {tool ? (
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">{t('nav.home')}</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <Link to={`/?category=${encodeURIComponent(tool.category)}`}>{t(`category.${tool.category}`)}</Link>
          </nav>
        ) : null}
        <div className="tool-hero-row">
          {tool ? <ToolIcon icon={tool.icon} category={tool.category} size="lg" /> : null}
          <div className="tool-hero-text">
            <h1>{shownTitle}</h1>
            {shownLede ? <p className="lede">{shownLede}</p> : null}
          </div>
          {tool ? (
            <div className="tool-hero-actions">
              {tool.shortcut ? <kbd title="Keyboard shortcut">{tool.shortcut}</kbd> : null}
              <button
                type="button"
                className="icon-btn"
                aria-pressed={pinned}
                aria-label={pinned ? `${t('nav.unpin')} ${shownTitle}` : `${t('nav.pin')} ${shownTitle}`}
                title={pinned ? t('nav.unpin') : t('nav.pin')}
                onClick={() => toggle(tool.id)}
              >
                <Star size={17} fill={pinned ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={copied ? t('nav.linkCopied') : t('nav.copyLink')}
                title={copied ? t('nav.linkCopied') : t('nav.copyLink')}
                onClick={() => void copy(window.location.href)}
              >
                {copied ? <Check size={17} aria-hidden="true" /> : <Link2 size={17} aria-hidden="true" />}
              </button>
            </div>
          ) : null}
        </div>
        {actions ? <div className="row">{actions}</div> : null}
      </header>
      <PipelineBanner />
      {children}
      {related.length ? (
        <section className="related no-print" aria-labelledby="related-heading">
          <h2 id="related-heading">{t('tool.related', { category: t(`category.${tool!.category}`) })}</h2>
          <div className="grid-tools">
            {related.map((other) => (
              <div key={other.id} className="tool-card">
                <Link className="tool-card-link" to={other.path}>
                  <ToolIcon icon={other.icon} category={other.category} />
                  <span className="tool-card-text">
                    <h3>{toolText(language, other).title}</h3>
                    <p>{toolText(language, other).blurb}</p>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  )
}
