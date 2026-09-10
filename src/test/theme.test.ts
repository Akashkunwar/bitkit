import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_APPEARANCE,
  DEFAULT_PAIR,
  THEMES,
  TEXT_SCALES,
  counterpart,
  isThemeMode,
  parseAppearance,
  parsePair,
  resolveTheme,
  themeMeta,
} from '../lib/theme'

const tokens = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

/** The `--bg` a theme block declares, so the metadata cannot drift from the CSS. */
function declaredBackground(id: string): string {
  const block =
    id === 'light'
      ? tokens.slice(tokens.indexOf(':root {'), tokens.indexOf('[data-theme="dark"]'))
      : tokens.slice(tokens.indexOf(`[data-theme="${id}"]`))
  return block.match(/--bg:\s*(#[0-9a-f]{3,8})/i)?.[1].toLowerCase() ?? ''
}

describe('themes', () => {
  it('ships five themes with unique ids', () => {
    expect(THEMES).toHaveLength(5)
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(5)
  })

  it('offers both appearances, so a system pair always has something to pick', () => {
    expect(THEMES.some((t) => t.appearance === 'light')).toBe(true)
    expect(THEMES.some((t) => t.appearance === 'dark')).toBe(true)
  })

  // The browser chrome sits directly against the page; a stale hex here shows
  // up as a seam at the top of an installed PWA, which is easy to miss by eye.
  it('keeps every themeColor equal to the --bg its CSS block declares', () => {
    for (const theme of THEMES) {
      expect(`${theme.id}:${theme.themeColor.toLowerCase()}`).toBe(`${theme.id}:${declaredBackground(theme.id)}`)
    }
  })

  it('gives each theme a swatch and a hint', () => {
    for (const theme of THEMES) {
      expect(theme.swatch).toHaveLength(3)
      expect(theme.hint.length).toBeGreaterThan(10)
    }
  })
})

describe('mode resolution', () => {
  it('uses the chosen theme when the mode is explicit', () => {
    expect(resolveTheme('paper', DEFAULT_PAIR, true)).toBe('paper')
    expect(resolveTheme('midnight', DEFAULT_PAIR, false)).toBe('midnight')
  })

  it('follows the OS through the pair when the mode is system', () => {
    const pair = { light: 'paper', dark: 'midnight' } as const
    expect(resolveTheme('system', pair, false)).toBe('paper')
    expect(resolveTheme('system', pair, true)).toBe('midnight')
  })

  it('still accepts a bare light or dark stored before this shipped', () => {
    expect(isThemeMode('light')).toBe(true)
    expect(isThemeMode('dark')).toBe(true)
    expect(isThemeMode('system')).toBe(true)
    expect(isThemeMode('solarized')).toBe(false)
    expect(isThemeMode(null)).toBe(false)
  })
})

describe('pair parsing', () => {
  it('defaults when there is nothing stored', () => {
    expect(parsePair(null)).toEqual(DEFAULT_PAIR)
    expect(parsePair('not json')).toEqual(DEFAULT_PAIR)
  })

  it('refuses a dark theme in the light slot', () => {
    expect(parsePair(JSON.stringify({ light: 'midnight', dark: 'midnight' }))).toEqual({
      light: 'light',
      dark: 'midnight',
    })
  })

  it('keeps a valid pair', () => {
    expect(parsePair(JSON.stringify({ light: 'contrast', dark: 'midnight' }))).toEqual({
      light: 'contrast',
      dark: 'midnight',
    })
  })
})

describe('counterpart', () => {
  it('flips appearance', () => {
    expect(themeMeta(counterpart('light', DEFAULT_PAIR)).appearance).toBe('dark')
    expect(themeMeta(counterpart('midnight', DEFAULT_PAIR)).appearance).toBe('light')
  })

  it('honours the chosen pair', () => {
    const pair = { light: 'paper', dark: 'midnight' } as const
    expect(counterpart('paper', pair)).toBe('midnight')
    expect(counterpart('midnight', pair)).toBe('paper')
  })

  // A pair half pointing at the theme already on screen would make the header
  // button and the palette action do nothing at all.
  it('never returns the theme it was given', () => {
    const pair = { light: 'contrast', dark: 'dark' } as const
    expect(counterpart('contrast', pair)).not.toBe('contrast')
    for (const theme of THEMES) expect(counterpart(theme.id, DEFAULT_PAIR)).not.toBe(theme.id)
  })
})

describe('appearance preferences', () => {
  it('defaults on junk', () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE)
    expect(parseAppearance('{')).toEqual(DEFAULT_APPEARANCE)
  })

  it('clamps a text scale rather than dropping it', () => {
    expect(parseAppearance(JSON.stringify({ textScale: 9 })).textScale).toBe(1.5)
    expect(parseAppearance(JSON.stringify({ textScale: 0.1 })).textScale).toBe(0.85)
    expect(parseAppearance(JSON.stringify({ textScale: 'big' })).textScale).toBe(1)
  })

  it('round-trips the values the UI can set', () => {
    const stored = JSON.stringify({ density: 'compact', textScale: 1.125, motion: 'off' })
    expect(parseAppearance(stored)).toEqual({ density: 'compact', textScale: 1.125, motion: 'off' })
  })

  it('offers text scales that include the untouched default', () => {
    expect(TEXT_SCALES.map((entry) => entry.value)).toContain(1)
  })
})
