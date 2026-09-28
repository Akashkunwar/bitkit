import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutGrid, Search, ShieldCheck, Sparkles, Star, WifiOff, X, Zap } from 'lucide-react'
import { CATEGORIES, CATEGORY_META, searchTools, tools, type ToolCategory, type ToolMeta } from '../registry'
import { getPref } from '../lib/db'
import { readUsage, sortByUsage, type Usage } from '../lib/prefs'
import { usePins } from '../lib/usePins'
import { toolsForFiles } from '../lib/fileRoutes'
import { setHandoff } from '../lib/handoff'
import { useI18n } from '../lib/i18n'
import { DropZone } from '../components/DropZone'
import { ToolIcon } from '../components/ToolIcon'

type Filter = 'All' | ToolCategory

function isCategory(value: string | null): value is ToolCategory {
  return !!value && (CATEGORIES as string[]).includes(value)
}

function ToolCard({ tool, showTag }: { tool: ToolMeta; showTag?: boolean }) {
  const { isPinned, toggle } = usePins()
  const { t } = useI18n()
  const pinned = isPinned(tool.id)
  return (
    <div className="tool-card" style={{ '--cat': CATEGORY_META[tool.category].color } as CSSProperties}>
      <Link className="tool-card-link" to={tool.path}>
        <ToolIcon icon={tool.icon} category={tool.category} />
        <span className="tool-card-text">
          <h3>
            {tool.title}
            {tool.isNew ? <span className="badge badge-new">New</span> : null}
          </h3>
          <p>{tool.blurb}</p>
          {showTag ? <span className="tool-tag">{t(`category.${tool.category}`)}</span> : null}
        </span>
      </Link>
      <button
        type="button"
        className="pin-btn"
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
        onClick={() => toggle(tool.id)}
      >
        <Star size={15} aria-hidden="true" />
      </button>
    </div>
  )
}

