import { useEffect, useState } from 'react'
import { planetAngle } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

const PLANETS = [
  { name: 'Mercury', color: '#b7aea6', orbit: 36 },
  { name: 'Venus', color: '#e6c27a', orbit: 54 },
  { name: 'Earth', color: '#4c8dff', orbit: 72 },
  { name: 'Mars', color: '#d46a4c', orbit: 92 },
  { name: 'Jupiter', color: '#d9b48f', orbit: 118 },
  { name: 'Saturn', color: '#e3d2a4', orbit: 146 },
]

export function SolarSim() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 40)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    const cx = width / 2
    const cy = height / 2
    ctx.fillStyle = '#10141c'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#e2b657'
    ctx.beginPath()
    ctx.arc(cx, cy, 12, 0, Math.PI * 2)
    ctx.fill()
    PLANETS.forEach((planet, index) => {
      const angle = planetAngle(index, tick)
      ctx.strokeStyle = 'rgba(244, 241, 234, 0.25)'
      ctx.beginPath()
      ctx.arc(cx, cy, planet.orbit, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = planet.color
      ctx.beginPath()
      ctx.arc(cx + Math.cos(angle) * planet.orbit, cy + Math.sin(angle) * planet.orbit, 6, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return (
    <div className="stack">
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th className="num">Angle (rad)</th>
            </tr>
          </thead>
          <tbody>
            {PLANETS.map((planet, index) => (
              <tr key={planet.name}>
                <td>{planet.name}</td>
                <td className="num">{planetAngle(index, tick).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CanvasCard width={420} height={420} draw={draw} filename="solar-system.png" label="Solar system" />
    </div>
  )
}
