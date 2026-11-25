import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { AIM_YAW, cmPer360, convertSensitivity, edpi } from '../../lib/aim'

const GAMES = [
  { id: 'cs2', label: 'CS2' },
  { id: 'valorant', label: 'Valorant' },
  { id: 'apex', label: 'Apex' },
  { id: 'overwatch', label: 'Overwatch' },
  { id: 'siege', label: 'Siege' },
]

export default function AimTool() {
  const [dpi, setDpi] = useState(800)
  const [sens, setSens] = useState(1)
  const [from, setFrom] = useState('cs2')
  const [to, setTo] = useState('valorant')

  const result = useMemo(() => {
    try {
      return {
        edpi: edpi(dpi, sens),
        cm: cmPer360(dpi, sens, AIM_YAW[from]),
        converted: convertSensitivity(sens, AIM_YAW[from], AIM_YAW[to]),
        error: null as string | null,
      }
    } catch (err) {
      return { edpi: 0, cm: 0, converted: 0, error: err instanceof Error ? err.message : 'Check the numbers.' }
    }
  }, [dpi, sens, from, to])

  return (
    <ToolLayout
      title="Mouse sensitivity"
      lede="eDPI, centimetres per 360, and a sensitivity that matches between two games. The yaw values are the usual ones for those games."
    >
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>DPI</span>
            <input
              className="text-input"
              type="number"
              min={1}
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Sensitivity</span>
            <input
              className="text-input"
              type="number"
              min={0.01}
              step={0.01}
              value={sens}
              onChange={(e) => setSens(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>From</span>
            <select className="text-input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {GAMES.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>To</span>
            <select className="text-input" value={to} onChange={(e) => setTo(e.target.value)}>
              {GAMES.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.label}
                </option>
              ))}
            </select>
          </label>
          {result.error ? <p className="status-bad">{result.error}</p> : null}
        </section>
        <aside className="panel">
          <p className="lede">eDPI {result.edpi.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          <p className="lede">cm/360 {result.cm.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          <p className="lede">
            Matching sensitivity {result.converted.toLocaleString(undefined, { maximumFractionDigits: 3 })}
          </p>
        </aside>
      </div>
    </ToolLayout>
  )
}
