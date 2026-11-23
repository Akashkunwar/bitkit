import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'

function format(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function ClockTool() {
  const [minutes, setMinutes] = useState(5)
  const [left, setLeft] = useState<[number, number]>([5 * 60_000, 5 * 60_000])
  const [active, setActive] = useState<0 | 1 | null>(null)
  const tick = useRef(0)

  useEffect(() => () => window.clearInterval(tick.current), [])

  useEffect(() => {
    window.clearInterval(tick.current)
    if (active == null) return
    tick.current = window.setInterval(() => {
      setLeft((current) => {
        const next: [number, number] = [...current]
        next[active] = Math.max(0, next[active] - 100)
        return next
      })
    }, 100)
    return () => window.clearInterval(tick.current)
  }, [active])

  useEffect(() => {
    if (active != null && left[active] === 0) setActive(null)
  }, [active, left])

  const apply = (value: number) => {
    const ms = Math.max(1, value) * 60_000
    setMinutes(value)
    setActive(null)
    setLeft([ms, ms])
  }

  return (
    <ToolLayout
      title="Chess clock"
      lede="Two clocks. Tap a side to stop it and start the other. The time stays in this tab."
    >
      <label className="field">
        <span>Minutes each · {minutes}</span>
        <input type="range" min={1} max={30} value={minutes} onChange={(e) => apply(Number(e.target.value))} />
      </label>
      <div className="split">
        {([0, 1] as const).map((side) => (
          <button
            key={side}
            type="button"
            className="btn btn-primary"
            style={{
              minHeight: 160,
              background: left[side] === 0 ? '#8a2b2b' : active === side ? undefined : 'var(--bg-mute)',
            }}
            onClick={() => {
              const next = side === 0 ? 1 : 0
              if (left[next] === 0) return
              setActive(next)
            }}
          >
            {side === 0 ? 'White' : 'Black'}
            <br />
            {left[side] === 0 ? 'Flag' : format(left[side])}
          </button>
        ))}
      </div>
      <button type="button" className="btn" onClick={() => apply(minutes)}>
        Reset
      </button>
    </ToolLayout>
  )
}
