import { useEffect, useState } from 'react'
import { countdownLabel } from '../../lib/playroom'
import { clampCount, readoutStyle } from './shared'
import { ModeShell } from './shell'

export function ClassroomCountdown() {
  const [setFor, setSetFor] = useState(65)
  const [left, setLeft] = useState(65)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!on) return
    if (left <= 0) {
      setOn(false)
      return
    }
    const id = window.setInterval(() => {
      setLeft((seconds) => (seconds <= 0 ? 0 : seconds - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [on, left])

  return (
    <ModeShell
      controls={
        <>
          <label className="field">
            <span>Seconds</span>
            <input
              className="text-input"
              type="number"
              min={0}
              max={86400}
              value={setFor}
              onChange={(event) => {
                const next = clampCount(event.target.value, 86400)
                setSetFor(next)
                if (!on) setLeft(next)
              }}
            />
          </label>
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!on && left <= 0) setLeft(setFor)
                setOn((running) => !running)
              }}
            >
              {on ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setOn(false)
                setLeft(setFor)
              }}
            >
              Reset
            </button>
          </div>
        </>
      }
      result={
        <>
          <h2>Classroom countdown</h2>
          <p className="lede" style={readoutStyle} aria-live="polite">
            {countdownLabel(left)}
          </p>
          <p className="hint">{left <= 0 ? 'Time is up.' : on ? 'Counting down.' : 'Press start to run the clock.'}</p>
        </>
      }
    />
  )
}
