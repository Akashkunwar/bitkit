import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchTools, type ToolMeta } from '../registry'

type Props = {
  onPick?: (tool: ToolMeta) => void
}

export function CommandBar({ onPick }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const results = useMemo(() => searchTools(query).slice(0, 8), [query])

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

  const go = (tool: ToolMeta) => {
    onPick?.(tool)
    navigate(tool.path)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="command-wrap">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <input
        ref={inputRef}
        className="command-input"
        placeholder="Search tools — or press /"
        value={query}
        role="combobox"
        aria-label="Search tools"
        aria-expanded={open && results.length > 0}
        aria-controls="command-results"
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `command-opt-${results[active].id}` : undefined}
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
            setActive((n) => Math.min(results.length - 1, n + 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((n) => Math.max(0, n - 1))
          } else if (event.key === 'Enter' && results[active]) {
            event.preventDefault()
            go(results[active])
          }
        }}
      />
      {open && results.length > 0 ? (
        <div className="command-list" id="command-results" role="listbox">
          {results.map((tool, index) => (
            <button
              key={tool.id}
              id={`command-opt-${tool.id}`}
              type="button"
              className="command-item"
              role="option"
              aria-selected={index === active}
              data-active={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => go(tool)}
            >
              <strong>{tool.title}</strong>
              <div className="muted">{tool.blurb}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
