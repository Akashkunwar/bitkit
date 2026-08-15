import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => undefined,
})

function initialTheme(): Theme {
  const stored = localStorage.getItem('bitkit-theme')
  if (stored === 'dark' || stored === 'light') return stored
  // No explicit choice yet: follow the OS rather than forcing light.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (typeof window === 'undefined' ? 'light' : initialTheme()))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('bitkit-theme', theme)
    // Both media-scoped tags are replaced by one explicit value once the user
    // has chosen, so the browser chrome matches the app rather than the OS.
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', theme === 'dark' ? '#0d1413' : '#f4f7f7')
      meta.removeAttribute('media')
    }
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
