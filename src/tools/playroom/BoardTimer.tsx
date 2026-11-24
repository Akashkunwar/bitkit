import { useEffect, useState } from 'react'
import { countdownLabel, nextPlayer } from '../../lib/playroom'
import { clampCount, readoutStyle } from './shared'
import { ModeShell, NamesField, type RosterProps } from './shell'

export function BoardTimer({ names, roster, onRoster }: RosterProps) {
  const [setFor, setSetFor] = useState(30)
  const [left, setLeft] = useState(30)
  const [on, setOn] = useState(false)
  const [index, setIndex] = useState(0)
  const current = names.length ? names[((index % names.length) + names.length) % names.length] : ''

  useEffect(() => {
    if (!on) return
    if (names.length === 0) {
      setOn(false)
      return
    }
    if (left <= 0) {
      setIndex((player) => nextPlayer(names, player))
      setLeft(Math.max(1, setFor))
      return
    }
    const id = window.setInterval(() => {
      setLeft((seconds) => seconds - 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [on, left, names, setFor])

  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Players, one per line" />
          <label className="field">
            <span>Seconds per turn</span>
            <input
              className="text-input"
              type="number"
              min={1}
              max={3600}
              value={setFor}
              onChange={(event) => setSetFor(Math.max(1, clampCount(event.target.value, 3600)))}
            />
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => setOn((running) => !running)}>
              {on ? 'Pause clock' : 'Start clock'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIndex((player) => nextPlayer(names, player))
                setLeft(Math.max(1, setFor))
              }}
            >
              Next player
            </button>
          </div>
        </>
      }
      result={
        <>
          <h2>Board game timer</h2>
          <p className="lede" style={{ ...readoutStyle, fontSize: '2.2rem' }}>
            {current || 'Add a player.'}
          </p>
          <p className="lede" aria-live="polite">
            {countdownLabel(left)}
          </p>
          <ol>
            {names.map((name, player) => (
              <li key={`${name}-${player}`}>
                {name === current && player === index % names.length ? `${name} · turn` : name}
              </li>
            ))}
          </ol>
        </>
      }
    />
  )
}
