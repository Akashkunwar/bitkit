import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, ChevronRight, Link2, Star } from 'lucide-react'
import { PipelineBanner } from './PipelineBanner'
import { ToolIcon } from './ToolIcon'
import { toolForPath, tools, type ToolMeta } from '../registry'
import { usePins } from '../lib/usePins'
import { useCopied } from '../lib/useCopied'
import { useI18n } from '../lib/i18n'

type Props = {
  title: string
  lede?: string
  actions?: ReactNode
  children: ReactNode
}

/** Up to four neighbours from the same category, so a tool is never a dead end. */
function relatedTools(tool: ToolMeta): ToolMeta[] {
  return tools.filter((other) => other.category === tool.category && other.id !== tool.id).slice(0, 4)
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
  const { t } = useI18n()
  const pinned = tool ? isPinned(tool.id) : false
  const related = tool ? relatedTools(tool) : []

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
            <h1>{title}</h1>
            {lede ? <p className="lede">{lede}</p> : null}
          </div>
          {tool ? (
            <div className="tool-hero-actions">
              {tool.shortcut ? <kbd title="Keyboard shortcut">{tool.shortcut}</kbd> : null}
              <button
                type="button"
                className="icon-btn"
                aria-pressed={pinned}
                aria-label={pinned ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
                title={pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
                onClick={() => toggle(tool.id)}
              >
                <Star size={17} fill={pinned ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={copied ? 'Link copied' : 'Copy link to this tool'}
                title={copied ? 'Link copied' : 'Copy link'}
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
                    <h3>{other.title}</h3>
                    <p>{other.blurb}</p>
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
