import { useState } from 'react'
import { COUNTRIES, toggleCountry } from '../../lib/sims'

export function CountriesSim() {
  const [selected, setSelected] = useState<string[]>([])

  return (
    <div className="stack">
      <p>This is a button list, not a geographic map.</p>
      <p className="muted">{selected.length ? selected.join(', ') : 'None selected yet.'}</p>
      <div className="row">
        {COUNTRIES.map((name) => {
          const on = selected.includes(name)
          return (
            <button
              key={name}
              type="button"
              className={on ? 'btn btn-primary' : 'btn'}
              aria-pressed={on}
              onClick={() => setSelected((current) => toggleCountry(current, name))}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
