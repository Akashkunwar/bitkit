import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeState } from './useTheme'
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  DEFAULT_PAIR,
  THEME_KEY,
  THEME_PAIR_KEY,
  isThemeMode,
  parseAppearance,
  parsePair,
  resolveTheme,
  themeMeta,
  type AppearancePrefs,
  type ThemeMode,
  type ThemePair,
} from '../lib/theme'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function initialMode(): ThemeMode {
  const stored = read(THEME_KEY)
  // Anything stored before this shipped is a bare 'light' or 'dark', which is
  // still a valid explicit mode — no migration needed.
  return isThemeMode(stored) ? stored : 'system'
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const ssr = typeof window === 'undefined'
  const [mode, setModeState] = useState<ThemeMode>(() => (ssr ? 'system' : initialMode()))
  const [pair, setPairState] = useState<ThemePair>(() => (ssr ? DEFAULT_PAIR : parsePair(read(THEME_PAIR_KEY))))
  const [prefs, setPrefsState] = useState<AppearancePrefs>(() =>
    ssr ? DEFAULT_APPEARANCE : parseAppearance(read(APPEARANCE_KEY)),
  )
  const [prefersDark, setPrefersDark] = useState<boolean>(() => (ssr ? false : systemPrefersDark()))

  // Following the OS has to mean following it live, not only at load.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme = resolveTheme(mode, pair, prefersDark)
  const systemTheme = resolveTheme('system', pair, prefersDark)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    write(THEME_KEY, mode)
    // Both media-scoped tags are replaced by one explicit value once a theme is
    // resolved, so the browser chrome matches the app rather than the OS.
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', themeMeta(theme).themeColor)
      meta.removeAttribute('media')
    }
  }, [theme, mode])

  useEffect(() => {
    write(THEME_PAIR_KEY, JSON.stringify(pair))
  }, [pair])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.density = prefs.density
    root.dataset.motion = prefs.motion === 'off' ? 'off' : 'on'
    // Scaling the root rather than body means rem-based spacing grows with the
    // type, so a larger size stays proportioned instead of getting cramped.
    root.style.setProperty('--text-scale', String(prefs.textScale))
    write(APPEARANCE_KEY, JSON.stringify(prefs))
  }, [prefs])

  const setMode = useCallback((next: ThemeMode) => setModeState(next), [])
  const setPair = useCallback((next: ThemePair) => setPairState(next), [])
  const setPrefs = useCallback(
    (patch: Partial<AppearancePrefs>) => setPrefsState((current) => ({ ...current, ...patch })),
    [],
  )
  const syncFromStorage = useCallback(() => {
    setModeState(initialMode())
    setPairState(parsePair(read(THEME_PAIR_KEY)))
    setPrefsState(parseAppearance(read(APPEARANCE_KEY)))
  }, [])

  const value = useMemo<ThemeState>(
    () => ({
      theme,
      mode,
      systemTheme,
      pair,
      prefs,
      setMode,
      setPair,
      setPrefs,
      syncFromStorage,
    }),
    [theme, mode, systemTheme, pair, prefs, setMode, setPair, setPrefs, syncFromStorage],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
