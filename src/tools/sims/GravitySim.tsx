import { useEffect, useState } from 'react'
import { stepBodies } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

function gravitySeed() {
  return [
    { x: 0, y: 0, vx: 0, vy: 0 },
    { x: 1.6, y: 0.2, vx: 0, vy: 0.12 },
    { x: -1.4, y: -0.3, vx: 0.02, vy: -0.1 },
  ]
}

export function GravitySim() {
  const [bodies, setBodies] = useState(gravitySeed)
  useEffect(() => {
    const id = window.setInterval(() => {
      setBodies((current) => {
        const next = stepBodies(current)
        const lost = next.some((body) => !Number.isFinite(body.x) || Math.abs(body.x) > 12 || Math.abs(body.y) > 12)
        return lost ? gravitySeed() : next
      })
    }, 40)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#10141c'
    ctx.fillRect(0, 0, width, height)
    const colors = ['#f4f1ea', '#7eb6ff', '#e2b657']
    bodies.forEach((body, index) => {
      ctx.fillStyle = colors[index % colors.length]
      ctx.beginPath()
      ctx.arc(width / 2 + body.x * 36, height / 2 + body.y * 36, index === 0 ? 11 : 7, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return (
    <div className="stack">
      <p>{bodies.length} bodies. The step keeps every one of them.</p>
      <button type="button" className="btn" onClick={() => setBodies(gravitySeed())}>
        Reset
      </button>
      <CanvasCard width={420} height={420} draw={draw} filename="gravity.png" label="Gravity simulator" />
    </div>
  )
}
