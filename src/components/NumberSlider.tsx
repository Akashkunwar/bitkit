import { useId } from 'react'

type Props = {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  /** Shown before the number, e.g. a currency symbol. */
  prefix?: string
  /** Shown after the number, e.g. "%" or "years". */
  suffix?: string
  /** The slider's range can be narrower than what may be typed. */
  typedMax?: number
}

/**
 * A number you can type exactly or drag roughly. The slider is clamped to a
 * friendly range; typing may go past it (up to `typedMax`), and the slider
 * then pins to its end instead of rejecting the value.
 */
export function NumberSlider({ label, value, onChange, min, max, step = 1, prefix, suffix, typedMax }: Props) {
  const id = useId()
  const limit = typedMax ?? max
  return (
    <div className="field number-slider">
      <div className="number-slider-head">
        <label htmlFor={id}>{label}</label>
        <div className="number-slider-input">
          {prefix ? <span aria-hidden="true">{prefix}</span> : null}
          <input
            id={id}
            type="number"
            inputMode="decimal"
            value={Number.isFinite(value) ? value : ''}
            min={min}
            max={limit}
            step={step}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (e.target.value === '') onChange(0)
              else if (Number.isFinite(next)) onChange(Math.min(limit, next))
            }}
          />
          {suffix ? <span aria-hidden="true">{suffix}</span> : null}
        </div>
      </div>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
