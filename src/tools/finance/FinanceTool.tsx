import { useMemo, type ReactNode } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { NumberSlider } from '../../components/NumberSlider'
import { useToolSettings } from '../../lib/prefs'
import {
  COMPOUNDING,
  amountInWords,
  cagr,
  compound,
  discount,
  emi,
  formatMoney,
  simpleInterest,
  sip,
  type Compounding,
  type MoneyFormat,
} from '../../lib/finance'

type Mode = 'emi' | 'sip' | 'compound' | 'cagr' | 'discount'

const CURRENCIES: Record<string, MoneyFormat & { symbol: string; label: string }> = {
  INR: { locale: 'en-IN', currency: 'INR', symbol: '₹', label: '₹ Rupee' },
  USD: { locale: 'en-US', currency: 'USD', symbol: '$', label: '$ Dollar' },
  EUR: { locale: 'en-IE', currency: 'EUR', symbol: '€', label: '€ Euro' },
  GBP: { locale: 'en-GB', currency: 'GBP', symbol: '£', label: '£ Pound' },
  NONE: { locale: 'en-US', currency: null, symbol: '', label: 'No symbol' },
}

function defaultCurrency(): string {
  const lang = typeof navigator === 'undefined' ? '' : navigator.language
  return /-IN$|^hi/i.test(lang) ? 'INR' : 'USD'
}

const DEFAULTS = {
  mode: 'emi' as Mode,
  currency: defaultCurrency(),
  loan: 1_000_000,
  loanRate: 8.5,
  loanYears: 20,
  sipMonthly: 10_000,
  sipRate: 12,
  sipYears: 10,
  principal: 100_000,
  rate: 7,
  years: 5,
  frequency: 'quarterly' as Compounding,
  cagrStart: 100_000,
  cagrEnd: 200_000,
  cagrYears: 5,
  price: 2_000,
  off1: 20,
  off2: 0,
}

