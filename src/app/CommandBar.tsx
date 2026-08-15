import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchTools, type ToolMeta } from '../registry'
import { searchActions, type Action, type ActionContext } from '../lib/actions'
import { useTheme } from './Theme'

type Props = {
  onPick?: (tool: ToolMeta) => void
  onOpenCheatsheet?: () => void
}

type Row =
  | { kind: 'tool'; tool: ToolMeta }
  | { kind: 'action'; action: Action }

export function CommandBar({ onPick, onOpenCheatsheet }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const rows = useMemo<Row[]>(() => {
    // Actions first: if you typed a verb you meant to do something, not browse.
    const actions = searchActions(query).slice(0, 4).map((action) => ({ kind: 'action' as const, action }))
    const tools = searchTools(query)
      .slice(0, actions.length ? 6 : 8)
      .map((tool) => ({ kind: 'tool' as const, tool }))
    return [...actions, ...tools]
  }, [query])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey
      if ((meta && event.key.toLowerCase() === 'k') || event.key === '/') {
        const tag = (event.target as HTMLElement | null)?.tagName
        if (event.key === '/' && (tag === 'INPUT' || tag === 'TEXTAREA')) return
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const ctx: ActionContext = {
    navigate,
    setTheme,
    currentTheme: theme,
    openCheatsheet: () => onOpenCheatsheet?.(),
    notify: (text) => {
      setMessage(text)
      window.setTimeout(() => setMessage(null), 4000)
    },
  }

  const run = (row: Row) => {
    setQuery('')
    setOpen(false)
    if (row.kind === 'tool') {
      onPick?.(row.tool)
      navigate(row.tool.path)
    } else {
      void row.action.run(ctx)
    }
  }

  const rowId = (row: Row) => (row.kind === 'tool' ? `t-${row.tool.id}` : `a-${row.action.id}`)

  return (
    <div className="command-wrap">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <input
        ref={inputRef}
        className="command-input"
        placeholder="Search or run — press /"
        value={query}
        role="combobox"
        aria-label="Search tools and actions"
        aria-expanded={open && rows.length > 0}
        aria-controls="command-results"
        aria-autocomplete="list"
        aria-activedescendant={open && rows[active] ? `command-opt-${rowId(rows[active])}` : undefined}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((n) => Math.min(rows.length - 1, n + 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((n) => Math.max(0, n - 1))
          } else if (event.key === 'Enter' && rows[active]) {
            event.preventDefault()
            run(rows[active])
          }
        }}
      />

      {message ? <p className="command-message" role="status">{message}</p> : null}

      {open && rows.length > 0 ? (
        <div className="command-list" id="command-results" role="listbox">
          {rows.map((row, index) => (
            <button
              key={rowId(row)}
              id={`command-opt-${rowId(row)}`}
              type="button"
              className="command-item"
              role="option"
              aria-selected={index === active}
              data-active={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => run(row)}
            >
              {row.kind === 'action' ? (
                <>
                  <strong>
                    <span className="command-verb" aria-hidden="true">
                      ▸
                    </span>
                    {row.action.label}
                  </strong>
                  <div className="muted">{row.action.hint ?? row.action.group}</div>
                </>
              ) : (
                <>
                  <strong>{row.tool.title}</strong>
                  <div className="muted">{row.tool.blurb}</div>
                </>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
