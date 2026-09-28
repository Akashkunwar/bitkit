import { Suspense, useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Keyboard, Menu, PanelLeftOpen, Search, X } from 'lucide-react'
import { CommandPalette } from './CommandPalette'
import { Cheatsheet } from './Cheatsheet'
import { StatusBar } from './StatusBar'
import { ToolBoundary } from './ToolBoundary'
import { Logo } from './Brand'
import { Sidebar } from './Sidebar'
import { ThemeMenu } from './ThemeMenu'
import { useShellKeys } from './useShellKeys'
import { toolForPath } from '../registry'
import { getPref, setPref } from '../lib/db'
import { setHandoff, suggestPath } from '../lib/handoff'
import { recordUse } from '../lib/prefs'
import { LANGUAGES, useI18n } from '../lib/i18n'

const SIDEBAR_KEY = 'bitkit-sidebar'

function readSidebarHidden(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'hidden'
  } catch {
    return false
  }
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function AppShell() {
  const { t, language, setLanguage } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(readSidebarHidden)

  const activeTool = toolForPath(location.pathname)

  const toggleSidebar = useCallback(() => {
    // On a narrow screen the sidebar is a drawer, so the same key opens that.
    if (window.matchMedia('(max-width: 960px)').matches) {
      setNavOpen((v) => !v)
      return
    }
    setSidebarHidden((hidden) => {
      const next = !hidden
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? 'hidden' : 'shown')
      } catch {
        /* private mode */
      }
      return next
    })
  }, [])

  const chordHint = useShellKeys({
    openPalette: () => setPaletteOpen(true),
    openCheatsheet: () => setSheetOpen(true),
    toggleSidebar,
    closeOverlays: () => setNavOpen(false),
  })

  // Track recents and usage for the home page and the palette.
  useEffect(() => {
    if (!activeTool) return
    void (async () => {
      const recents = await getPref<string[]>('recents', [])
      const next = [activeTool.id, ...recents.filter((id) => id !== activeTool.id)].slice(0, 8)
      await setPref('recents', next)
      await recordUse(activeTool.id)
    })()
  }, [activeTool])

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  // Files opened with the installed PWA ("Open with BitKit").
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

  // Pasting an image anywhere on Home routes it to the clipboard tool.
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

  return (
    <div className="shell" data-sidebar={sidebarHidden ? 'hidden' : 'shown'}>
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>

      {navOpen ? (
        <button type="button" className="scrim" aria-label={t('nav.closeMenu')} onClick={() => setNavOpen(false)} />
      ) : null}

      <Sidebar open={navOpen} activeTool={activeTool} onHide={toggleSidebar} />

      <div className="main-col">
        <header className="topbar no-print">
          <button
            type="button"
            className="icon-btn nav-toggle-mobile"
            aria-label={navOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          {sidebarHidden ? (
            <button
              type="button"
              className="icon-btn sidebar-toggle-desktop"
              aria-label={t('nav.showSidebar')}
              title={`${t('nav.showSidebar')} — [`}
              onClick={toggleSidebar}
            >
              <PanelLeftOpen size={18} aria-hidden="true" />
            </button>
          ) : null}

          <Link className="brand" to="/" aria-label="BitKit home">
            <Logo size={28} />
            <span className="brand-name">
              Bit<span>Kit</span>
            </span>
          </Link>

          <button
            type="button"
            className="search-trigger"
            aria-label={t('nav.search')}
            aria-haspopup="dialog"
            onClick={() => setPaletteOpen(true)}
          >
            <Search size={16} aria-hidden="true" />
            <span>{t('nav.search')}</span>
            <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>

          <div className="topbar-spacer" />

          <button
            type="button"
            className="icon-btn shortcuts-btn"
            onClick={() => setSheetOpen(true)}
            aria-label={t('action.shortcuts')}
            title={`${t('action.shortcuts')} — ?`}
          >
            <Keyboard size={18} aria-hidden="true" />
          </button>

          <select
            className="lang-select"
            value={language}
            aria-label={t('action.language')}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
          >
            {LANGUAGES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.label}
              </option>
            ))}
          </select>

          <ThemeMenu />
        </header>

        <main id="main" className="main">
          <StatusBar />
          <ToolBoundary resetKey={location.pathname} toolTitle={activeTool?.title ?? 'This page'}>
            <Suspense
              fallback={
                <div className="empty-state" role="status">
                  <span className="spinner" aria-hidden="true" />
                  <p>Loading tool…</p>
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ToolBoundary>
        </main>
      </div>

      {chordHint ? (
        <div className="chord-hint no-print" role="status" aria-live="polite">
          <kbd>{chordHint}</kbd>
          <span>waiting for the next key…</span>
        </div>
      ) : null}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenCheatsheet={() => setSheetOpen(true)}
      />
      <Cheatsheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