/** Two-part share as a ring: accent for the first value, a lighter tint for the second. */
function Donut({ a, b, labelA, labelB }: { a: number; b: number; labelA: string; labelB: string }) {
  const total = a + b
  const share = total > 0 ? a / total : 0
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <figure className="donut">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${labelA} ${Math.round(share * 100)}%, ${labelB} ${Math.round((1 - share) * 100)}%`}
      >
        <circle cx="50" cy="50" r={r} className="donut-track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="donut-value"
          strokeDasharray={`${share * c} ${c}`}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="48" textAnchor="middle" className="donut-pct">
          {Math.round(share * 100)}%
        </text>
        <text x="50" y="61" textAnchor="middle" className="donut-caption">
          {labelA.toLowerCase()}
        </text>
      </svg>
      <figcaption>
        <span className="legend-dot" data-series="a" /> {labelA}
        <span className="legend-dot" data-series="b" /> {labelB}
      </figcaption>
    </figure>
  )
}

/** Year-by-year bars: invested (base) and growth (top). */
function GrowthBars({
  rows,
  format,
}: {
  rows: { year: number; invested: number; value: number }[]
  format: (n: number) => string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  const w = 100 / rows.length
  const last = rows.at(-1)
  return (
    <figure className="growth">
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        role="img"
        aria-label={last ? `Grows to ${format(last.value)} after ${last.year} years` : 'Growth chart'}
      >
        {rows.map((row, i) => {
          const hValue = (row.value / max) * 56
          const hInvested = (Math.min(row.invested, row.value) / max) * 56
          return (
            <g key={row.year}>
              <rect
                className="bar-growth"
                x={i * w + w * 0.15}
                y={60 - hValue}
                width={w * 0.7}
                height={hValue}
                rx="0.8"
              />
              <rect
                className="bar-invested"
                x={i * w + w * 0.15}
                y={60 - hInvested}
                width={w * 0.7}
                height={hInvested}
                rx="0.8"
              />
            </g>
          )
        })}
      </svg>
      <figcaption>
        <span className="legend-dot" data-series="b" /> Invested
        <span className="legend-dot" data-series="a" /> Growth
        <span className="muted" style={{ marginLeft: 'auto' }}>
          Year 1 → {rows.length}
        </span>
      </figcaption>
    </figure>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'accent' }) {
  return (
    <div className="stat" data-tone={tone}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub ? <span className="hint">{sub}</span> : null}
    </div>
  )
}

function Layout({ inputs, results }: { inputs: ReactNode; results: ReactNode }) {
  return (
    <div className="finance-grid">
      <section className="panel">{inputs}</section>
      <section className="panel finance-results" aria-live="polite">
        {results}
      </section>
    </div>
  )
}

export default function FinanceTool() {
  const { settings: s, update } = useToolSettings('finance', DEFAULTS)
  const money = CURRENCIES[s.currency] ?? CURRENCIES.USD
  const fmt = (n: number, digits = 0) => formatMoney(n, money, digits)
  const words = (n: number) => amountInWords(n, money.locale)

  const loan = useMemo(() => {
    try {
      return emi(s.loan, s.loanRate, s.loanYears * 12)
    } catch {
      return null
    }
  }, [s.loan, s.loanRate, s.loanYears])
  const sipResult = useMemo(() => {
    try {
      return sip(s.sipMonthly, s.sipRate, s.sipYears)
    } catch {
      return null
    }
  }, [s.sipMonthly, s.sipRate, s.sipYears])
  const growth = useMemo(() => {
    try {
      return compound(s.principal, s.rate, s.years, s.frequency)
    } catch {
      return null
    }
  }, [s.principal, s.rate, s.years, s.frequency])
  const growthRate = useMemo(() => {
    try {
      return cagr(s.cagrStart, s.cagrEnd, s.cagrYears)
    } catch {
      return null
    }
  }, [s.cagrStart, s.cagrEnd, s.cagrYears])
  const sale = useMemo(() => {
    try {
      return discount(s.price, s.off1, s.off2)
    } catch {
      return null
    }
  }, [s.price, s.off1, s.off2])

  return (
    <ToolLayout
      title="Finance calculators"
      lede="Loan EMI with a yearly schedule, SIP returns, compound interest, CAGR, and stacked discounts — the numbers banks and shops quote, worked out on your device."
    >
      <div className="toolbar">
        <Segmented
          label="Calculator"
          hideLabel
          value={s.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: 'emi', label: 'Loan EMI' },
            { value: 'sip', label: 'SIP' },
            { value: 'compound', label: 'Compound interest' },
            { value: 'cagr', label: 'CAGR' },
            { value: 'discount', label: 'Discount' },
          ]}
        />
        <label className="row" style={{ gap: '0.5rem' }}>
          <span className="hint">Currency</span>
          <select className="select-inline" value={s.currency} onChange={(e) => update({ currency: e.target.value })}>
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <option key={code} value={code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {s.mode === 'emi' ? (
        <Layout
          inputs={
            <>
              <NumberSlider
                label="Loan amount"
                prefix={money.symbol}
                value={s.loan}
                onChange={(loan) => update({ loan })}
                min={10_000}
                max={20_000_000}
                step={10_000}
                typedMax={1e12}
              />
              <NumberSlider
                label="Interest rate (per year)"
                suffix="%"
                value={s.loanRate}
                onChange={(loanRate) => update({ loanRate })}
                min={0}
                max={30}
                step={0.05}
              />
              <NumberSlider
                label="Tenure"
                suffix="years"
                value={s.loanYears}
                onChange={(loanYears) => update({ loanYears })}
                min={1}
                max={30}
                typedMax={50}
              />
            </>
          }
          results={
            loan ? (
              <>
                <div className="stat-grid">
                  <Stat label="Monthly EMI" value={fmt(loan.emi)} tone="accent" />
                  <Stat label="Total interest" value={fmt(loan.totalInterest)} sub={words(loan.totalInterest)} />
                  <Stat label="Total payment" value={fmt(loan.totalPayment)} sub={words(loan.totalPayment)} />
                </div>
                <Donut a={s.loan} b={loan.totalInterest} labelA="Principal" labelB="Interest" />
                <details className="finance-schedule">
                  <summary>Year-by-year schedule</summary>
                  <div className="table-wrap">
                    <table className="simple-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th className="num">Principal</th>
                          <th className="num">Interest</th>
                          <th className="num">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loan.schedule.map((row) => (
                          <tr key={row.year}>
                            <td>{row.year}</td>
                            <td className="num">{fmt(row.principal)}</td>
                            <td className="num">{fmt(row.interest)}</td>
                            <td className="num">{fmt(row.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <p className="muted">Enter a loan amount and tenure.</p>
            )
          }
        />
      ) : null}

      {s.mode === 'sip' ? (
        <Layout
          inputs={
            <>
              <NumberSlider
                label="Monthly investment"
                prefix={money.symbol}
                value={s.sipMonthly}
                onChange={(sipMonthly) => update({ sipMonthly })}
                min={500}
                max={200_000}
                step={500}
                typedMax={1e9}
              />
              <NumberSlider
                label="Expected return (per year)"
                suffix="%"
                value={s.sipRate}
                onChange={(sipRate) => update({ sipRate })}
                min={1}
                max={30}
                step={0.5}
              />
              <NumberSlider
                label="Time period"
                suffix="years"
                value={s.sipYears}
                onChange={(sipYears) => update({ sipYears })}
                min={1}
                max={40}
                typedMax={60}
              />
              <p className="hint">
                Returns are an assumption, not a promise. Market-linked investments go down as well as up.
              </p>
            </>
          }
          results={
            sipResult ? (
              <>
                <div className="stat-grid">
                  <Stat
                    label="Estimated value"
                    value={fmt(sipResult.value)}
                    sub={words(sipResult.value)}
                    tone="accent"
                  />
                  <Stat label="You invest" value={fmt(sipResult.invested)} />
                  <Stat label="Estimated gains" value={fmt(sipResult.gains)} />
                </div>
                <GrowthBars rows={sipResult.yearly} format={(n) => fmt(n)} />
              </>
            ) : (
              <p className="muted">Enter an amount and period.</p>
            )
          }
        />
      ) : null}

      {s.mode === 'compound' ? (
        <Layout
          inputs={
            <>
              <NumberSlider
                label="Principal"
                prefix={money.symbol}
                value={s.principal}
                onChange={(principal) => update({ principal })}
                min={1000}
                max={10_000_000}
                step={1000}
                typedMax={1e12}
              />
              <NumberSlider
                label="Interest rate (per year)"
                suffix="%"
                value={s.rate}
                onChange={(rate) => update({ rate })}
                min={0}
                max={25}
                step={0.05}
              />
              <NumberSlider
                label="Time period"
                suffix="years"
                value={s.years}
                onChange={(years) => update({ years })}
                min={1}
                max={40}
                typedMax={100}
              />
              <label className="field">
                <span>Compounded</span>
                <select value={s.frequency} onChange={(e) => update({ frequency: e.target.value as Compounding })}>
                  {(Object.keys(COMPOUNDING) as Compounding[]).map((f) => (
                    <option key={f} value={f}>
                      {f[0].toUpperCase() + f.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="hint">Most Indian bank fixed deposits compound quarterly.</p>
            </>
          }
          results={
            growth ? (
              <>
                <div className="stat-grid">
                  <Stat label="Maturity value" value={fmt(growth.value)} sub={words(growth.value)} tone="accent" />
                  <Stat label="Interest earned" value={fmt(growth.gains)} />
                  <Stat
                    label="Simple interest instead"
                    value={fmt(simpleInterest(s.principal, s.rate, s.years))}
                    sub="Without compounding"
                  />
                </div>
                <GrowthBars rows={growth.yearly} format={(n) => fmt(n)} />
              </>
            ) : (
              <p className="muted">Enter an amount and period.</p>
            )
          }
        />
      ) : null}

      {s.mode === 'cagr' ? (
        <Layout
          inputs={
            <>
              <NumberSlider
                label="Starting value"
                prefix={money.symbol}
                value={s.cagrStart}
                onChange={(cagrStart) => update({ cagrStart })}
                min={1000}
                max={10_000_000}
                step={1000}
                typedMax={1e12}
              />
              <NumberSlider
                label="Ending value"
                prefix={money.symbol}
                value={s.cagrEnd}
                onChange={(cagrEnd) => update({ cagrEnd })}
                min={1000}
                max={20_000_000}
                step={1000}
                typedMax={1e12}
              />
              <NumberSlider
                label="Years"
                suffix="years"
                value={s.cagrYears}
                onChange={(cagrYears) => update({ cagrYears })}
                min={1}
                max={40}
                step={0.5}
                typedMax={100}
              />
            </>
          }
          results={
            growthRate !== null ? (
              <div className="stat-grid">
                <Stat label="CAGR" value={`${growthRate.toFixed(2)}%`} tone="accent" sub="Average yearly growth" />
                <Stat label="Total change" value={`${(((s.cagrEnd - s.cagrStart) / s.cagrStart) * 100).toFixed(1)}%`} />
                <Stat label="Multiple" value={`${(s.cagrEnd / s.cagrStart).toFixed(2)}×`} />
              </div>
            ) : (
              <p className="muted">Values and years must be above zero.</p>
            )
          }
        />
      ) : null}

      {s.mode === 'discount' ? (
        <Layout
          inputs={
            <>
              <NumberSlider
                label="Price"
                prefix={money.symbol}
                value={s.price}
                onChange={(price) => update({ price })}
                min={0}
                max={100_000}
                step={50}
                typedMax={1e12}
              />
              <NumberSlider
                label="Discount"
                suffix="%"
                value={s.off1}
                onChange={(off1) => update({ off1 })}
                min={0}
                max={100}
                step={1}
              />
              <NumberSlider
                label="Extra discount on top"
                suffix="%"
                value={s.off2}
                onChange={(off2) => update({ off2 })}
                min={0}
                max={100}
                step={1}
              />
            </>
          }
          results={
            sale ? (
              <>
                <div className="stat-grid">
                  <Stat label="You pay" value={fmt(sale.final, 2)} tone="accent" />
                  <Stat label="You save" value={fmt(sale.saved, 2)} />
                  <Stat label="Effective discount" value={`${sale.effectivePct.toFixed(1)}%`} />
                </div>
                {s.off2 > 0 ? (
                  <p className="hint">
                    {s.off1}% then {s.off2}% is {sale.effectivePct.toFixed(1)}% off in total, not {s.off1 + s.off2}% —
                    the second discount applies to the already reduced price.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="muted">Enter a price.</p>
            )
          }
        />
      ) : null}
    </ToolLayout>
  )
}
