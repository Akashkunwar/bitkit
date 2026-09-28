/**
 * Loan and savings maths. Conventions follow what Indian and US bank
 * calculators use, so answers match what people will be quoted:
 * - EMI: reducing balance, monthly rest, rate = annual / 12.
 * - SIP: contributions at the start of each month (annuity due), returns
 *   compounded monthly at annual / 12 — the formula AMFI calculators use.
 * - Compound interest: A = P (1 + r / n)^(n t).
 */

export type EmiResult = {
  emi: number
  totalInterest: number
  totalPayment: number
  /** One row per year: principal and interest paid in it, and the balance left. */
  schedule: { year: number; principal: number; interest: number; balance: number }[]
}

export function emi(principal: number, annualRatePct: number, months: number): EmiResult {
  if (!(principal > 0) || !(months > 0)) throw new Error('Enter a loan amount and a tenure above zero.')
  if (annualRatePct < 0) throw new Error('The interest rate cannot be negative.')
  const n = Math.round(months)
  const r = annualRatePct / 12 / 100
  const payment = r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1)

  const schedule: EmiResult['schedule'] = []
  let balance = principal
  let yearPrincipal = 0
  let yearInterest = 0
  for (let month = 1; month <= n; month += 1) {
    const interest = balance * r
    // The last instalment clears any rounding remainder.
    const towardsPrincipal = month === n ? balance : payment - interest
    balance = Math.max(0, balance - towardsPrincipal)
    yearPrincipal += towardsPrincipal
    yearInterest += interest
    if (month % 12 === 0 || month === n) {
      schedule.push({ year: Math.ceil(month / 12), principal: yearPrincipal, interest: yearInterest, balance })
      yearPrincipal = 0
      yearInterest = 0
    }
  }
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0)
  return { emi: payment, totalInterest, totalPayment: principal + totalInterest, schedule }
}

export type GrowthResult = {
  invested: number
  value: number
  gains: number
  /** Year-end invested amount and value, for a growth chart. */
  yearly: { year: number; invested: number; value: number }[]
}

export function sip(monthly: number, annualReturnPct: number, years: number): GrowthResult {
  if (!(monthly > 0) || !(years > 0)) throw new Error('Enter a monthly amount and a period above zero.')
  const i = annualReturnPct / 12 / 100
  const months = Math.round(years * 12)
  let value = 0
  const yearly: GrowthResult['yearly'] = []
  for (let m = 1; m <= months; m += 1) {
    value = (value + monthly) * (1 + i)
    if (m % 12 === 0 || m === months) yearly.push({ year: Math.ceil(m / 12), invested: monthly * m, value })
  }
  const invested = monthly * months
  return { invested, value, gains: value - invested, yearly }
}

export const COMPOUNDING = { yearly: 1, 'half-yearly': 2, quarterly: 4, monthly: 12, daily: 365 } as const
export type Compounding = keyof typeof COMPOUNDING

export function compound(
  principal: number,
  annualRatePct: number,
  years: number,
  frequency: Compounding = 'yearly',
): GrowthResult {
  if (!(principal > 0) || !(years > 0)) throw new Error('Enter an amount and a period above zero.')
  const n = COMPOUNDING[frequency]
  const r = annualRatePct / 100
  const at = (t: number) => principal * (1 + r / n) ** (n * t)
  const yearly: GrowthResult['yearly'] = []
  for (let y = 1; y <= Math.ceil(years); y += 1) {
    const t = Math.min(y, years)
    yearly.push({ year: y, invested: principal, value: at(t) })
  }
  const value = at(years)
  return { invested: principal, value, gains: value - principal, yearly }
}

export function simpleInterest(principal: number, annualRatePct: number, years: number): number {
  return (principal * annualRatePct * years) / 100
}

/** Compound annual growth rate, as a percentage. */
export function cagr(start: number, end: number, years: number): number {
  if (!(start > 0) || !(end > 0) || !(years > 0)) throw new Error('Values and years must be above zero.')
  return ((end / start) ** (1 / years) - 1) * 100
}

export type DiscountResult = { final: number; saved: number; effectivePct: number }

/** Stacked discounts apply one after another: 20% then 10% is 28% off, not 30%. */
export function discount(price: number, firstPct: number, secondPct = 0): DiscountResult {
  if (!(price >= 0)) throw new Error('Enter a price.')
  const final = price * (1 - firstPct / 100) * (1 - secondPct / 100)
  const saved = price - final
  return { final, saved, effectivePct: price ? (saved / price) * 100 : 0 }
}

export type MoneyFormat = { locale: string; currency: string | null }

/** Currency display, with lakh/crore grouping when the locale is en-IN. */
export function formatMoney(value: number, format: MoneyFormat, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—'
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }
  if (format.currency) {
    options.style = 'currency'
    options.currency = format.currency
  }
  return new Intl.NumberFormat(format.locale, options).format(value)
}

/** "12.5 lakh", "3.2 crore", "1.4 million" — how people say big amounts. */
export function amountInWords(value: number, locale: string): string {
  const abs = Math.abs(value)
  const trim = (n: number) => Number(n.toFixed(2)).toString()
  if (locale === 'en-IN') {
    if (abs >= 1e7) return `${trim(value / 1e7)} crore`
    if (abs >= 1e5) return `${trim(value / 1e5)} lakh`
    return ''
  }
  if (abs >= 1e9) return `${trim(value / 1e9)} billion`
  if (abs >= 1e6) return `${trim(value / 1e6)} million`
  return ''
}
