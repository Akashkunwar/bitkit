import { useState } from 'react'
import { trajectory } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

export function ProjectileSim() {
  const [speed, setSpeed] = useState(10)
  const [degrees, setDegrees] = useState(45)
  const angle = (degrees * Math.PI) / 180
  const { range } = trajectory(speed, angle)

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    const ground = height - 32
    ctx.strokeStyle = '#8a8175'
    ctx.beginPath()
    ctx.moveTo(20, ground)
    ctx.lineTo(width - 20, ground)
    ctx.stroke()
    ctx.strokeStyle = '#c45b2d'
    ctx.lineWidth = 2
    ctx.beginPath()
    const span = Math.max(range, 0.001)
    const flight = span / (speed * Math.max(Math.cos(angle), 0.05))
    for (let i = 0; i <= 48; i += 1) {
      const t = (flight * i) / 48
      const x = speed * Math.cos(angle) * t
      const y = speed * Math.sin(angle) * t - 0.5 * 9.81 * t * t
      const px = 24 + (x / span) * (width - 48)
      const py = ground - (Math.max(y, 0) / Math.max(span * 0.3, 1)) * (height - 64)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }

  return (
    <div className="stack">
      <div className="row">
        <label className="field">
          <span>Speed · {speed} m/s</span>
          <input
            type="range"
            min={1}
            max={40}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Angle · {degrees}°</span>
          <input
            type="range"
            min={10}
            max={80}
            value={degrees}
            onChange={(event) => setDegrees(Number(event.target.value))}
          />
        </label>
      </div>
      <p>Range {range.toFixed(2)} m.</p>
      <CanvasCard width={640} height={280} draw={draw} filename="projectile.png" label="Projectile arc" />
    </div>
  )
}
