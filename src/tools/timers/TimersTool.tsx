import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'

type Mode = 'countdown' | 'stopwatch' | 'pomodoro'

const MODES: { value: Mode; label: string }[] = [
  { value: 'countdown', label: 'Countdown' },
  { value: 'stopwatch', label: 'Stopwatch' },
  { value: 'pomodoro', label: 'Pomodoro' },
]

const PRESETS = [1, 3, 5, 10, 15, 25, 45, 60]

type Phase = 'focus' | 'short' | 'long'

const PHASES: Record<Phase, { label: string; minutes: number; note: string }> = {
  focus: { label: 'Focus', minutes: 25, note: 'Head down' },
  short: { label: 'Short break', minutes: 5, note: 'Stand up, look away' },
  long: { label: 'Long break', minutes: 15, note: 'Properly step away' },
}

function clock(ms: number, showMs = false): string {
  const total = Math.max(0, ms)
  const h = Math.floor(total / 3_600_000)
  const m = Math.floor((total % 3_600_000) / 60_000)
  const s = Math.floor((total % 60_000) / 1000)
  const cs = Math.floor((total % 1000) / 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  const base = h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  return showMs ? `${base}.${pad(cs)}` : base
}

/** Short chime built from oscillators, so no audio file has to ship. */
function chime(times = 2): void {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < times; i += 1) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const at = ctx.currentTime + i * 0.28
      osc.frequency.setValueAtTime(i % 2 ? 660 : 880, at)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.3)
    }
    window.setTimeout(() => void ctx.close(), times * 400 + 400)
  } catch {
    /* audio unavailable; the visual state still changes */
  }
}

export default function TimersTool() {
  const [mode, setMode] = useState<Mode>('countdown')

  // Countdown
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [remaining, setRemaining] = useState(5 * 60_000)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  // Stopwatch
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<number[]>([])

  // Pomodoro
  const [phase, setPhase] = useState<Phase>('focus')
  const [rounds, setRounds] = useState(0)

  const deadlineRef = useRef<number>(0)
  const originRef = useRef<number>(0)

  // A single interval drives whichever mode is active. Wall-clock deltas are
  // used rather than counting ticks, so a throttled background tab stays right.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      if (mode === 'stopwatch') {
        setElapsed(Date.now() - originRef.current)
        return
      }
      const left = deadlineRef.current - Date.now()
      if (left <= 0) {
        setRemaining(0)
        setRunning(false)
        setDone(true)
        chime(mode === 'pomodoro' ? 3 : 2)
        if (mode === 'pomodoro') {
          setPhase((current) => {
            if (current !== 'focus') return 'focus'
            const next = rounds + 1
            setRounds(next)
            return next % 4 === 0 ? 'long' : 'short'
          })
        }
      } else {
        setRemaining(left)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [running, mode, rounds])

  // Mirror the timer in the tab title. The original is captured rather than
  // hardcoded so it never drifts from index.html.
  const pageTitle = useRef(typeof document === 'undefined' ? '' : document.title)
  useEffect(() => {
    document.title = running
      ? `${clock(mode === 'stopwatch' ? elapsed : remaining)} — BitKit`
      : pageTitle.current
    return () => {
      document.title = pageTitle.current
    }
  }, [running, remaining, elapsed, mode])

  const startCountdown = (ms: number) => {
    deadlineRef.current = Date.now() + ms
    setRemaining(ms)
    setDone(false)
    setRunning(true)
  }

  const reset = () => {
    setRunning(false)
    setDone(false)
    if (mode === 'stopwatch') {
      setElapsed(0)
      setLaps([])
    } else if (mode === 'pomodoro') {
      setRemaining(PHASES[phase].minutes * 60_000)
    } else {
      setRemaining(minutes * 60_000 + seconds * 1000)
    }
  }

  const total = mode === 'pomodoro' ? PHASES[phase].minutes * 60_000 : minutes * 60_000 + seconds * 1000
  const progress = total ? 1 - remaining / total : 0

  return (
    <ToolLayout title="Timers" lede="Countdown, stopwatch, and Pomodoro. Runs on wall-clock time, so a background tab stays accurate.">
      <Segmented
        label="Mode"
        value={mode}
        options={MODES}
        onChange={(next) => {
          setRunning(false)
          setDone(false)
          setMode(next)
          if (next === 'pomodoro') setRemaining(PHASES[phase].minutes * 60_000)
          if (next === 'countdown') setRemaining(minutes * 60_000 + seconds * 1000)
        }}
      />

      {mode === 'pomodoro' ? (
        <div className="pill-row">
          <span className="pill">
            <strong>{PHASES[phase].label}</strong> — {PHASES[phase].note}
          </span>
          <span className="pill">{rounds} focus rounds done</span>
        </div>
      ) : null}

      <div className="timer-face" data-done={done}>
        <div
          className="timer-progress"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          aria-hidden="true"
        />
        <span className="timer-value">
          {mode === 'stopwatch' ? clock(elapsed, true) : clock(remaining)}
        </span>
      </div>

      {done ? <p className="status-ok">Time is up.</p> : null}

      {mode === 'countdown' ? (
        <>
          <div className="split">
            <label className="field">
              <span>Minutes</span>
              <input
                className="text-input"
                type="number"
                min={0}
                max={600}
                value={minutes}
                disabled={running}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value) || 0)
                  setMinutes(v)
                  setRemaining(v * 60_000 + seconds * 1000)
                }}
              />
            </label>
            <label className="field">
              <span>Seconds</span>
              <input
                className="text-input"
                type="number"
                min={0}
                max={59}
                value={seconds}
                disabled={running}
                onChange={(e) => {
                  const v = Math.min(59, Math.max(0, Number(e.target.value) || 0))
                  setSeconds(v)
                  setRemaining(minutes * 60_000 + v * 1000)
                }}
              />
            </label>
          </div>
          <div className="chip-row">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                className="chip"
                onClick={() => {
                  setMinutes(m)
                  setSeconds(0)
                  setRemaining(m * 60_000)
                  setDone(false)
                }}
              >
                {m} min
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
        {!running ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (mode === 'stopwatch') {
                originRef.current = Date.now() - elapsed
                setRunning(true)
              } else {
                startCountdown(remaining > 0 ? remaining : total)
              }
            }}
          >
            {(mode === 'stopwatch' ? elapsed : total - remaining) > 0 ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setRunning(false)}>
            Pause
          </button>
        )}
        <button type="button" className="btn" onClick={reset}>
          Reset
        </button>
        {mode === 'stopwatch' && running ? (
          <button type="button" className="btn" onClick={() => setLaps((l) => [elapsed, ...l])}>
            Lap
          </button>
        ) : null}
        {mode === 'pomodoro' ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRunning(false)
              setDone(false)
              setPhase('focus')
              setRounds(0)
              setRemaining(PHASES.focus.minutes * 60_000)
            }}
          >
            Restart cycle
          </button>
        ) : null}
      </div>

      {mode === 'stopwatch' && laps.length ? (
        <div className="result-list" style={{ marginTop: '1rem' }}>
          {laps.map((lap, i) => (
            <div key={`${lap}-${i}`} className="result-row">
              <span className="pill">Lap {laps.length - i}</span>
              <span className="mono-val" style={{ flex: 1 }}>
                {clock(lap, true)}
              </span>
              <span className="hint">+{clock(lap - (laps[i + 1] ?? 0), true)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </ToolLayout>
  )
}
