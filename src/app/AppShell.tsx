import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CommandBar } from './CommandBar'
import { Logo } from './Brand'
import { useTheme } from './Theme'
import { CATEGORIES, tools } from '../registry'
import { getPref, setPref } from '../lib/db'
import { setHandoff, suggestPath } from '../lib/handoff'

/** Derived from the registry so a shortcut is declared in exactly one place. */
const CHORDS: Record<string, string> = {
  h: '/',
  ...Object.fromEntries(
    tools
      .map((tool) => [tool.shortcut?.split(' then ')[1]?.toLowerCase(), tool.path])
      .filter((pair): pair is [string, string] => Boolean(pair[0])),
  ),
}

/** How long a pending "G" waits for its second key before it lapses. */
const CHORD_TIMEOUT_MS = 1200

const OPEN_SECTIONS_KEY = 'bitkit-open-sections'

function readOpenSections(): string[] | null {
  try {
    const raw = localStorage.getItem(OPEN_SECTIONS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

export function AppShell() {
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const pendingG = useRef(false)
  const [navOpen, setNavOpen] = useState(false)
  const [pinned, setPinned] = useState<string[]>([])

  const activeTool = tools.find((tool) => tool.path === location.pathname)

  // Only the section you are in is open by default, so the rail stays short.
  const [open, setOpen] = useState<string[]>(
    () => readOpenSections() ?? (activeTool ? [activeTool.category] : ['Daily']),
  )

  const toggleSection = useCallback((category: string) => {
    setOpen((current) => {
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category]
      try {
        localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(next))
      } catch {
        /* private mode */
      }
      return next
    })
  }, [])

  // Track recents, and keep the current tool's section expanded.
  useEffect(() => {
    if (!activeTool) return
    setOpen((current) =>
      current.includes(activeTool.category) ? current : [...current, activeTool.category],
    )
    void (async () => {
      const recents = await getPref<string[]>('recents', [])
      const next = [activeTool.id, ...recents.filter((id) => id !== activeTool.id)].slice(0, 6)
      await setPref('recents', next)
    })()
  }, [activeTool])

  useEffect(() => {
    void getPref<string[]>('favorites', []).then(setPinned)
  }, [location.pathname])

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const queue = window.launchQueue
    if (!queue) return
    queue.setConsumer(async (params) => {
      const files: File[] = []
      for (const handle of params.files ?? []) files.push(await handle.getFile())
      if (!files.length) return
      setHandoff({ files, from: 'os' })
      navigate(suggestPath(files))
    })
  }, [navigate])

  useEffect(() => {
    let lapse: number | undefined
    const clear = () => {
      pendingG.current = false
      window.clearTimeout(lapse)
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (event.key === 'Escape') setNavOpen(false)
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'g') {
        pendingG.current = true
        window.clearTimeout(lapse)
        // Without this, a stray "g" arms the chord indefinitely and the next
        // keypress — minutes later — navigates away.
        lapse = window.setTimeout(clear, CHORD_TIMEOUT_MS)
        return
      }
      if (pendingG.current) {
        clear()
        const path = CHORDS[event.key.toLowerCase()]
        if (path) {
          event.preventDefault()
          navigate(path)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(lapse)
    }
  }, [navigate])

  useEffect(() => {
    if (location.pathname !== '/') return
    const onPaste = (event: ClipboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const files: File[] = []
      for (const item of event.clipboardData?.items ?? []) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      if (!files.length) return
      event.preventDefault()
      setHandoff({ files, from: 'paste' })
      navigate('/clipboard')
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [location.pathname, navigate])

  const pinnedTools = pinned.map((id) => tools.find((t) => t.id === id)).filter(Boolean)

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar no-print">
        <button
          type="button"
          className="nav-toggle"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          <span aria-hidden="true">{navOpen ? '✕' : '☰'}</span>
        </button>

        <Link className="brand" to="/">
          <Logo />
          <span className="brand-name">
            Bit<span>Kit</span>
          </span>
        </Link>

        <CommandBar />

        <button
          type="button"
          className="icon-btn"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <div className="shell-body">
        {navOpen ? (
          <button type="button" className="scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />
        ) : null}

        <aside className="sidebar no-print" data-open={navOpen}>
          <nav className="rail" aria-label="Tools">
            <NavLink className="rail-link" to="/" end>
              <span>Home</span>
              <kbd>G H</kbd>
            </NavLink>

            {pinnedTools.length ? (
              <section className="rail-section">
                <p className="rail-heading">Pinned</p>
                {pinnedTools.map((tool) =>
                  tool ? (
                    <NavLink key={tool.id} className="rail-link" to={tool.path}>
                      <span>{tool.title}</span>
                    </NavLink>
                  ) : null,
                )}
              </section>
            ) : null}

            {CATEGORIES.map((category) => {
              const list = tools.filter((tool) => tool.category === category)
              if (!list.length) return null
              const isOpen = open.includes(category)
              const id = `rail-${category.toLowerCase()}`
              return (
                <section key={category} className="rail-section">
                  <button
                    type="button"
                    className="rail-heading rail-toggle"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => toggleSection(category)}
                  >
                    <span className="rail-caret" aria-hidden="true" data-open={isOpen}>
                      ›
                    </span>
                    {category}
                    <span className="rail-count">{list.length}</span>
                  </button>
                  {isOpen ? (
                    <div id={id}>
                      {list.map((tool) => (
                        <NavLink key={tool.id} className="rail-link" to={tool.path}>
                          <span>{tool.title}</span>
                          {tool.shortcut ? <kbd>{tool.shortcut.replace(' then ', ' ')}</kbd> : null}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </nav>

          <div className="rail-foot">
            <NavLink className="rail-foot-link" to="/privacy">
              Privacy
            </NavLink>
            <span className="rail-badge" title="Everything runs in your browser">
              100% on-device
            </span>
          </div>
        </aside>

        <main id="main" className="main">
          <Suspense fallback={<p className="muted">Loading tool…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
