/**
 * Indian income-tax estimate for a resident or non-resident individual.
 *
 * Slabs, the section 87A rebate, and the standard deduction follow the
 * Income Tax Department's AY 2026-27 tables (new regime under section
 * 115BAC is the default). Health and education cess is 4%. Surcharge uses
 * the published brackets; the marginal relief that softens a surcharge
 * cliff is not computed, and the tool says so when a surcharge applies.
 *
 * This is an estimate for comparing regimes. It is not a return.
 */

export const TAX_YEAR = 'AY 2026-27'

export type AgeBand = 'below60' | 'senior' | 'super'

export type TaxInput = {
  /** Annual gross income, rupees. */
  gross: number
  salaried: boolean
  age: AgeBand
  resident: boolean
  /** Basic pay + dearness allowance. HRA exemption is computed on this. */
  basic: number
  hraReceived: number
  /** Rent paid during the year. */
  rentPaid: number
  /** Mumbai, Delhi, Kolkata, or Chennai — 50% of salary. Elsewhere 40%. */
  metro: boolean
  /** Old-regime deductions other than standard deduction and HRA (80C, 80D, …). */
  oldDeductions: number
}

export type RegimeResult = {
  standardDeduction: number
  hraExemption: number
  otherDeductions: number
  taxable: number
  /** Slab tax, before rebate. */
  slabTax: number
  rebate: number
  surcharge: number
  cess: number
  total: number
}

export type TaxComparison = {
  old: RegimeResult
  new: RegimeResult
  /** Which regime collects less. `tie` when the totals match. */
  better: 'old' | 'new' | 'tie'
}

type Band = { upto: number; rate: number }

const NEW_BANDS: Band[] = [
  { upto: 400_000, rate: 0 },
  { upto: 800_000, rate: 0.05 },
  { upto: 1_200_000, rate: 0.1 },
  { upto: 1_600_000, rate: 0.15 },
  { upto: 2_000_000, rate: 0.2 },
  { upto: 2_400_000, rate: 0.25 },
  { upto: Number.POSITIVE_INFINITY, rate: 0.3 },
]

const OLD_BANDS: Record<AgeBand, Band[]> = {
  below60: [
    { upto: 250_000, rate: 0 },
    { upto: 500_000, rate: 0.05 },
    { upto: 1_000_000, rate: 0.2 },
    { upto: Number.POSITIVE_INFINITY, rate: 0.3 },
  ],
  senior: [
    { upto: 300_000, rate: 0 },
    { upto: 500_000, rate: 0.05 },
    { upto: 1_000_000, rate: 0.2 },
    { upto: Number.POSITIVE_INFINITY, rate: 0.3 },
  ],
  super: [
    { upto: 500_000, rate: 0 },
    { upto: 1_000_000, rate: 0.2 },
    { upto: Number.POSITIVE_INFINITY, rate: 0.3 },
  ],
}

function rupee(n: number): number {
  return Math.round(n)
}

function nonNegative(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** Least of actual HRA, the metro percentage of salary, and rent minus 10% of salary. */
export function hraExemption(basic: number, hraReceived: number, rentPaid: number, metro: boolean): number {
  const salary = nonNegative(basic)
  const hra = nonNegative(hraReceived)
  const rent = nonNegative(rentPaid)
  if (!salary || !hra || !rent) return 0
  const excessRent = Math.max(0, rent - salary * 0.1)
  return Math.min(hra, salary * (metro ? 0.5 : 0.4), excessRent)
}

function slabTax(taxable: number, bands: Band[]): number {
  let tax = 0
  let prev = 0
  for (const band of bands) {
    const top = Math.min(taxable, band.upto)
    if (top > prev) tax += (top - prev) * band.rate
    prev = band.upto
    if (taxable <= band.upto) break
  }
  return tax
}

/**
 * Section 87A. Under the new regime, tax is zero up to ₹12 lakh and the
 * amount above that is capped so a rupee over the line is not a cliff.
 * The old regime does the same around ₹5 lakh, with the rebate itself
 * capped at ₹12,500.
 */
function applyRebate(
  regime: 'new' | 'old',
  taxable: number,
  tax: number,
  resident: boolean,
): { tax: number; rebate: number } {
  if (!resident || tax <= 0) return { tax, rebate: 0 }
  if (regime === 'new') {
    if (taxable <= 1_200_000) {
      const rebate = Math.min(tax, 60_000)
      return { tax: tax - rebate, rebate }
    }
    const excess = taxable - 1_200_000
    if (tax > excess) return { tax: excess, rebate: tax - excess }
    return { tax, rebate: 0 }
  }
  if (taxable <= 500_000) {
    const rebate = Math.min(tax, 12_500)
    return { tax: tax - rebate, rebate }
  }
  const excess = taxable - 500_000
  if (tax > excess && excess < 12_500) return { tax: excess, rebate: tax - excess }
  return { tax, rebate: 0 }
}

function surchargeOf(regime: 'new' | 'old', taxable: number, tax: number): number {
  if (tax <= 0) return 0
  let rate = 0
  if (regime === 'old' && taxable > 50_000_000) rate = 0.37
  else if (taxable > 20_000_000) rate = 0.25
  else if (taxable > 10_000_000) rate = 0.15
  else if (taxable > 5_000_000) rate = 0.1
  return tax * rate
}

function settle(regime: 'new' | 'old', input: TaxInput): RegimeResult {
  const gross = nonNegative(input.gross)
  const standardDeduction = input.salaried ? Math.min(gross, regime === 'new' ? 75_000 : 50_000) : 0
  const hra =
    regime === 'old' && input.salaried ? hraExemption(input.basic, input.hraReceived, input.rentPaid, input.metro) : 0
  const other =
    regime === 'old' ? Math.min(nonNegative(input.oldDeductions), Math.max(0, gross - standardDeduction - hra)) : 0
  const taxable = Math.max(0, gross - standardDeduction - hra - other)
  const bands = regime === 'new' ? NEW_BANDS : OLD_BANDS[input.age]
  const raw = slabTax(taxable, bands)
  const relieved = applyRebate(regime, taxable, raw, input.resident)
  const tax = rupee(relieved.tax)
  const rebate = rupee(relieved.rebate)
  const surcharge = rupee(surchargeOf(regime, taxable, tax))
  const cess = rupee((tax + surcharge) * 0.04)
  return {
    standardDeduction,
    hraExemption: rupee(hra),
    otherDeductions: rupee(other),
    taxable: rupee(taxable),
    slabTax: rupee(raw),
    rebate,
    surcharge,
    cess,
    total: tax + surcharge + cess,
  }
}

export function compareTax(input: TaxInput): TaxComparison {
  const old = settle('old', input)
  const next = settle('new', input)
  const better = old.total === next.total ? 'tie' : old.total < next.total ? 'old' : 'new'
  return { old, new: next, better }
}
