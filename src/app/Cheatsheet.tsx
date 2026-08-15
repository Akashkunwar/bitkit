import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, tools } from '../registry'
import { chordsByTool, LEADER } from '../lib/chords'

type Props = { open: boolean; onClose: () => void }

const GLOBAL: { keys: string; what: string }[] = [
  { keys: '?', what: 'Open this cheatsheet' },
  { keys: '⌘K  /  Ctrl K', what: 'Search tools' },
  { keys: '/', what: 'Jump to search' },
  { keys: 'Esc', what: 'Close search, menu, or this panel' },
  { keys: `${LEADER.toUpperCase()} H`, what: 'Home' },
  { keys: 'Ctrl Z', what: 'Undo the last destructive action' },
  { keys: 'Ctrl V', what: 'Paste an image on Home to route it' },
]

export function Cheatsheet({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<Element | null>(null)

  const rows = useMemo(() => chordsByTool(tools), [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) =>
        row.tool.title.toLowerCase().includes(q) ||
        row.chords.some((c) => c.toLowerCase().includes(q)) ||
        row.tool.category.toLowerCase().includes(q),
    )
  }, [rows, query])

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      // Keep focus inside the dialog while it is open.
      if (event.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      ;(restoreRef.current as HTMLElement | null)?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const keycaps = (chord: string) =>
    chord.split(' ').map((key, i) => (
      <kbd key={`${key}-${i}`}>{key}</kbd>
    ))

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheatsheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sheet-head">
          <h2 id="cheatsheet-title">Keyboard shortcuts</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>

        <input
          className="text-input"
          type="search"
          placeholder="Filter shortcuts…"
          value={query}
          aria-label="Filter shortcuts"
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="sheet-body">
          {!query ? (
            <section className="sheet-group">
              <h3>Anywhere</h3>
              <ul>
                {GLOBAL.map((row) => (
                  <li key={row.keys}>
                    <span className="sheet-keys">{keycaps(row.keys)}</span>
                    <span>{row.what}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {CATEGORIES.map((category) => {
            const list = filtered.filter((row) => row.tool.category === category)
            if (!list.length) return null
            return (
              <section key={category} className="sheet-group">
                <h3>{category}</h3>
                <ul>
                  {list.map((row) => (
                    <li key={row.tool.id}>
                      <span className="sheet-keys">
                        {keycaps(row.chords[0])}
                        {row.chords[1] ? (
                          <span className="sheet-alias" title="Also works">
                            {keycaps(row.chords[1])}
                          </span>
                        ) : null}
                      </span>
                      <span>{row.tool.title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          {query && !filtered.length ? <p className="muted">Nothing matched “{query}”.</p> : null}
        </div>

        <footer className="sheet-foot">
          Chords start with <kbd>G</kbd>. The digit picks a category in sidebar order, so
          <kbd>G</kbd> <kbd>4</kbd> <kbd>D</kbd> is the fourth group, Data table.
        </footer>
      </div>
    </div>
  )
}
