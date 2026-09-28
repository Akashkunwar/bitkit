import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

type Option<T extends string> = { value: T; label: ReactNode; title?: string }

type Props<T extends string> = {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  /** Hide the visible label (it stays as the group's accessible name). */
  hideLabel?: boolean
  /** Stretch options to fill the row. */
  block?: boolean
}

/**
 * A single-choice control drawn as a segmented pill.
 *
 * Semantically a radiogroup: one tab stop, arrow keys move and select, which
 * is what screen-reader and keyboard users expect from a set of radios.
 */
export function Segmented<T extends string>({ label, value, options, onChange, hideLabel, block }: Props<T>) {
  const labelId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  const move = (index: number) => {
    const next = (index + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      move(selected + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(selected - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      move(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      move(options.length - 1)
    }
  }

  return (
    <div className="field">
      <span id={labelId} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
      </span>
      <div
        className={block ? 'segmented segmented-block' : 'segmented'}
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
      >
        {options.map((option, index) => (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            className="segmented-option"
            aria-checked={option.value === value}
            tabIndex={index === selected ? 0 : -1}
            title={option.title}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
