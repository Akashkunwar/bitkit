import { useState } from 'react'
import { assignRoles } from '../../lib/playroom'
import { ModeShell, NamesField, type RosterProps } from './shell'

export function Imposter({ names, roster, onRoster }: RosterProps) {
  const [seed, setSeed] = useState(1)
  const [roles, setRoles] = useState<{ name: string; role: 'imposter' | 'crew' }[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const current = roles[index]
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
              setIndex(0)
              setRevealed(false)
            }}
          >
            Assign roles
          </button>
          <p className="hint">Pass the device. Only the person holding it should tap Show role.</p>
        </>
      }
      result={
        <>
          <h2>Imposter</h2>
          {roles.length === 0 ? <p className="hint">Assign roles when the group is in the list.</p> : null}
          {current ? (
            <>
              <p className="lede">
                {current.name} · {index + 1} of {roles.length}
              </p>
              {revealed ? (
                <p className="status-ok">{current.role === 'imposter' ? 'Imposter' : 'Crew'}</p>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>
                  Show role
                </button>
              )}
              {revealed ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setRevealed(false)
                    setIndex((value) => value + 1)
                  }}
                >
                  {index + 1 === roles.length ? 'Done' : 'Hide and pass on'}
                </button>
              ) : null}
            </>
          ) : roles.length ? (
            <p className="hint">Everyone has seen a role. Assign again to deal a new round.</p>
          ) : null}
        </>
      }
    />
  )
}
