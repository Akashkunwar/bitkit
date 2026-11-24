import { useMemo, useState } from 'react'
import { raceStep } from '../../lib/playroom'
import { splitList } from './shared'
import { ModeShell, NamesField } from './shell'

export function Race({ label, noun, step, initial }: { label: string; noun: string; step: string; initial: string }) {
  const [text, setText] = useState(initial)
  const entrants = useMemo(() => splitList(text), [text])
  const [seed, setSeed] = useState(1)
  const order = useMemo(() => raceStep(entrants, seed), [entrants, seed])
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={text} onChange={setText} label={`${noun}, one per line`} />
          <button
            type="button"
            className="btn btn-primary"
            disabled={entrants.length === 0}
            onClick={() => setSeed((current) => current + 1)}
          >
            {step}
          </button>
        </>
      }
      result={
        <>
          <h2>{label}</h2>
          <p className="hint">
            {noun} · seed {seed}
          </p>
          <ol>
            {order.map((name, index) => (
              <li key={`${name}-${index}`}>
                {index + 1}. {name}
              </li>
            ))}
          </ol>
        </>
      }
    />
  )
}
