import { useState } from 'react'
import { addScore } from '../../lib/playroom'
import { clampCount } from './shared'
import { ModeShell, NamesField, type RosterProps } from './shell'

export function Scoreboard({ names, roster, onRoster }: RosterProps) {
  const [scores, setScores] = useState<Record<string, number>>({})
  const [delta, setDelta] = useState(1)
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Names, one per line" />
          <button type="button" className="btn" onClick={() => setScores({})}>
            Reset scores
          </button>
          <label className="field">
            <span>Points to add</span>
            <input
              className="text-input"
              type="number"
              min={1}
              max={100}
              value={delta}
              onChange={(event) => setDelta(Math.max(1, clampCount(event.target.value, 100)))}
            />
          </label>
        </>
      }
      result={
        <>
          <h2>Scoreboard</h2>
          {names.length === 0 ? <p className="hint">Add a name to keep score.</p> : null}
          <table className="data-table">
            <tbody>
              {names.map((name, index) => (
                <tr key={`${name}-${index}`}>
                  <td>{name}</td>
                  <td>{scores[name] ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setScores((current) => addScore(current, name, delta))}
                    >
                      Add {delta}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      }
    />
  )
}
