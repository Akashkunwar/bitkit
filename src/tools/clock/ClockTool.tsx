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
  const leftRef = useRef(left)
  leftRef.current = left
  const deadline = useRef(0)

  useEffect(() => {
    if (active == null) return
    deadline.current = Date.now() + leftRef.current[active]
    const id = window.setInterval(() => {
      const remain = Math.max(0, deadline.current - Date.now())
      setLeft((current) => {
        const next: [number, number] = [...current]
        next[active] = remain
        return next
      })
      if (remain === 0) setActive(null)
    }, 200)
    return () => window.clearInterval(id)
  }, [active])

  const apply = (value: number) => {
    const ms = Math.max(1, value) * 60_000
    setMinutes(value)
    setActive(null)
    setLeft([ms, ms])
  }

  return (
    <ToolLayout
      title="Chess clock"
      lede="Two clocks. Tap a stopped side to start it. Tap the running side to pass the turn. Pause keeps the time that is left."
    >
      <label className="field">
        <span>Minutes each · {minutes}</span>
        <input type="range" min={1} max={30} value={minutes} onChange={(e) => apply(Number(e.target.value))} />
      </label>
      <div className="clock-faces">
        {([0, 1] as const).map((side) => (
          <button
            key={side}
            type="button"
            className="clock-face"
            data-side={side === 0 ? 'white' : 'black'}
            data-running={active === side ? 'true' : 'false'}
            data-flag={left[side] === 0 ? 'true' : 'false'}
            onClick={() => {
              if (left[side] === 0) return
              if (active === side) {
                const next = side === 0 ? 1 : 0
                setActive(left[next] === 0 ? null : next)
                return
              }
              setActive(side)
            }}
          >
            <small>{side === 0 ? 'White' : 'Black'}</small>
            {left[side] === 0 ? 'Flag' : format(left[side])}
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn" disabled={active == null} onClick={() => setActive(null)}>
          Pause
        </button>
        <button type="button" className="btn" onClick={() => apply(minutes)}>
          Reset
        </button>
      </div>
    </ToolLayout>
  )
}
