import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, initialLanguage, LANGUAGE_KEY, makeTranslator, type Language } from '../lib/i18n'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    typeof window === 'undefined' ? 'en' : initialLanguage(),
  )

  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem(LANGUAGE_KEY, language)
    } catch {
      /* private mode */
    }
  }, [language])

  const value = useMemo(
    () => ({ language, setLanguage, t: makeTranslator(language) }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
