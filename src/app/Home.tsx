import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, searchTools, tools, type ToolCategory } from '../registry'
import { getPref, setPref } from '../lib/db'
import { readUsage, sortByUsage, type Usage } from '../lib/prefs'
import { useI18n } from '../lib/i18n'

type Filter = 'All' | ToolCategory

export function Home() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [recents, setRecents] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [usage, setUsage] = useState<Usage>({})
  const { t } = useI18n()

  useEffect(() => {
    void (async () => {
      setFavorites(await getPref<string[]>('favorites', []))
      setRecents(await getPref<string[]>('recents', []))
      setUsage(await readUsage())
    })()
  }, [])

  const togglePin = async (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]
    setFavorites(next)
    await setPref('favorites', next)
  }

  const matches = useMemo(() => searchTools(query), [query])
  // Within a category, the tools you actually reach for float up.
  const mostUsed = useMemo(
    () => sortByUsage(tools, usage).filter((tool) => usage[tool.id]?.count).slice(0, 4),
    [usage],
  )
  const visible = useMemo(
    () => (filter === 'All' ? matches : matches.filter((tool) => tool.category === filter)),
    [matches, filter],
  )

  const searching = query.trim().length > 0 || filter !== 'All'
  const pinnedTools = favorites.map((id) => tools.find((t) => t.id === id)).filter(Boolean)
  const recentTools = recents
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t) && !favorites.includes(t!.id))

  // The category tag only earns its place in mixed lists; under a category
  // heading it just repeats the heading.
  const card = (tool: (typeof tools)[number], showTag = false) => {
    const isPinned = favorites.includes(tool.id)
    return (
      <div key={tool.id} className="tool-card">
        <Link className="tool-card-link" to={tool.path}>
          <h3>{tool.title}</h3>
          <p>{tool.blurb}</p>
        </Link>
        <div className="tool-card-foot">
          <span className="tool-tag">{showTag ? tool.category : ''}</span>
          <button
            type="button"
            className="pin-btn"
            aria-pressed={isPinned}
            aria-label={isPinned ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
            onClick={() => void togglePin(tool.id)}
          >
            {isPinned ? '★' : '☆'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="home">
      <section className="hero">
        <h1>
          {t('home.title').replace(t('home.titleAccent'), '')}
          <span>{t('home.titleAccent')}</span>
        </h1>
        <p>{t('home.lede', { count: tools.length })}</p>
      </section>

      <div className="finder">
        <div className="finder-input">
          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <input
            type="search"
            value={query}
            aria-label="Search tools"
            placeholder={t('home.searchPlaceholder', { count: tools.length })}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button type="button" className="btn-ghost" onClick={() => setQuery('')}>
              Clear
            </button>
          ) : null}
        </div>

        <div className="filter-row">
          {(['All', ...CATEGORIES] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              className={filter === option ? 'filter-pill is-on' : 'filter-pill'}
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {option === 'All' ? t('home.all') : t(`category.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {!searching && pinnedTools.length ? (
        <section className="home-section">
          <h2>{t('home.pinned')}</h2>
          <div className="grid-tools">{pinnedTools.map((tool) => (tool ? card(tool, true) : null))}</div>
        </section>
      ) : null}

      {!searching && mostUsed.length >= 3 ? (
        <section className="home-section">
          <h2>{t('home.mostUsed')}</h2>
          <div className="grid-tools">{mostUsed.map((tool) => card(tool, true))}</div>
        </section>
      ) : null}

      {!searching && recentTools.length ? (
        <section className="home-section">
          <h2>{t('home.recent')}</h2>
          <div className="chip-row">
            {recentTools.map((tool) => (
              <Link key={tool.id} className="chip" to={tool.path}>
                {tool.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {searching ? (
        <section className="home-section">
          <h2>
            {visible.length} {visible.length === 1 ? t('home.tool') : t('home.tools')}
          </h2>
          {visible.length ? (
            <div className="grid-tools">{visible.map((tool) => card(tool, true))}</div>
          ) : (
            <p className="muted">
              {t('home.noMatch', { query })}
            </p>
          )}
        </section>
      ) : (
        CATEGORIES.map((category) => {
          const list = tools.filter((tool) => tool.category === category)
          if (!list.length) return null
          return (
            <section key={category} className="home-section">
              <h2>{t(`category.${category}`)}</h2>
              <div className="grid-tools">{sortByUsage(list, usage).map((tool) => card(tool))}</div>
            </section>
          )
        })
      )}

      <footer className="home-foot">
        <p>
          {t('home.footer')} <Link to="/privacy">{t('home.howItWorks')}</Link>.
        </p>
      </footer>
    </div>
  )
}
