import { useEffect, useRef, useState } from 'react'
import { useTheme } from './Theme'
import { THEMES, themeMeta, type ThemeId, type ThemeMode } from '../lib/theme'
import { useI18n } from '../lib/i18n'

/**
 * Header theme picker.
 *
 * Five options is past what a toggle button can carry, so this is a small
 * radiogroup popover instead. The trigger shows the live palette rather than a
 * sun or a moon: with Paper and Midnight in the list, "the opposite of now" is
 * no longer a thing a single glyph can name.
 */

export function ThemeChip({ id }: { id: ThemeId }) {
  const meta = themeMeta(id)
  return (
    <span className="theme-chip" aria-hidden="true">
      {meta.swatch.map((colour) => (
        <i key={colour} style={{ background: colour }} />
      ))}
    </span>
  )
}

/** 'system' sits at the end, after the five palettes it chooses between. */
const OPTIONS: ThemeMode[] = [...THEMES.map((theme) => theme.id), 'system']

export function ThemeMenu() {
  const { theme, mode, systemTheme, setMode } = useTheme()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const options = useRef<(HTMLButtonElement | null)[]>([])
  // A radiogroup is one tab stop, not six; arrows move within it.
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Opening lands on the current choice, so arrowing starts from where you are.
  useEffect(() => {
    if (!open) return
    const index = Math.max(0, OPTIONS.indexOf(mode))
    setActive(index)
    options.current[index]?.focus()
    // Only on open: re-running as `mode` changes would fight the arrow keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const choose = (next: ThemeMode) => {
    setMode(next)
    setOpen(false)
    trigger.current?.focus()
  }

  /** Arrows select as they move, which previews each theme against the page. */
  const move = (index: number) => {
    const next = (index + OPTIONS.length) % OPTIONS.length
    setActive(next)
    setMode(OPTIONS[next])
    options.current[next]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      move(active + 1)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      move(active - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      move(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      move(OPTIONS.length - 1)
    }
  }

  const label = mode === 'system' ? t('theme.system') : themeMeta(theme).label

  const option = (value: ThemeMode, index: number) => {
    const isSystem = value === 'system'
    const meta = isSystem ? null : themeMeta(value)
    return (
      <button
        key={value}
        type="button"
        role="radio"
        ref={(el) => {
          options.current[index] = el
        }}
        className="theme-option"
        aria-checked={mode === value}
        tabIndex={active === index ? 0 : -1}
        onClick={() => choose(value)}
      >
        <ThemeChip id={isSystem ? systemTheme : value} />
        <span className="theme-name">{isSystem ? t('theme.system') : meta?.label}</span>
        {mode === value ? (
          <span className="theme-check" aria-hidden="true">
            ✓
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <div className="theme-picker" ref={wrap}>
      <button
        type="button"
        ref={trigger}
        className="icon-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t('action.theme')} — ${label}`}
        title={`${t('action.theme')} — ${label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <ThemeChip id={theme} />
      </button>

      {open ? (
        <div className="theme-menu" role="radiogroup" aria-label={t('action.theme')} onKeyDown={onKeyDown}>
          <p className="theme-menu-head">{t('action.theme')}</p>
          {THEMES.map((entry, index) => option(entry.id, index))}
          <div className="theme-menu-foot">{option('system', OPTIONS.length - 1)}</div>
        </div>
      ) : null}
    </div>
  )
}