/** Drop any file on Home and get the tools that can open it. */
function SmartDrop() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])
  const suggestions = useMemo(() => toolsForFiles(files), [files])

  const open = (tool: ToolMeta) => {
    setHandoff({ files, from: 'home' })
    navigate(tool.path, { state: { handoff: Date.now() } })
  }

  return (
    <section className="smart-drop" aria-label={t('home.drop')}>
      {files.length ? (
        <div className="suggest">
          <div className="suggest-head">
            <h2>
              {files.length === 1
                ? t('home.openWith', { name: files[0].name })
                : t('home.openWithMany', { count: files.length })}
            </h2>
            <button type="button" className="btn btn-sm" onClick={() => setFiles([])}>
              <X size={14} aria-hidden="true" />
              {t('home.clear')}
            </button>
          </div>
          {suggestions.length ? (
            <div className="suggest-grid">
              {suggestions.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className="suggest-item"
                  style={{ '--cat': CATEGORY_META[tool.category].color } as CSSProperties}
                  onClick={() => open(tool)}
                >
                  <ToolIcon icon={tool.icon} category={tool.category} size="sm" />
                  <span>
                    <strong>{tool.title}</strong>
                    <span>{tool.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">{t('home.noSuggestion')}</p>
          )}
        </div>
      ) : (
        <DropZone accept="*/*" multiple compact label={t('home.drop')} hint={t('home.dropHint')} onFiles={setFiles} />
      )}
    </section>
  )
}

export function Home() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('category')
  const [recents, setRecents] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilterState] = useState<Filter>(isCategory(initial) ? initial : 'All')
  const [usage, setUsage] = useState<Usage>({})
  const { pins } = usePins()
  const { t } = useI18n()

  useEffect(() => {
    void (async () => {
      setRecents(await getPref<string[]>('recents', []))
      setUsage(await readUsage())
    })()
  }, [])

  // Breadcrumb links arrive as /?category=Image.
  useEffect(() => {
    const value = params.get('category')
    if (isCategory(value)) setFilterState(value)
  }, [params])

  const setFilter = (next: Filter) => {
    setFilterState(next)
    setParams(next === 'All' ? {} : { category: next }, { replace: true })
  }

  const matches = useMemo(() => searchTools(query), [query])
  // The tools you actually reach for float up.
  const mostUsed = useMemo(
    () =>
      sortByUsage(tools, usage)
        .filter((tool) => usage[tool.id]?.count)
        .slice(0, 4),
    [usage],
  )
  const visible = useMemo(
    () => (filter === 'All' ? matches : matches.filter((tool) => tool.category === filter)),
    [matches, filter],
  )

  const searching = query.trim().length > 0 || filter !== 'All'
  const pinnedTools = pins.map((id) => tools.find((tool) => tool.id === id)).filter((tool): tool is ToolMeta => !!tool)
  const recentTools = recents
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool): tool is ToolMeta => !!tool && !pins.includes(tool.id))
    .slice(0, 6)
  const newTools = tools.filter((tool) => tool.isNew)

  return (
    <div className="home">
      <section className="hero">
        <span className="hero-badge">
          <ShieldCheck size={15} aria-hidden="true" />
          {t('home.badge')}
        </span>
        <h1>
          {t('home.title').replace(t('home.titleAccent'), '')}
          <span>{t('home.titleAccent')}</span>
        </h1>
        <p>{t('home.lede', { count: tools.length })}</p>

        <div className="finder">
          <div className="finder-input">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              value={query}
              aria-label="Search tools"
              placeholder={t('home.searchPlaceholder', { count: tools.length })}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button type="button" className="btn-ghost" onClick={() => setQuery('')}>
                {t('home.clear')}
              </button>
            ) : null}
          </div>
        </div>

        <ul className="hero-stats">
          <li>
            <LayoutGrid size={15} aria-hidden="true" />
            {t('home.statTools', { count: tools.length })}
          </li>
          <li>
            <WifiOff size={15} aria-hidden="true" />
            {t('home.statOffline')}
          </li>
          <li>
            <Zap size={15} aria-hidden="true" />
            {t('home.statFree')}
          </li>
        </ul>
      </section>

      {!searching ? <SmartDrop /> : null}

      <div className="filter-row" role="group" aria-label="Filter by category">
        {(['All', ...CATEGORIES] as Filter[]).map((option) => {
          const meta = option === 'All' ? null : CATEGORY_META[option]
          const Icon = meta?.icon ?? LayoutGrid
          return (
            <button
              key={option}
              type="button"
              className={filter === option ? 'filter-pill is-on' : 'filter-pill'}
              style={meta ? ({ '--cat': meta.color } as CSSProperties) : undefined}
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              <Icon size={15} aria-hidden="true" />
              {option === 'All' ? t('home.all') : t(`category.${option}`)}
            </button>
          )
        })}
      </div>

      {!searching && pinnedTools.length ? (
        <section className="home-section">
          <div className="home-section-head">
            <h2>{t('home.pinned')}</h2>
          </div>
          <div className="grid-tools">
            {pinnedTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} showTag />
            ))}
          </div>
        </section>
      ) : null}

      {!searching && recentTools.length ? (
        <section className="home-section">
          <div className="home-section-head">
            <h2>{t('home.recent')}</h2>
          </div>
          <div className="chip-row">
            {recentTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link key={tool.id} className="chip" to={tool.path}>
                  <Icon size={14} aria-hidden="true" />
                  {tool.title}
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {!searching && mostUsed.length >= 3 ? (
        <section className="home-section">
          <div className="home-section-head">
            <h2>{t('home.mostUsed')}</h2>
          </div>
          <div className="grid-tools">
            {mostUsed.map((tool) => (
              <ToolCard key={tool.id} tool={tool} showTag />
            ))}
          </div>
        </section>
      ) : null}

      {!searching && newTools.length ? (
        <section className="home-section">
          <div className="home-section-head">
            <span className="tool-icon" aria-hidden="true">
              <Sparkles size={17} />
            </span>
            <h2>{t('home.new')}</h2>
            <span className="home-section-count">{newTools.length}</span>
          </div>
          <div className="grid-tools">
            {newTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} showTag />
            ))}
          </div>
        </section>
      ) : null}

      {searching ? (
        <section className="home-section">
          <div className="home-section-head">
            <h2>
              {visible.length} {visible.length === 1 ? t('home.tool') : t('home.tools')}
            </h2>
          </div>
          {visible.length ? (
            <div className="grid-tools">
              {visible.map((tool) => (
                <ToolCard key={tool.id} tool={tool} showTag={filter === 'All'} />
              ))}
            </div>
          ) : (
            <p className="muted">{t('home.noMatch', { query })}</p>
          )}
        </section>
      ) : (
        CATEGORIES.map((category) => {
          const list = tools.filter((tool) => tool.category === category)
          if (!list.length) return null
          const meta = CATEGORY_META[category]
          return (
            <section key={category} className="home-section" id={`cat-${category.toLowerCase()}`}>
              <div className="home-section-head">
                <ToolIcon icon={meta.icon} category={category} />
                <div>
                  <h2>{t(`category.${category}`)}</h2>
                  <p>{t(`categoryBlurb.${category}`)}</p>
                </div>
                <span className="home-section-count">{list.length}</span>
              </div>
              <div className="grid-tools">
                {sortByUsage(list, usage).map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          )
        })
      )}

      <footer className="home-foot">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          {t('home.footer')} <Link to="/privacy">{t('home.howItWorks')}</Link>.
        </p>
      </footer>
    </div>
  )
}
