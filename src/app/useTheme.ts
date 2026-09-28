import { createContext, useContext } from 'react'
import {
  DEFAULT_APPEARANCE,
  DEFAULT_PAIR,
  type AppearancePrefs,
  type ThemeId,
  type ThemeMode,
  type ThemePair,
} from '../lib/theme'

export type ThemeState = {
  /** The palette actually on screen — never 'system'. */
  theme: ThemeId
  /** What the user picked, which may be 'system'. */
  mode: ThemeMode
  /** What 'system' mode resolves to right now, whatever the current mode is. */
  systemTheme: ThemeId
  pair: ThemePair
  prefs: AppearancePrefs
  setMode: (mode: ThemeMode) => void
  setPair: (pair: ThemePair) => void
  setPrefs: (prefs: Partial<AppearancePrefs>) => void
  /**
   * Re-read every stored preference.
   *
   * Restore and wipe write localStorage directly, which this provider would
   * otherwise never notice — leaving the panel showing one theme while storage
   * holds another, until a reload disagreed with both.
   */
  syncFromStorage: () => void
}

export const ThemeContext = createContext<ThemeState>({
  theme: 'light',
  mode: 'system',
  systemTheme: 'light',
  pair: DEFAULT_PAIR,
  prefs: DEFAULT_APPEARANCE,
  setMode: () => undefined,
  setPair: () => undefined,
  setPrefs: () => undefined,
  syncFromStorage: () => undefined,
})

export function useTheme(): ThemeState {
  return useContext(ThemeContext)
}
