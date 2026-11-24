import { useEffect, useState } from 'react'
import { period, stepPendulum } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

export function PendulumLab() {
  const [length, setLength] = useState(1)
  const [state, setState] = useState({ theta: 0.6, omega: 0 })
  useEffect(() => {
    const id = window.setInterval(() => setState((current) => stepPendulum(current.theta, current.omega, 0.02)), 16)
    return () => window.clearInterval(id)
  }, [])
  const seconds = period(length)

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    const x0 = width / 2
    const y0 = 24
    const arm = 50 + length * 36
    const x = x0 + Math.sin(state.theta) * arm
    const y = y0 + Math.cos(state.theta) * arm
    ctx.strokeStyle = '#243044'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.fillStyle = '#c45b2d'
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fill()
  }

  return (
    <div className="stack">
      <label className="field">
        <span>Length · {length.toFixed(2)} m</span>
        <input
          type="range"
          min={0.2}
          max={4}
          step={0.05}
          value={length}
          onChange={(event) => setLength(Number(event.target.value))}
        />
      </label>
      <p>Period {seconds.toFixed(3)} s for this length, using 9.81 m/s².</p>
      <CanvasCard width={420} height={280} draw={draw} filename="pendulum-lab.png" label="Pendulum" />
    </div>
  )
}
