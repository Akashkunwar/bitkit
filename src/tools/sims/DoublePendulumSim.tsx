import { useEffect, useState } from 'react'
import { stepPendulum } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

export function DoublePendulumSim() {
  const [upper, setUpper] = useState({ theta: 1.1, omega: 0 })
  const [lower, setLower] = useState({ theta: -0.7, omega: 0 })
  useEffect(() => {
    const id = window.setInterval(() => {
      setUpper((state) => stepPendulum(state.theta, state.omega, 0.02))
      setLower((state) => stepPendulum(state.theta, state.omega, 0.02))
    }, 16)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    const x0 = width / 2
    const y0 = 36
    const x1 = x0 + Math.sin(upper.theta) * 110
    const y1 = y0 + Math.cos(upper.theta) * 110
    const x2 = x1 + Math.sin(lower.theta) * 96
    const y2 = y1 + Math.cos(lower.theta) * 96
    ctx.strokeStyle = '#243044'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.fillStyle = '#c45b2d'
    for (const [x, y] of [
      [x1, y1],
      [x2, y2],
    ] as const) {
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <div className="stack">
      <p>
        Upper {upper.theta.toFixed(2)} rad, lower {lower.theta.toFixed(2)} rad. Each arm uses one pendulum step.
      </p>
      <CanvasCard width={420} height={320} draw={draw} filename="double-pendulum.png" label="Double pendulum" />
    </div>
  )
}
