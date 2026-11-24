import { useState } from 'react'
import { pickName } from '../../lib/playroom'
import { readoutStyle } from './shared'
import { ModeShell, NamesField, type RosterProps } from './shell'

export function ClassroomScreen({ names, roster, onRoster }: RosterProps) {
  const [seed, setSeed] = useState(1)
  const picked = pickName(names, seed)
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Names, one per line" />
          <button type="button" className="btn btn-primary" onClick={() => setSeed((current) => current + 1)}>
            Pick a name
          </button>
        </>
      }
      result={
        <>
          <h2>Classroom screen</h2>
          <p className="lede" style={readoutStyle}>
            {picked || 'Add at least one name.'}
          </p>
        </>
      }
    />
  )
}
