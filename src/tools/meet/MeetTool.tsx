import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useCopied } from '../../lib/useCopied'
import {
  buildGrid,
  COMMON_ZONES,
  DEFAULT_WINDOW,
  findOverlaps,
  formatHour,
  localZone,
  zoneLabel,
} from '../../lib/meeting'

export default function MeetTool() {
  const home = localZone()
  const [reference, setReference] = useState(home)
  const [zones, setZones] = useState<string[]>(() => {
    const seed = [home, 'Europe/London', 'America/New_York']
    return [...new Set(seed)]
  })
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [windowStart, setWindowStart] = useState(DEFAULT_WINDOW.start)
  const [windowEnd, setWindowEnd] = useState(DEFAULT_WINDOW.end)
  const { copied, copy } = useCopied()

  const date = useMemo(() => {
    const [y, m, d] = day.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }, [day])

  const rows = useMemo(
    () => buildGrid(zones, reference, date, { start: windowStart, end: windowEnd }),
    [zones, reference, date, windowStart, windowEnd],
  )
  const overlaps = useMemo(() => findOverlaps(rows), [rows])
  const best = overlaps[0]

  const addZone = (zone: string) => {
    if (!zone || zones.includes(zone)) return
    setZones([...zones, zone])
  }

  const summary = best
    ? `Best overlap on ${day}: ${formatHour(best.startHour)}–${formatHour(best.endHour)} ${zoneLabel(reference)} time (${best.count}h).\n` +
      rows
        .map((row) => `${row.label}: ${formatHour(row.hours[best.startHour].hour)}–${formatHour(row.hours[best.endHour - 1].hour + 1)}`)
        .join('\n')
    : 'No window where every location is inside working hours.'

  return (
    <ToolLayout
      title="Meeting planner"
      lede="Line up working hours across time zones and find the overlap. Uses your browser's own zone data."
    >
      <div className="split">
        <label className="field">
          <span>Date</span>
          <input className="text-input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label className="field">
          <span>Reference zone — the columns below</span>
          <select className="text-input" value={reference} onChange={(e) => setReference(e.target.value)}>
            {[...new Set([home, ...zones, ...COMMON_ZONES])].map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="split">
        <label className="field">
          <span>Working hours start — {formatHour(windowStart)}</span>
          <input
            type="range"
            min={0}
            max={23}
            value={windowStart}
            onChange={(e) => setWindowStart(Math.min(Number(e.target.value), windowEnd - 1))}
          />
        </label>
        <label className="field">
          <span>Working hours end — {formatHour(windowEnd)}</span>
          <input
            type="range"
            min={1}
            max={24}
            value={windowEnd}
            onChange={(e) => setWindowEnd(Math.max(Number(e.target.value), windowStart + 1))}
          />
        </label>
      </div>

      <label className="field">
        <span>Add a location</span>
        <select
          className="text-input"
          value=""
          onChange={(e) => {
            addZone(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="">Choose a time zone…</option>
          {COMMON_ZONES.filter((z) => !zones.includes(z)).map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>

      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="data-table zone-grid">
          <thead>
            <tr>
              <th>Location</th>
              {Array.from({ length: 24 }, (_, i) => (
                <th key={i} className="zone-hour-head">
                  {String(i).padStart(2, '0')}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.zone}>
                <td>
                  <strong>{row.label}</strong>
                  <div className="hint">{row.offsetLabel}</div>
                </td>
                {row.hours.map((hour, i) => (
                  <td
                    key={i}
                    className="zone-hour"
                    data-ok={hour.withinHours}
                    data-best={Boolean(best && i >= best.startHour && i < best.endHour)}
                    title={`${row.label} ${formatHour(hour.hour)}${hour.dayShift ? (hour.dayShift > 0 ? ' next day' : ' previous day') : ''}`}
                  >
                    {hour.hour}
                    {hour.dayShift ? <sup>{hour.dayShift > 0 ? '+' : '−'}</sup> : null}
                  </td>
                ))}
                <td>
                  {row.zone === reference ? null : (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setZones(zones.filter((z) => z !== row.zone))}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {best ? (
        <p className="status-ok" style={{ marginTop: '0.8rem' }}>
          Best overlap: {formatHour(best.startHour)}–{formatHour(best.endHour)} in {zoneLabel(reference)} ({best.count}{' '}
          hour{best.count === 1 ? '' : 's'}).
        </p>
      ) : (
        <p className="status-bad" style={{ marginTop: '0.8rem' }}>
          No hour works for everyone. Widen the working window or drop a location.
        </p>
      )}

      <div className="row" style={{ marginTop: '0.8rem' }}>
        <button type="button" className="btn btn-primary" onClick={() => void copy(summary, 'sum')}>
          {copied === 'sum' ? 'Copied' : 'Copy summary'}
        </button>
      </div>

      <SendTo from="meet" text={summary} />
    </ToolLayout>
  )
}
