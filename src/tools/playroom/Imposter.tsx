import { useState } from 'react'
import { assignRoles } from '../../lib/playroom'
import { ModeShell, NamesField, type RosterProps } from './shell'

export function Imposter({ names, roster, onRoster }: RosterProps) {
  const [seed, setSeed] = useState(1)
  const [roles, setRoles] = useState<{ name: string; role: 'imposter' | 'crew' }[]>([])
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Names, one per line" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={names.length === 0}
            onClick={() => {
              const next = seed + 1
              setSeed(next)
              setRoles(assignRoles(names, next))
            }}
          >
            Assign roles
          </button>
          <p className="hint">Roles are dealt on this screen only.</p>
        </>
      }
      result={
        <>
          <h2>Imposter</h2>
          {roles.length === 0 ? <p className="hint">Assign roles when the group is in the list.</p> : null}
          <ul>
            {roles.map((entry) => (
              <li key={entry.name}>
                {entry.name} · {entry.role === 'imposter' ? 'Imposter' : 'Crew'}
              </li>
            ))}
          </ul>
        </>
      }
    />
  )
}
