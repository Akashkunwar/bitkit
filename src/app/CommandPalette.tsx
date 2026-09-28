import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, CornerDownLeft, Search, Zap } from 'lucide-react'
import { searchTools, tools, type ToolMeta } from '../registry'
import { searchActions, type Action, type ActionContext } from '../lib/actions'
import { getPref } from '../lib/db'
import { ToolIcon } from '../components/ToolIcon'
import { useTheme } from './useTheme'
import { useI18n } from '../lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
  onOpenCheatsheet: () => void
}

type Row = { kind: 'tool'; tool: ToolMeta } | { kind: 'action'; action: Action }

const rowId = (row: Row) => (row.kind === 'tool' ? `t-${row.tool.id}` : `a-${row.action.id}`)

/**
 * ⌘K / Ctrl K palette: find a tool, or run an action ("compress an image to
 * 300 KB"). A modal dialog with a combobox inside, so screen readers announce
 * the active option while focus stays in the input.
 */
export function CommandPalette({ open, onClose, onOpenCheatsheet }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [recents, setRecents] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<Element | null>(null)
  const navigate = useNavigate()
  const { theme, setMode } = useTheme()
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    setQuery('')
    setActive(0)
    void getPref<string[]>('recents', []).then(setRecents)
    // Focus after paint so the dialog exists.
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(id)
      const previous = restoreRef.current
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])

  const rows = useMemo<Row[]>(() => {
    if (!query.trim()) {
      const recent = recents
        .map((id) => tools.find((tool) => tool.id === id))
        .filter((tool): tool is ToolMeta => !!tool)
        .slice(0, 5)
      const base = recent.length ? recent : tools.slice(0, 6)
      return base.map((tool) => ({ kind: 'tool', tool }))
    }
    // Actions first: a typed verb means you meant to do something, not browse.
    const actions = searchActions(query)
      .slice(0, 4)
      .map((action) => ({ kind: 'action' as const, action }))
    const found = searchTools(query)
      .slice(0, actions.length ? 7 : 10)
      .map((tool) => ({ kind: 'tool' as const, tool }))
    return [...actions, ...found]
  }, [query, recents])

  useEffect(() => {
    setActive((n) => Math.min(n, Math.max(0, rows.length - 1)))
  }, [rows.length])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const ctx: ActionContext = {
    navigate: (path) => navigate(path, { state: { handoff: Date.now() } }),
    setTheme: setMode,
    currentTheme: theme,
    openCheatsheet: () => {
      onClose()
      onOpenCheatsheet()
    },
    notify: (text) => {
      setMessage(text)
      window.setTimeout(() => setMessage(null), 4000)
    },
  }

  const run = (row: Row) => {
    if (row.kind === 'tool') {
      onClose()
      navigate(row.tool.path)
      return
    }
    // Actions that navigate close the palette; ones that only report back keep
    // it open long enough for the message to be read.
    let notified = false
    const local: ActionContext = {
      ...ctx,
      notify: (text) => {
        notified = true
        ctx.notify(text)
      },
    }
    void Promise.resolve(row.action.run(local)).then(() => {
      if (!notified) onClose()
    })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((n) => (rows.length ? (n + 1) % rows.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((n) => (rows.length ? (n - 1 + rows.length) % rows.length : 0))
    } else if (event.key === 'Enter' && rows[active]) {
      event.preventDefault()
      run(rows[active])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Tab') {
      // The input is the only stop; options are reached with the arrows.
      event.preventDefault()
    }
  }

  const firstTool = rows.findIndex((row) => row.kind === 'tool')
  const hasActions = rows.some((row) => row.kind === 'action')

  return (
    <div
      className="palette-backdrop no-print"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKeyDown}>
        <div className="palette-input-row">
          <Search size={19} aria-hidden="true" />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder={t('palette.placeholder')}
            value={query}
            role="combobox"
            aria-label="Search tools and actions"
            aria-expanded={rows.length > 0}
            aria-controls="palette-results"
            aria-autocomplete="list"
            aria-activedescendant={rows[active] ? `palette-opt-${rowId(rows[active])}` : undefined}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
          />
          <kbd>Esc</kbd>
        </div>

        {message ? (
          <p className="palette-message" role="status">
            {message}
          </p>
        ) : null}

        <div className="palette-list" id="palette-results" role="listbox" ref={listRef} aria-label="Results">
          {rows.length === 0 ? <p className="palette-empty">{t('palette.empty', { query })}</p> : null}
          {rows.map((row, index) => (
            <div key={rowId(row)} role="presentation">
              {index === 0 && hasActions ? (
                <p className="palette-group" role="presentation">
                  {t('palette.actions')}
                </p>
              ) : null}
              {index === firstTool ? (
                <p className="palette-group" role="presentation">
                  {query.trim() ? t('palette.tools') : recents.length ? t('palette.recent') : t('palette.tools')}
                </p>
              ) : null}
              <button
                id={`palette-opt-${rowId(row)}`}
                type="button"
                tabIndex={-1}
                className="palette-item"
                role="option"
                data-index={index}
                aria-selected={index === active}
                data-active={index === active}
                onMouseMove={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => run(row)}
              >
                {row.kind === 'tool' ? (
                  <ToolIcon icon={row.tool.icon} category={row.tool.category} size="sm" />
                ) : (
                  <span className="tool-icon" aria-hidden="true">
                    <Zap size={16} />
                  </span>
                )}
                <span className="palette-item-text">
                  <strong>{row.kind === 'tool' ? row.tool.title : row.action.label}</strong>
                  <span>{row.kind === 'tool' ? row.tool.blurb : (row.action.hint ?? row.action.group)}</span>
                </span>
                <span className="palette-item-meta">
                  {row.kind === 'tool' ? t(`category.${row.tool.category}`) : null}
                </span>
                <CornerDownLeft size={15} className="palette-enter" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="palette-foot" aria-hidden="true">
          <span>
            <kbd>
              <ArrowUp size={11} />
            </kbd>
            <kbd>
              <ArrowDown size={11} />
            </kbd>
            {t('palette.navigate')}
          </span>
          <span>
            <kbd>
              <CornerDownLeft size={11} />
            </kbd>
            {t('palette.open')}
          </span>
          <span>
            <kbd>Esc</kbd>
            {t('palette.close')}
          </span>
        </div>
      </div>
    </div>
  )
}
