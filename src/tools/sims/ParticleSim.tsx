import { useEffect, useState } from 'react'
import { stepParticles } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

export function ParticleSim() {
  const count = stepParticles(48)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 40)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    ctx.fillStyle = '#10141c'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < count; i += 1) {
      const arm = i % 2 === 0 ? 70 : 118
      const speed = i % 2 === 0 ? 0.03 : -0.021
      const angle = tick * speed + (i / count) * Math.PI * 2
      ctx.fillStyle = `hsl(${(i * 37) % 360} 70% 62%)`
      ctx.beginPath()
      ctx.arc(w / 2 + Math.cos(angle) * arm, h / 2 + Math.sin(angle) * arm * 0.72, 4.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <div className="stack">
      <p>Particles: {count}. The count is conserved.</p>
      <CanvasCard width={420} height={320} draw={draw} filename="particle-life.png" label="Particle life" />
    </div>
  )
}
