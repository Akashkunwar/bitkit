import { useEffect, useRef } from 'react'
import { targetPosition } from '../../lib/playroom'
import { stageStyle } from './shared'
import { ModeShell } from './shell'

export function CatPlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const margin = 28
    const span = Math.max(0, Math.min(canvas.width, canvas.height) - margin * 2)
    let seed = 1
    let target = targetPosition(seed, span)
    let x = margin + target.x
    let y = margin + target.y
    let frame = 0
    const tick = () => {
      const tx = margin + target.x
      const ty = margin + target.y
      x += (tx - x) * 0.045
      y += (ty - y) * 0.045
      if ((tx - x) ** 2 + (ty - y) ** 2 < 9) {
        seed += 1
        target = targetPosition(seed, span)
      }
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.strokeRect(margin, margin, span, span)
      ctx.beginPath()
      ctx.arc(x, y, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#fb7185'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff7ed'
      ctx.fill()
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <ModeShell
      controls={
        <p className="hint">
          A target moves inside the box. It is a canvas drawing for a cat to follow, with no network and no physics
          engine.
        </p>
      }
      result={
        <>
          <h2>Games for cats</h2>
          <canvas ref={canvasRef} width={360} height={280} style={stageStyle} aria-label="Moving target" />
        </>
      }
    />
  )
}
