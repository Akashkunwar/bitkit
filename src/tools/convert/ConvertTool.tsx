import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { useCopied } from '../../lib/useCopied'
import { COMMON_ZONES, formatInZone, parseInstant, zoneOffset } from '../../lib/time'
import {
  FAMILIES,
  addTax,
  convert,
  fluidClamp,
  percentChange,
  percentOf,
  splitBill,
  whatPercent,
} from '../../lib/units'

type Mode = 'time' | 'units' | 'percent'

export default function ConvertTool() {
  const [mode, setMode] = useState<Mode>('time')
  const { copied, copy } = useCopied()

  const [timeInput, setTimeInput] = useState('')
  const [homeZone, setHomeZone] = useState(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return zone === 'Asia/Calcutta' ? 'Asia/Kolkata' : zone
  })

  const instant = useMemo(() => parseInstant(timeInput), [timeInput])

  const [familyId, setFamilyId] = useState(FAMILIES[0].id)
  const family = FAMILIES.find((f) => f.id === familyId) ?? FAMILIES[0]
  const [fromId, setFromId] = useState(family.units[0].id)
  const [toId, setToId] = useState(family.units[1]?.id ?? family.units[0].id)
  const [unitValue, setUnitValue] = useState('1')
  const [remRoot, setRemRoot] = useState('16')
  const [minPx, setMinPx] = useState('16')
  const [maxPx, setMaxPx] = useState('32')
  const [minVw, setMinVw] = useState('360')
  const [maxVw, setMaxVw] = useState('1240')

  const unitOut = useMemo(() => {
    const n = Number(unitValue)
    if (!Number.isFinite(n)) return null
    try {
      return convert(familyId, n, fromId, toId, Number(remRoot) || 16)
    } catch {
      return null
    }
  }, [familyId, unitValue, fromId, toId, remRoot])

  const clamp = useMemo(() => {
    try {
      return fluidClamp(Number(minPx), Number(maxPx), Number(minVw), Number(maxVw), Number(remRoot) || 16)
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid clamp range.'
    }
  }, [minPx, maxPx, minVw, maxVw, remRoot])

  const [pct, setPct] = useState('18')
  const [of, setOf] = useState('1000')
  const [part, setPart] = useState('180')
  const [whole, setWhole] = useState('1000')
  const [fromAmt, setFromAmt] = useState('80')
  const [toAmt, setToAmt] = useState('100')
  const [bill, setBill] = useState('2400')
  const [people, setPeople] = useState('4')
  const [tip, setTip] = useState('10')

  const money = useMemo(() => {
    const p = Number(pct)
    const o = Number(of)
    const pa = Number(part)
    const w = Number(whole)
    const fa = Number(fromAmt)
    const ta = Number(toAmt)
    const b = Number(bill)
    const n = Number(people)
    const t = Number(tip)
    try {
      return {
        of: Number.isFinite(p) && Number.isFinite(o) ? percentOf(p, o) : null,
        what: Number.isFinite(pa) && Number.isFinite(w) ? whatPercent(pa, w) : null,
        change: Number.isFinite(fa) && Number.isFinite(ta) ? percentChange(fa, ta) : null,
        tax: Number.isFinite(o) && Number.isFinite(p) ? addTax(o, p) : null,
        split: Number.isFinite(b) && Number.isFinite(n) && Number.isFinite(t) ? splitBill(b, n, t) : null,
      }
    } catch {
      return { of: null, what: null, change: null, tax: null, split: null }
    }
  }, [pct, of, part, whole, fromAmt, toAmt, bill, people, tip])

  const fmt = (n: number | null, digits = 4) =>
    n == null || !Number.isFinite(n) ? '—' : Number(n.toPrecision(digits)).toString()

  return (
    <ToolLayout
      title="Convert"
      lede="Unix time, time zones, units, type scale, percent, GST, and a bill split — all in this tab."
    >
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'time', label: 'Time' },
          { value: 'units', label: 'Units' },
          { value: 'percent', label: 'Percent' },
        ]}
        onChange={setMode}
      />

      {mode === 'time' ? (
        <div className="split">
          <section className="panel">
            <label className="field">
              <span>Unix, ISO, or any parseable date</span>
              <input
                className="text-input"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="1710000000 or 2026-03-09T12:00:00Z"
              />
            </label>
            <div className="row" style={{ marginBottom: '1rem' }}>
              <button type="button" className="btn" onClick={() => setTimeInput(String(Math.floor(Date.now() / 1000)))}>
                Now (seconds)
              </button>
              <button type="button" className="btn" onClick={() => setTimeInput(String(Date.now()))}>
                Now (ms)
              </button>
              <button type="button" className="btn-ghost" onClick={() => setTimeInput('')}>
                Live clock
              </button>
            </div>
            {instant ? (
              <div className="stat-pills">
                <button type="button" className="stat-pill" onClick={() => void copy(String(instant.unixSec), 'sec')}>
                  <span>Unix sec</span>
                  <strong>{instant.unixSec}</strong>
                  {copied === 'sec' ? <em>Copied</em> : null}
                </button>
                <button type="button" className="stat-pill" onClick={() => void copy(String(instant.unixMs), 'ms')}>
                  <span>Unix ms</span>
                  <strong>{instant.unixMs}</strong>
                  {copied === 'ms' ? <em>Copied</em> : null}
                </button>
                <button type="button" className="stat-pill" onClick={() => void copy(instant.iso, 'iso')}>
                  <span>ISO UTC</span>
                  <strong>{instant.iso}</strong>
                  {copied === 'iso' ? <em>Copied</em> : null}
                </button>
              </div>
            ) : (
              <p className="status-bad">Could not parse that instant.</p>
            )}
          </section>
          <aside className="panel">
            <label className="field">
              <span>Home zone</span>
              <select value={homeZone} onChange={(e) => setHomeZone(e.target.value)}>
                {[homeZone, ...COMMON_ZONES.filter((z) => z !== homeZone)].map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
            {instant ? (
              <table className="zone-table">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Local time</th>
                    <th>Offset</th>
                  </tr>
                </thead>
                <tbody>
                  {[homeZone, ...COMMON_ZONES.filter((z) => z !== homeZone)].map((z) => (
                    <tr key={z}>
                      <td>{z}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => void copy(formatInZone(instant.date, z), z)}
                        >
                          {formatInZone(instant.date, z)}
                          {copied === z ? ' ✓' : ''}
                        </button>
                      </td>
                      <td>{zoneOffset(instant.date, z)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <SendTo from="convert" text={instant ? `${instant.iso} · ${instant.unixSec}` : undefined} />
          </aside>
        </div>
      ) : null}

      {mode === 'units' ? (
        <div className="split">
          <section className="panel">
            <Segmented
              label="Family"
              value={familyId}
              options={FAMILIES.map((f) => ({ value: f.id, label: f.label }))}
              onChange={(id) => {
                const next = FAMILIES.find((f) => f.id === id) ?? FAMILIES[0]
                setFamilyId(id)
                setFromId(next.units[0].id)
                setToId(next.units[1]?.id ?? next.units[0].id)
              }}
            />
            <label className="field">
              <span>Value</span>
              <input className="text-input" inputMode="decimal" value={unitValue} onChange={(e) => setUnitValue(e.target.value)} />
            </label>
            <div className="row" style={{ marginBottom: '1rem' }}>
              <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                <span>From</span>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                >
                  {family.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setFromId(toId)
                  setToId(fromId)
                }}
              >
                Swap
              </button>
              <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                <span>To</span>
                <select value={toId} onChange={(e) => setToId(e.target.value)}>
                  {family.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {familyId === 'type' ? (
              <label className="field">
                <span>Root font size (px)</span>
                <input className="text-input" inputMode="decimal" value={remRoot} onChange={(e) => setRemRoot(e.target.value)} />
              </label>
            ) : null}
            <p className="status-ok" style={{ fontSize: '1.5rem', fontWeight: 650 }}>
              {unitOut == null ? '—' : `${fmt(unitOut)} ${family.units.find((u) => u.id === toId)?.label ?? ''}`}
            </p>
            <button
              type="button"
              className="btn"
              disabled={unitOut == null}
              onClick={() => unitOut != null && void copy(String(unitOut), 'unit')}
            >
              {copied === 'unit' ? 'Copied ✓' : 'Copy value'}
            </button>
          </section>
          <aside className="panel">
            <h3>Fluid clamp</h3>
            <p className="hint">CSS that scales type between two viewport widths. Uses the same root size as rem.</p>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Min px</span>
                <input className="text-input" value={minPx} onChange={(e) => setMinPx(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Max px</span>
                <input className="text-input" value={maxPx} onChange={(e) => setMaxPx(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Min vw</span>
                <input className="text-input" value={minVw} onChange={(e) => setMinVw(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Max vw</span>
                <input className="text-input" value={maxVw} onChange={(e) => setMaxVw(e.target.value)} />
              </label>
            </div>
            <textarea className="code-area" rows={3} readOnly value={clamp} />
            <button type="button" className="btn btn-primary" onClick={() => void copy(clamp, 'clamp')}>
              {copied === 'clamp' ? 'Copied ✓' : 'Copy CSS'}
            </button>
            <SendTo from="convert" text={clamp} />
          </aside>
        </div>
      ) : null}

      {mode === 'percent' ? (
        <div className="split">
          <section className="panel">
            <h3>Percent of</h3>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>%</span>
                <input className="text-input" value={pct} onChange={(e) => setPct(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Of amount</span>
                <input className="text-input" value={of} onChange={(e) => setOf(e.target.value)} />
              </label>
            </div>
            <p className="status-ok">{fmt(money.of, 6)}</p>
            <h3>What percent</h3>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Part</span>
                <input className="text-input" value={part} onChange={(e) => setPart(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Whole</span>
                <input className="text-input" value={whole} onChange={(e) => setWhole(e.target.value)} />
              </label>
            </div>
            <p className="status-ok">{money.what == null ? '—' : `${fmt(money.what)}%`}</p>
            <h3>Change</h3>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>From</span>
                <input className="text-input" value={fromAmt} onChange={(e) => setFromAmt(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>To</span>
                <input className="text-input" value={toAmt} onChange={(e) => setToAmt(e.target.value)} />
              </label>
            </div>
            <p className="status-ok">{money.change == null ? '—' : `${fmt(money.change)}%`}</p>
          </section>
          <aside className="panel">
            <h3>GST / tax</h3>
            <p className="hint">Uses the percent and amount from the left. Default 18% is a common GST rate.</p>
            {money.tax ? (
              <p className="status-ok">
                Tax {fmt(money.tax.tax)} · Total {fmt(money.tax.total)}
              </p>
            ) : (
              <p className="hint">Enter a valid amount and rate.</p>
            )}
            <h3>Split a bill</h3>
            <label className="field">
              <span>Total</span>
              <input className="text-input" value={bill} onChange={(e) => setBill(e.target.value)} />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>People</span>
                <input className="text-input" value={people} onChange={(e) => setPeople(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Tip %</span>
                <input className="text-input" value={tip} onChange={(e) => setTip(e.target.value)} />
              </label>
            </div>
            {money.split ? (
              <p className="status-ok">
                Tip {fmt(money.split.tip)} · Grand {fmt(money.split.grand)} · Each {fmt(money.split.each)}
              </p>
            ) : (
              <p className="status-bad">Need at least one person.</p>
            )}
          </aside>
        </div>
      ) : null}
    </ToolLayout>
  )
}
