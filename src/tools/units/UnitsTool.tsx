import { useMemo, useState, type CSSProperties } from 'react'
import {
  ArrowDownUp,
  Check,
  Clock,
  Copy,
  Database,
  Droplet,
  Flame,
  Fuel,
  Gauge,
  HardDrive,
  Move3d,
  Radio,
  Ruler,
  Search,
  Square,
  Thermometer,
  Weight,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToolSettings } from '../../lib/prefs'
import { useCopied } from '../../lib/useCopied'
import { tryCalculate } from '../../lib/calc'
import { CATEGORIES, convertUnit, formatSig, getCategory, searchUnits } from '../../lib/unitConvert'

const ICONS: Record<string, LucideIcon> = {
  length: Ruler,
  area: Square,
  volume: Droplet,
  mass: Weight,
  temperature: Thermometer,
  speed: Gauge,
  time: Clock,
  data: HardDrive,
  datarate: Wifi,
  pressure: Database,
  energy: Flame,
  power: Zap,
  angle: Move3d,
  frequency: Radio,
  force: ArrowDownUp,
  fuel: Fuel,
}

const DEFAULTS = {
  category: 'length',
  from: 'cm',
  to: 'in',
  value: '1',
  digits: 8,
}

export default function UnitsTool() {
  const { settings, update } = useToolSettings('units', DEFAULTS)
  const [query, setQuery] = useState('')
  const { copied, copy } = useCopied(1400)
  const category = getCategory(settings.category)
  const fromId = category.units.some((u) => u.id === settings.from) ? settings.from : category.defaults[0]
  const toId = category.units.some((u) => u.id === settings.to) ? settings.to : category.defaults[1]

  // The value field accepts arithmetic too: "5 ft + 3" is not units, but "12*2.5" is fine.
  const value = useMemo(() => tryCalculate(settings.value.replace(/,/g, '')), [settings.value])
  const result = value === null ? null : convertUnit(category.id, value, fromId, toId)
  const matches = useMemo(() => searchUnits(query).slice(0, 8), [query])

  const pickCategory = (id: string) => {
    const next = getCategory(id)
    update({ category: id, from: next.defaults[0], to: next.defaults[1] })
  }

  const fromUnit = category.units.find((u) => u.id === fromId)!
  const toUnit = category.units.find((u) => u.id === toId)!

  return (
    <ToolLayout
      title="Unit converter"
      lede="Length, weight, temperature, area, volume, speed, data, pressure, energy, fuel economy and more — with every unit in the category shown at once."
    >
      <div className="units-search">
        <div className="finder-input">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            aria-label="Find a unit"
            placeholder="Find a unit — psi, gaj, tola, kWh, mpg…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {query && matches.length ? (
          <ul className="units-matches" aria-label="Matching units">
            {matches.map(({ category: c, unit }) => (
              <li key={`${c.id}-${unit.id}`}>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    const other = unit.id === c.defaults[0] ? c.defaults[1] : c.defaults[0]
                    update({ category: c.id, from: unit.id, to: other })
                    setQuery('')
                  }}
                >
                  <strong>{unit.symbol}</strong> {unit.label} <span className="muted">· {c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : query ? (
          <p className="hint">No unit called “{query}”.</p>
        ) : null}
      </div>

      <div className="units-categories" role="group" aria-label="Quantity">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c.id] ?? Ruler
          return (
            <button
              key={c.id}
              type="button"
              className={c.id === category.id ? 'filter-pill is-on' : 'filter-pill'}
              aria-pressed={c.id === category.id}
              onClick={() => pickCategory(c.id)}
              style={{ '--cat': 'var(--cat-daily)' } as CSSProperties}
            >
              <Icon size={15} aria-hidden="true" />
              {c.label}
            </button>
          )
        })}
      </div>

      <section className="panel units-main" aria-label={`${category.label} converter`}>
        <div className="units-row">
          <label className="field units-field">
            <span>From</span>
            <input
              className="units-value"
              inputMode="decimal"
              value={settings.value}
              aria-invalid={value === null && settings.value.trim() !== ''}
              onChange={(e) => update({ value: e.target.value })}
            />
            <select value={fromId} aria-label="From unit" onChange={(e) => update({ from: e.target.value })}>
              {category.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label} ({u.symbol})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="icon-btn units-swap"
            aria-label="Swap units"
            title="Swap"
            onClick={() =>
              update({
                from: toId,
                to: fromId,
                value: result === null ? settings.value : formatSig(result, settings.digits).replace(/,/g, ''),
              })
            }
          >
            <ArrowDownUp size={18} aria-hidden="true" />
          </button>

          <div className="field units-field">
            <span id="units-to-label">To</span>
            <output className="units-value units-output" aria-labelledby="units-to-label">
              {result === null ? '—' : formatSig(result, settings.digits)}
            </output>
            <select value={toId} aria-label="To unit" onChange={(e) => update({ to: e.target.value })}>
              {category.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="units-sentence">
          {result === null ? (
            <span className="muted">Type a number to convert.</span>
          ) : (
            <>
              <span>
                {formatSig(value!, settings.digits)} {fromUnit.symbol} ={' '}
                <strong>
                  {formatSig(result, settings.digits)} {toUnit.symbol}
                </strong>
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void copy(formatSig(result, settings.digits).replace(/,/g, ''))}
              >
                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </>
          )}
        </div>
        {category.note ? <p className="hint">{category.note}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>
            {value === null ? 'All units' : `${formatSig(value, settings.digits)} ${fromUnit.symbol} in every unit`}
          </h2>
          <label className="row" style={{ gap: '0.5rem' }}>
            <span className="hint">Precision</span>
            <select
              className="select-inline"
              value={settings.digits}
              onChange={(e) => update({ digits: Number(e.target.value) })}
            >
              {[4, 6, 8, 10, 12].map((d) => (
                <option key={d} value={d}>
                  {d} digits
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table className="simple-table units-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th className="num">Value</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {category.units.map((unit) => {
                const converted = value === null ? null : convertUnit(category.id, value, fromId, unit.id)
                return (
                  <tr key={unit.id} data-active={unit.id === toId}>
                    <td>
                      {unit.label} <span className="muted">({unit.symbol})</span>
                    </td>
                    <td className="num tabular">{converted === null ? '—' : formatSig(converted, settings.digits)}</td>
                    <td className="num">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => update({ to: unit.id })}
                        disabled={unit.id === toId}
                      >
                        {unit.id === toId ? 'Showing' : 'Show'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </ToolLayout>
  )
}
