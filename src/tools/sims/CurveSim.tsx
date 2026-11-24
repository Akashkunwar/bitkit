import { harmonographPoints, spirographPoints } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

export function CurveSim({ kind }: { kind: 'harmonograph' | 'spirograph' }) {
  const points = kind === 'harmonograph' ? harmonographPoints(900) : spirographPoints(900)
  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#243044'
    ctx.lineWidth = 1.25
    ctx.beginPath()
    const scale = kind === 'harmonograph' ? 130 : 42
    points.forEach((point, index) => {
      const x = width / 2 + point.x * scale
      const y = height / 2 + point.y * scale
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  return (
    <div className="stack">
      <p>{points.length} points.</p>
      <CanvasCard
        width={420}
        height={420}
        draw={draw}
        filename={kind === 'harmonograph' ? 'harmonograph.png' : 'spirograph.png'}
        label={kind === 'harmonograph' ? 'Harmonograph' : 'Spirograph'}
      />
    </div>
  )
}
