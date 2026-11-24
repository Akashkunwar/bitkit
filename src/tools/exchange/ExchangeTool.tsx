import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useI18n } from '../../lib/i18n'
import { EXCHANGE_CURRENCIES, convertAmount, inverseRate } from '../../lib/exchange'

export default function ExchangeTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [amount, setAmount] = useState('1000')
  const [from, setFrom] = useState('INR')
  const [to, setTo] = useState('USD')
  const [rate, setRate] = useState('')

  const result = useMemo(() => {
    if (from === to) return { value: Number(amount), inverse: 1, error: null as string | null }
    if (!rate.trim()) return { value: null, inverse: null, error: null }
    try {
      const value = convertAmount(Number(amount), Number(rate))
      return { value, inverse: inverseRate(Number(rate)), error: null }
    } catch (err) {
      return {
        value: null,
        inverse: null,
        error: err instanceof Error ? err.message : language === 'hi' ? 'यह बदल नहीं सका।' : 'Could not convert that.',
      }
    }
  }, [amount, from, to, rate, language])

  const money = (value: number, code: string) =>
    new Intl.NumberFormat(language === 'hi' ? 'hi-IN' : 'en', { maximumFractionDigits: 2 }).format(value) + ' ' + code

  return (
    <ToolLayout
      title="Exchange rate"
      lede="Convert an amount with a rate you type. BitKit does not look up live rates, so nothing leaves this tab."
    >
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>{L('Amount', 'राशि')}</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="field">
            <span>{L('From', 'से')}</span>
            <select className="text-input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {EXCHANGE_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{L('To', 'में')}</span>
            <select className="text-input" value={to} onChange={(e) => setTo(e.target.value)}>
              {EXCHANGE_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{L(`1 ${from} equals`, `1 ${from} बराबर`)}</span>
            <input
              inputMode="decimal"
              value={from === to ? '1' : rate}
              disabled={from === to}
              placeholder={L('Type the rate', 'दर लिखें')}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFrom(to)
              setTo(from)
              const numeric = Number(rate)
              if (numeric > 0) setRate(String(inverseRate(numeric)))
            }}
          >
            {L('Swap', 'अदल-बदल')}
          </button>
        </section>
        <aside className="panel">
          {result.error ? <p className="status-bad">{result.error}</p> : null}
          {result.value != null && !result.error ? (
            <>
              <p className="status-ok">{money(result.value, to)}</p>
              {result.inverse != null && from !== to ? (
                <p className="hint">
                  {L(
                    `1 ${to} = ${result.inverse.toFixed(6)} ${from}`,
                    `1 ${to} = ${result.inverse.toFixed(6)} ${from}`,
                  )}
                </p>
              ) : null}
            </>
          ) : (
            <p className="muted">
              {L(
                'Type the rate from your bank or card. It is not fetched.',
                'बैंक या कार्ड की दर लिखें। उसे कहीं से नहीं लाया जाता।',
              )}
            </p>
          )}
        </aside>
      </div>
    </ToolLayout>
  )
}
