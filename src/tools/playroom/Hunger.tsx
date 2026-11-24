import { useMemo, useState } from 'react'
import { simulateHunger } from '../../lib/playroom'
import { ModeShell, NamesField, type RosterProps } from './shell'

export function Hunger({ names, roster, onRoster }: RosterProps) {
  const [seed, setSeed] = useState(1)
  const order = useMemo(() => simulateHunger(names, seed), [names, seed])
  const winner = order[order.length - 1]
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Tributes, one per line" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={names.length === 0}
            onClick={() => setSeed((current) => current + 1)}
          >
            Step the games
          </button>
        </>
      }
      result={
        <>
          <h2>Hunger Games</h2>
          <p className="hint">Seed {seed}. The last name is the winner.</p>
          {names.length === 0 ? <p className="hint">Add a tribute.</p> : null}
          <ol>
            {order.map((name, index) => (
              <li key={`${name}-${index}`}>{index === order.length - 1 ? `Winner ${name}` : `Out ${name}`}</li>
            ))}
          </ol>
          {winner ? <p className="lede">{winner}</p> : null}
        </>
      }
    />
  )
}
