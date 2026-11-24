import { useState } from 'react'
import { rollNotation } from '../../lib/playroom'
import { readoutStyle } from './shared'
import { ModeShell } from './shell'

export function NotationRoll() {
  const [text, setText] = useState('2d20+3')
  const [seed, setSeed] = useState(1)
  const [result, setResult] = useState<{ rolls: number[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const roll = (notation: string) => {
    const next = seed + 1
    setSeed(next)
    setText(notation)
    try {
      setResult(rollNotation(notation, next))
      setError(null)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Could not roll that.')
    }
  }

  return (
    <ModeShell
      controls={
        <>
          <label className="field">
            <span>Dice notation</span>
            <input
              className="text-input"
              value={text}
              spellCheck={false}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => roll(text)}>
              Roll
            </button>
            <button type="button" className="btn" onClick={() => roll('2d20+3')}>
              2d20+3
            </button>
            <button type="button" className="btn" onClick={() => roll('4d6kh3')}>
              4d6kh3
            </button>
          </div>
          {error ? <p className="status-bad">{error}</p> : null}
        </>
      }
      result={
        <>
          <h2>D&D dice notation</h2>
          {result ? (
            <>
              <p className="hint">Dice that count: {result.rolls.join(', ')}</p>
              <p className="lede" style={readoutStyle}>
                {result.total}
              </p>
              <p className="hint">Seed {seed}</p>
            </>
          ) : (
            <p className="hint">Try 2d20+3 or 4d6kh3. Keep-highest keeps that many dice and adds them.</p>
          )}
        </>
      }
    />
  )
}
