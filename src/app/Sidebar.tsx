import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronRight, House, PanelLeftClose, ShieldCheck, Star } from 'lucide-react'
import { Logo } from './Brand'
import { CATEGORIES, CATEGORY_META, tools, type ToolCategory, type ToolMeta } from '../registry'
import { usePins } from '../lib/usePins'
import { useI18n } from '../lib/i18n'

const OPEN_SECTIONS_KEY = 'bitkit-open-sections'

function readOpenSections(): string[] | null {
  try {
    const raw = localStorage.getItem(OPEN_SECTIONS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null
  } catch {
    return null
  }
}

function writeOpenSections(value: string[]): void {
  try {
    localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(value))
  } catch {
    /* private mode */
  }
}

type Props = {
  open: boolean
  activeTool?: ToolMeta
  onHide: () => void
}

function ToolLink({ tool }: { tool: ToolMeta }) {
  const Icon = tool.icon
  return (
    <NavLink className="rail-link" to={tool.path} title={tool.blurb}>
      <Icon size={16} aria-hidden="true" />
      <span>{tool.title}</span>
      {tool.isNew ? <span className="rail-new">New</span> : null}
      {tool.shortcut && !tool.isNew ? <kbd>{tool.shortcut}</kbd> : null}
    </NavLink>
  )
}

/**
 * The navigation rail. Only the section you are in starts open, so the list
 * stays scannable with 70-odd tools; the open set is remembered per device.
 */
export function Sidebar({ open, activeTool, onHide }: Props) {
  const { t } = useI18n()
  const { pins } = usePins()
  const [expanded, setExpanded] = useState<string[]>(
    () => readOpenSections() ?? (activeTool ? [activeTool.category] : ['Daily']),
  )

  // Arriving on a tool opens its section, so the current page is visible.
  useEffect(() => {
    if (!activeTool) return
    setExpanded((current) => (current.includes(activeTool.category) ? current : [...current, activeTool.category]))
  }, [activeTool])

  const toggleSection = useCallback((category: ToolCategory) => {
    setExpanded((current) => {
      const next = current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
      writeOpenSections(next)
      return next
    })
  }, [])

  const pinnedTools = pins.map((id) => tools.find((tool) => tool.id === id)).filter((tool): tool is ToolMeta => !!tool)

  return (
    <aside className="sidebar no-print" data-open={open} aria-label={t('nav.tools')}>
      <div className="sidebar-head">
        <NavLink className="brand" to="/" aria-label="BitKit home">
          <Logo size={30} />
          <span className="brand-name">
            Bit<span>Kit</span>
          </span>
        </NavLink>
        <button
          type="button"
          className="icon-btn icon-btn-sm btn-ghost sidebar-toggle-desktop"
          aria-label={t('nav.hideSidebar')}
          title={`${t('nav.hideSidebar')} — [`}
          onClick={onHide}
        >
          <PanelLeftClose size={17} aria-hidden="true" />
        </button>
      </div>

      <nav className="rail" aria-label={t('nav.tools')}>
        <NavLink className="rail-link" to="/" end>
          <House size={16} aria-hidden="true" />
          <span>{t('nav.home')}</span>
          <kbd>G H</kbd>
        </NavLink>

        {pinnedTools.length ? (
          <section className="rail-section" aria-labelledby="rail-pinned">
            <p className="rail-heading" id="rail-pinned">
              <span className="rail-cat-icon" style={{ '--cat': 'var(--warn)' } as CSSProperties}>
                <Star size={12} aria-hidden="true" />
              </span>
              {t('nav.pinned')}
            </p>
            {pinnedTools.map((tool) => (
              <ToolLink key={tool.id} tool={tool} />
            ))}
          </section>
        ) : null}

        {CATEGORIES.map((category) => {
          const list = tools.filter((tool) => tool.category === category)
          if (!list.length) return null
          const isOpen = expanded.includes(category)
          const id = `rail-${category.toLowerCase()}`
          const meta = CATEGORY_META[category]
          const CatIcon = meta.icon
          return (
            <section key={category} className="rail-section">
              <button
                type="button"
                className="rail-heading rail-toggle"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => toggleSection(category)}
              >
                <span className="rail-cat-icon" style={{ '--cat': meta.color } as CSSProperties}>
                  <CatIcon size={12} aria-hidden="true" />
                </span>
                {t(`category.${category}`)}
                <span className="rail-count">{list.length}</span>
                <span className="rail-caret" aria-hidden="true" data-open={isOpen}>
                  <ChevronRight size={14} />
                </span>
              </button>
              {isOpen ? (
                <div id={id} className="rail-section">
                  {list.map((tool) => (
                    <ToolLink key={tool.id} tool={tool} />
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
      </nav>

      <div className="rail-foot">
        <NavLink className="rail-foot-link" to="/privacy">
          {t('nav.privacy')}
        </NavLink>
        <span className="rail-badge" title="Everything runs in your browser">
          <ShieldCheck size={13} aria-hidden="true" />
          {t('nav.onDevice')}
        </span>
      </div>
    </aside>
  )
}
