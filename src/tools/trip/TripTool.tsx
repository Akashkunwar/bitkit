import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useCopied } from '../../lib/useCopied'
import { groupDigits } from '../../lib/numwords'

type Extra = { id: string; label: string; amount: number }

let extraId = 0
const nextId = () => `x${(extraId += 1)}`

export default function TripTool() {
  const [distance, setDistance] = useState(250)
  const [roundTrip, setRoundTrip] = useState(true)
  const [efficiency, setEfficiency] = useState(18)
  const [fuelPrice, setFuelPrice] = useState(105)
  const [people, setPeople] = useState(4)
  const [currency, setCurrency] = useState('₹')
  const [extras, setExtras] = useState<Extra[]>([
    { id: nextId(), label: 'Tolls', amount: 400 },
    { id: nextId(), label: 'Parking', amount: 100 },
  ])
  const { copied, copy } = useCopied()

  const totals = useMemo(() => {
    const km = distance * (roundTrip ? 2 : 1)
    const litres = efficiency > 0 ? km / efficiency : 0
    const fuel = litres * fuelPrice
    const extrasTotal = extras.reduce((sum, e) => sum + (e.amount || 0), 0)
    const total = fuel + extrasTotal
    return {
      km,
      litres,
      fuel,
      extrasTotal,
      total,
      each: people > 0 ? total / people : total,
      perKm: km > 0 ? total / km : 0,
    }
  }, [distance, roundTrip, efficiency, fuelPrice, extras, people])

  const money = (n: number) => `${currency}${groupDigits(n, currency === '₹' ? 'indian' : 'international')}`

  const summary = [
    `Trip: ${totals.km} km${roundTrip ? ' (return)' : ''}`,
    `Fuel: ${totals.litres.toFixed(1)} L = ${money(totals.fuel)}`,
    extras.filter((e) => e.amount).map((e) => `${e.label}: ${money(e.amount)}`).join('\n'),
    `Total: ${money(totals.total)}`,
    `Each (${people}): ${money(totals.each)}`,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <ToolLayout
      title="Trip cost"
      lede="Fuel, tolls, and everything else — split across everyone in the car."
    >
      <div className="split">
        <label className="field">
          <span>Distance one way — km</span>
          <input
            className="text-input"
            type="number"
            min={0}
            value={distance}
            onChange={(e) => setDistance(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="field">
          <span>Mileage — km per litre</span>
          <input
            className="text-input"
            type="number"
            min={0}
            step="0.1"
            value={efficiency}
            onChange={(e) => setEfficiency(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>

      <div className="split">
        <label className="field">
          <span>Fuel price per litre</span>
          <input
            className="text-input"
            type="number"
            min={0}
            step="0.01"
            value={fuelPrice}
            onChange={(e) => setFuelPrice(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="field">
          <span>Sharing between</span>
          <input
            className="text-input"
            type="number"
            min={1}
            value={people}
            onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <label className="row">
          <input type="checkbox" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
          Return journey — double the distance
        </label>
        <label className="field" style={{ minWidth: '7rem' }}>
          <span>Currency</span>
          <input className="text-input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </label>
      </div>

      <p className="field-label" style={{ marginTop: '1rem' }}>
        Other costs
      </p>
      <div className="result-list">
        {extras.map((extra) => (
          <div key={extra.id} className="result-row">
            <input
              className="text-input"
              style={{ flex: 1 }}
              value={extra.label}
              onChange={(e) =>
                setExtras(extras.map((x) => (x.id === extra.id ? { ...x, label: e.target.value } : x)))
              }
            />
            <input
              className="text-input"
              style={{ width: '8rem' }}
              type="number"
              min={0}
              value={extra.amount}
              onChange={(e) =>
                setExtras(
                  extras.map((x) =>
                    x.id === extra.id ? { ...x, amount: Math.max(0, Number(e.target.value) || 0) } : x,
                  ),
                )
              }
            />
            <button
              type="button"
              className="btn-ghost"
              aria-label={`Remove ${extra.label}`}
              onClick={() => setExtras(extras.filter((x) => x.id !== extra.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => setExtras([...extras, { id: nextId(), label: 'Food', amount: 0 }])}
        >
          Add cost
        </button>
      </div>

      <div className="big-answer">
        <strong>{money(totals.each)}</strong> <span>each</span>
      </div>

      <div className="pill-row">
        <span className="pill">{totals.km} km</span>
        <span className="pill">{totals.litres.toFixed(1)} litres</span>
        <span className="pill">Fuel {money(totals.fuel)}</span>
        {totals.extrasTotal ? <span className="pill">Extras {money(totals.extrasTotal)}</span> : null}
        <span className="pill">Total {money(totals.total)}</span>
        <span className="pill">{money(totals.perKm)} per km</span>
      </div>

      <div className="row" style={{ marginTop: '0.9rem' }}>
        <button type="button" className="btn btn-primary" onClick={() => void copy(summary, 'sum')}>
          {copied === 'sum' ? 'Copied' : 'Copy breakdown'}
        </button>
      </div>

      <SendTo from="trip" text={summary} />
    </ToolLayout>
  )
}
