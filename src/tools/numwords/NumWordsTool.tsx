import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import {
  amountToWords,
  CURRENCIES,
  groupDigits,
  integerToWords,
  titleCase,
  type WordScale,
} from '../../lib/numwords'

export default function NumWordsTool() {
  const [raw, setRaw] = useState('125000.50')
  const [currencyCode, setCurrencyCode] = useState('INR')
  const [scale, setScale] = useState<WordScale>('indian')
  const [chequeStyle, setChequeStyle] = useState(true)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    const value = payload.text?.trim().replace(/[^\d.-]/g, '')
    if (value && Number.isFinite(Number(value))) setRaw(value)
  })

  const currency = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0]
  const value = Number(raw.replace(/[,\s]/g, ''))
  const valid = raw.trim() !== '' && Number.isFinite(value)

  const output = useMemo(() => {
    if (!valid) return null
    try {
      return {
        money: amountToWords(value, {
          scale,
          major: currency.major,
          minor: currency.minor,
          chequeStyle,
        }),
        plain: integerToWords(Math.trunc(value), scale),
        grouped: groupDigits(value, scale),
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not convert that number.' }
    }
  }, [value, valid, scale, currency, chequeStyle])

  const rows =
    output && !('error' in output)
      ? [
          { label: 'Amount in words', value: titleCase(output.money) },
          { label: 'Lowercase', value: output.money },
          { label: 'Whole number only', value: titleCase(output.plain) },
          { label: 'Grouped digits', value: `${currency.symbol}${output.grouped}` },
        ]
      : []

  return (
    <ToolLayout
      title="Number to words"
      lede="Spell out an amount for a cheque or an invoice, in the Indian or international scale."
    >
      <div className="split">
        <label className="field">
          <span>Amount</span>
          <input
            className="text-input mono-val"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Currency</span>
          <select
            className="text-input"
            value={currencyCode}
            onChange={(e) => {
              const next = CURRENCIES.find((c) => c.code === e.target.value)
              setCurrencyCode(e.target.value)
              if (next) setScale(next.scale)
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.major}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: '13rem' }}>
          <span>Scale</span>
          <div className="row" role="radiogroup" aria-label="Number scale">
            <button
              type="button"
              className={scale === 'indian' ? 'btn btn-primary' : 'btn'}
              aria-pressed={scale === 'indian'}
              onClick={() => setScale('indian')}
            >
              Indian — lakh, crore
            </button>
            <button
              type="button"
              className={scale === 'international' ? 'btn btn-primary' : 'btn'}
              aria-pressed={scale === 'international'}
              onClick={() => setScale('international')}
            >
              International — million
            </button>
          </div>
        </div>
        <label className="row">
          <input type="checkbox" checked={chequeStyle} onChange={(e) => setChequeStyle(e.target.checked)} />
          Add “only”, as cheques expect
        </label>
      </div>

      {!valid ? (
        <p className="status-bad">Enter a number.</p>
      ) : output && 'error' in output ? (
        <p className="status-bad">{output.error}</p>
      ) : (
        <div className="result-list">
          {rows.map((row) => (
            <div key={row.label} className="result-row" style={{ alignItems: 'flex-start' }}>
              <span className="pill">{row.label}</span>
              <span className="wrap-code" style={{ flex: 1 }}>
                {row.value}
              </span>
              <button type="button" className="btn-ghost" onClick={() => void copy(row.value, row.label)}>
                {copied === row.label ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}

      <SendTo from="numwords" text={rows[0]?.value ?? raw} />
    </ToolLayout>
  )
}
