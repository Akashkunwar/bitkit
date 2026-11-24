import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'

type Mode = 'reaction' | 'lights' | 'cps' | 'breath'

const BREATHS = [
  { id: 'box', label: 'Box', phases: [4, 4, 4, 4], names: ['In', 'Hold', 'Out', 'Hold'] },
  { id: '478', label: '4-7-8', phases: [4, 7, 8], names: ['In', 'Hold', 'Out'] },
  { id: 'resonant', label: 'Resonant', phases: [5, 5], names: ['In', 'Out'] },
]

export default function PlayTool() {
  const [mode, setMode] = useState<Mode>('reaction')
  const [wait, setWait] = useState<'idle' | 'wait' | 'go' | 'done'>('idle')
  const [ms, setMs] = useState<number | null>(null)
  const started = useRef(0)
  const timer = useRef(0)
  const [clicks, setClicks] = useState(0)
  const [cpsLeft, setCpsLeft] = useState(0)
  const [breath, setBreath] = useState(BREATHS[0].id)
  const [phase, setPhase] = useState(0)
  const [left, setLeft] = useState(BREATHS[0].phases[0])
  const [lights, setLights] = useState(0)
  const [lightGo, setLightGo] = useState(false)

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearInterval(timer.current)
    },
    [],
  )

  useEffect(() => {
    if (mode !== 'breath') return
    const pattern = BREATHS.find((item) => item.id === breath) ?? BREATHS[0]
    let phaseIndex = 0
    let remaining = pattern.phases[0]
    setPhase(0)
    setLeft(remaining)
    const id = window.setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        phaseIndex = (phaseIndex + 1) % pattern.phases.length
        remaining = pattern.phases[phaseIndex]
        setPhase(phaseIndex)
      }
      setLeft(remaining)
    }, 1000)
    return () => window.clearInterval(id)
  }, [mode, breath])

  const pattern = BREATHS.find((item) => item.id === breath) ?? BREATHS[0]

  const startReaction = () => {
    setMs(null)
    setWait('wait')
    const delay = 800 + Math.random() * 2200
    timer.current = window.setTimeout(() => {
      started.current = performance.now()
      setWait('go')
    }, delay)
  }

  const tapReaction = () => {
    if (wait === 'wait') {
      window.clearTimeout(timer.current)
      setWait('idle')
      setMs(-1)
      return
    }
    if (wait !== 'go') return
    setMs(Math.round(performance.now() - started.current))
    setWait('done')
  }

  const startCps = () => {
    setClicks(0)
    setCpsLeft(5)
    const id = window.setInterval(() => {
      setCpsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(id)
          return 0
        }
        return value - 1
      })
    }, 1000)
  }

  const startLights = () => {
    setLightGo(false)
    setLights(0)
    setMs(null)
    let on = 0
    const step = window.setInterval(() => {
      on += 1
      setLights(on)
      if (on === 5) {
        window.clearInterval(step)
        timer.current = window.setTimeout(
          () => {
            started.current = performance.now()
            setLightGo(true)
          },
          400 + Math.random() * 1800,
        )
      }
    }, 280)
  }

  return (
    <ToolLayout
      title="Reflex"
      lede="Reaction time, the five lights, clicks per second, and a breathing timer. Nothing is stored."
    >
      <Segmented
        label="Drill"
        value={mode}
        options={[
          { value: 'reaction', label: 'Reaction' },
          { value: 'lights', label: 'Five lights' },
          { value: 'cps', label: 'Clicks' },
          { value: 'breath', label: 'Breathing' },
        ]}
        onChange={setMode}
      />
      {mode === 'reaction' ? (
        <button
          type="button"
          className="btn btn-primary"
          style={{
            minHeight: 160,
            width: '100%',
            background: wait === 'go' ? '#2f7d55' : undefined,
            color: wait === 'go' ? '#f7f4ea' : undefined,
          }}
          onClick={() => (wait === 'idle' || wait === 'done' ? startReaction() : tapReaction())}
        >
          {wait === 'idle'
            ? 'Start'
            : wait === 'wait'
              ? 'Wait for green'
              : wait === 'go'
                ? 'Now'
                : ms != null && ms < 0
                  ? 'Too early'
                  : `${ms} ms`}
        </button>
      ) : null}
      {mode === 'lights' ? (
        <div className="panel">
          <div className="row">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: lights >= n && !lightGo ? '#c2452d' : 'var(--bg-mute)',
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (lightGo ? setMs(Math.round(performance.now() - started.current)) : startLights())}
          >
            {lightGo ? (ms == null ? 'Lights out' : `${ms} ms`) : 'Start lights'}
          </button>
        </div>
      ) : null}
      {mode === 'cps' ? (
        <div className="panel">
          <p className="lede">
            {cpsLeft > 0
              ? `${cpsLeft}s · ${clicks} clicks`
              : clicks
                ? `${(clicks / 5).toFixed(1)} clicks per second`
                : 'Five seconds.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (cpsLeft > 0 ? setClicks((n) => n + 1) : startCps())}
          >
            {cpsLeft > 0 ? 'Click' : 'Start'}
          </button>
        </div>
      ) : null}
      {mode === 'breath' ? (
        <div className="panel">
          <Segmented
            label="Pattern"
            value={breath}
            options={BREATHS.map((item) => ({ value: item.id, label: item.label }))}
            onChange={setBreath}
          />
          <p className="lede">
            {pattern.names[phase]} · {left}s
          </p>
        </div>
      ) : null}
    </ToolLayout>
  )
}
