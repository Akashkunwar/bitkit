import { useMemo, useState } from 'react'
import { parseTimeline } from '../../lib/sims'

export function TimelineSim() {
  const [text, setText] = useState('[{"lat":1,"lng":2,"time":"t"}]')
  const parsed = useMemo(() => {
    try {
      return { points: parseTimeline(text), error: null as string | null }
    } catch (err) {
      return {
        points: [] as { lat: number; lng: number; time: string }[],
        error: err instanceof Error ? err.message : 'Invalid timeline.',
      }
    }
  }, [text])

  return (
    <div className="stack">
      <p>This does not fetch maps.</p>
      <label className="field">
        <span>Points as JSON</span>
        <textarea className="code-area" rows={6} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      {parsed.error ? <p className="status-bad">{parsed.error}</p> : null}
      {parsed.error ? null : (
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Time</th>
                <th className="num">Latitude</th>
                <th className="num">Longitude</th>
              </tr>
            </thead>
            <tbody>
              {parsed.points.length ? (
                parsed.points.map((point, index) => (
                  <tr key={`${point.time}-${index}`}>
                    <td>{point.time}</td>
                    <td className="num">{point.lat}</td>
                    <td className="num">{point.lng}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>No points in this timeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
