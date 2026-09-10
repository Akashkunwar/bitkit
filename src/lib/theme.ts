/**
 * Theme and appearance data, kept out of React so it can be tested directly.
 *
 * The provider in src/app/Theme.tsx owns the DOM and storage side effects;
 * everything here is pure, which is what lets the resolution rules — the part
 * that actually has edge cases — be asserted without a renderer.
 */

export type ThemeId = 'light' | 'dark' | 'paper' | 'midnight' | 'contrast'

/** What the user chose. `system` is a rule, not a palette. */
export type ThemeMode = ThemeId | 'system'

export type Appearance = 'light' | 'dark'

export type ThemeMeta = {
  id: ThemeId
  label: string
  hint: string
  appearance: Appearance
  /** Browser chrome colour — matches --bg so the app does not end in a seam. */
  themeColor: string
  /** Background, surface, accent: enough to recognise the theme in a swatch. */
  swatch: [string, string, string]
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'light',
    label: 'Mist',
    hint: 'The default. Cool grey-green, easy in daylight.',
    appearance: 'light',
    themeColor: '#f4f7f7',
    swatch: ['#f4f7f7', '#ffffff', '#0c8070'],
  },
  {
    id: 'dark',
    label: 'Deep',
    hint: 'Dark without going black. Keeps depth between panels.',
    appearance: 'dark',
    themeColor: '#0d1413',
    swatch: ['#0d1413', '#1b2624', '#2fbfa4'],
  },
  {
    id: 'paper',
    label: 'Paper',
    hint: 'Warm and low-blue, for reading and writing sessions.',
    appearance: 'light',
    themeColor: '#f6f1e7',
    swatch: ['#f6f1e7', '#fffdf8', '#0b6f60'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    hint: 'True black. Saves power on an OLED phone.',
    appearance: 'dark',
    themeColor: '#000000',
    swatch: ['#000000', '#151b1a', '#35c9ac'],
  },
  {
    id: 'contrast',
    label: 'Contrast',
    hint: 'Maximum separation, no shadows. Clears WCAG AAA on body text.',
    appearance: 'light',
    themeColor: '#ffffff',
    swatch: ['#ffffff', '#eef1f1', '#005f52'],
  },
]

export const THEME_IDS = THEMES.map((theme) => theme.id)

export function themeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.includes(value as ThemeId)
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || isThemeId(value)
}

/**
 * Which theme `system` mode lands on, per OS appearance.
 *
 * With two themes "follow the OS" needed no configuration. With five it does:
 * someone who wants Paper by day and Midnight by night is asking for a pair,
 * not a toggle, and without this they would have to switch by hand twice a day.
 */
export type ThemePair = { light: ThemeId; dark: ThemeId }

export const DEFAULT_PAIR: ThemePair = { light: 'light', dark: 'dark' }

export function parsePair(raw: string | null): ThemePair {
  if (!raw) return DEFAULT_PAIR
  try {
    const parsed = JSON.parse(raw) as Partial<ThemePair>
    return {
      light: isThemeId(parsed.light) && themeMeta(parsed.light).appearance === 'light' ? parsed.light : DEFAULT_PAIR.light,
      dark: isThemeId(parsed.dark) && themeMeta(parsed.dark).appearance === 'dark' ? parsed.dark : DEFAULT_PAIR.dark,
    }
  } catch {
    return DEFAULT_PAIR
  }
}

export function resolveTheme(mode: ThemeMode, pair: ThemePair, prefersDark: boolean): ThemeId {
  if (mode !== 'system') return mode
  return prefersDark ? pair.dark : pair.light
}

/**
 * The counterpart to flip to.
 *
 * A dark theme flips to the pair's light half and back, so the header button
 * and Ctrl-palette "switch theme" stay one keystroke even for someone whose
 * two chosen themes are Paper and Midnight rather than the defaults.
 */
export function counterpart(theme: ThemeId, pair: ThemePair): ThemeId {
  const target: Appearance = themeMeta(theme).appearance === 'dark' ? 'light' : 'dark'
  const chosen = target === 'dark' ? pair.dark : pair.light
  // A pair half pointing at the theme we are leaving would make the button a
  // no-op; fall back to that appearance's default instead.
  return chosen === theme ? DEFAULT_PAIR[target] : chosen
}

/* ---------- Appearance: density, text size, motion ---------- */

export type Density = 'comfortable' | 'compact'
export type MotionPref = 'system' | 'off'

export type AppearancePrefs = {
  density: Density
  /** Multiplier on the root font size, so rem-based spacing scales with it. */
  textScale: number
  motion: MotionPref
}

export const TEXT_SCALES: { value: number; label: string }[] = [
  { value: 0.9, label: 'Small' },
  { value: 1, label: 'Default' },
  { value: 1.125, label: 'Large' },
  { value: 1.25, label: 'Largest' },
]

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  density: 'comfortable',
  textScale: 1,
  motion: 'system',
}

export function parseAppearance(raw: string | null): AppearancePrefs {
  if (!raw) return DEFAULT_APPEARANCE
  try {
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>
    const scale = Number(parsed.textScale)
    return {
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      // Clamped rather than validated against the preset list: a backup from a
      // later version with a scale we do not offer should still be honoured.
      textScale: Number.isFinite(scale) ? Math.min(1.5, Math.max(0.85, scale)) : 1,
      motion: parsed.motion === 'off' ? 'off' : 'system',
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export const THEME_KEY = 'bitkit-theme'
export const THEME_PAIR_KEY = 'bitkit-theme-pair'
export const APPEARANCE_KEY = 'bitkit-appearance'
