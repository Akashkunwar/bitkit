import { useEffect, useMemo, useState } from 'react'
import { countdownLabel, meditationPhases } from '../../lib/playroom'
import { readoutStyle } from './shared'
import { ModeShell } from './shell'

export function Meditation() {
  const phases = useMemo(() => meditationPhases(), [])
  const [index, setIndex] = useState(0)
  const [left, setLeft] = useState(phases[0]?.seconds ?? 0)
  const [on, setOn] = useState(false)
  const phase = phases[index] ?? phases[0]

  useEffect(() => {
    if (!on || phases.length === 0) return
    if (left <= 0) {
      const next = (index + 1) % phases.length
      const seconds = phases[next]?.seconds ?? 0
      if (seconds <= 0) {
        setOn(false)
        return
      }
      setIndex(next)
      setLeft(seconds)
      return
    }
    const id = window.setInterval(() => {
      setLeft((seconds) => seconds - 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [on, left, index, phases])

  return (
    <ModeShell
      controls={
        <>
          <p className="hint">The cycle walks inhale, hold, and exhale, then starts again.</p>
          <ol>
            {phases.map((item, itemIndex) => (
              <li key={`${item.name}-${itemIndex}`}>
                {item.name} · {item.seconds}s
              </li>
            ))}
          </ol>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => setOn((running) => !running)}>
              {on ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setOn(false)
                setIndex(0)
                setLeft(phases[0]?.seconds ?? 0)
              }}
            >
              Restart cycle
            </button>
          </div>
        </>
      }
      result={
        <>
          <h2>Meditation timer</h2>
          <p className="lede" style={readoutStyle} aria-live="polite">
            {phase?.name ?? 'Breathe'}
          </p>
          <p className="lede">{countdownLabel(left)}</p>
        </>
      }
    />
  )
}
