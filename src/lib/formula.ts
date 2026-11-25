export type FormulaField = {
  id: string
  label: string
  placeholder?: string
  sample?: string
  area?: boolean
  /** Renders a date input. */
  date?: boolean
  options?: { value: string; label: string }[]
}

export type FormulaResult = { label: string; value: string }

export type Formula = {
  id: string
  label: string
  hint: string
  fields: FormulaField[]
  run: (raw: Record<string, string>) => FormulaResult[]
}

export function readNumber(raw: string | undefined, label: string): number {
  const n = Number(
    String(raw ?? '')
      .replace(/,/g, '')
      .trim(),
  )
  if (!Number.isFinite(n)) throw new Error(`Enter a number for ${label}.`)
  return n
}

/** Stable, readable quantity. Very small and very large values keep scientific form. */
export function formatQuantity(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if (abs !== 0 && (abs < 0.0001 || abs >= 1e9)) {
    return value.toExponential(4)
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: digits })
}

export function samplesOf(formula: Formula): Record<string, string> {
  const raw: Record<string, string> = {}
  for (const field of formula.fields) if (field.sample !== undefined) raw[field.id] = field.sample
  return raw
}
