import { useEffect, useState } from 'react'
import { cradleFrame } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

export function CradleSim() {
  const balls = 5
  const [tick, setTick] = useState(0)
  const frame = cradleFrame(balls, tick)
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 700)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#243044'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(40, 40)
    ctx.lineTo(width - 40, 40)
    ctx.stroke()
    frame.forEach((lifted, index) => {
      const x = 70 + index * 70
      const y = lifted ? 78 : 150
      ctx.strokeStyle = '#8a8175'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 40)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.fillStyle = lifted ? '#c45b2d' : '#d9d3c7'
      ctx.beginPath()
      ctx.arc(x, y, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#243044'
      ctx.stroke()
    })
  }

  return (
    <div className="stack">
      <p>The lifted ball switches between the two ends.</p>
      <CanvasCard width={420} height={240} draw={draw} filename="newtons-cradle.png" label="Newton's cradle" />
    </div>
  )
}
