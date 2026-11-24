import { useEffect, useRef, useState } from 'react'
import { rollNotation } from '../../lib/playroom'
import { stageStyle } from './shared'
import { ModeShell } from './shell'

const DIE_VERTS: [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
]

const DIE_FACES = [
  [0, 1, 2, 3],
  [4, 7, 6, 5],
  [0, 4, 5, 1],
  [3, 2, 6, 7],
  [0, 3, 7, 4],
  [1, 5, 6, 2],
]

function drawDie(ctx: CanvasRenderingContext2D, width: number, height: number, angle: number, value: string) {
  const ay = angle
  const ax = angle * 0.65
  const cosY = Math.cos(ay)
  const sinY = Math.sin(ay)
  const cosX = Math.cos(ax)
  const sinX = Math.sin(ax)
  const projected = DIE_VERTS.map(([x, y, z]) => {
    const x1 = x * cosY - z * sinY
    const z1 = x * sinY + z * cosY
    const y2 = y * cosX - z1 * sinX
    const z2 = y * sinX + z1 * cosX
    const perspective = 2.8 / (4 - z2)
    return { x: width / 2 + x1 * 78 * perspective, y: height / 2 + y2 * 78 * perspective, z: z2 }
  })
  const order = DIE_FACES.map((ids) => ({
    ids,
    depth: ids.reduce((sum, id) => sum + projected[id].z, 0) / ids.length,
  })).sort((a, b) => a.depth - b.depth)

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, width, height)
  for (const face of order) {
    ctx.beginPath()
    face.ids.forEach((id, vertex) => {
      const point = projected[id]
      if (vertex === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
    ctx.closePath()
    const light = Math.round(168 + face.depth * 36)
    ctx.fillStyle = `rgb(${light}, ${light + 6}, ${Math.min(255, light + 22)})`
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#0f172a'
    ctx.stroke()
  }
  const front = order[order.length - 1]
  if (!front) return
  const cx = front.ids.reduce((sum, id) => sum + projected[id].x, 0) / front.ids.length
  const cy = front.ids.reduce((sum, id) => sum + projected[id].y, 0) / front.ids.length
  ctx.fillStyle = '#111827'
  ctx.font = '700 32px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(value, cx, cy)
}

export function DiceRoll() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [seed, setSeed] = useState(1)
  const [face, setFace] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let alive = true
    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      if (!alive) return
      const t = spinning ? Math.min(1, (now - started) / 900) : 1
      const angle = spinning ? t * Math.PI * 6 : 0.9
      const tumbling = String(1 + (Math.floor(t * 18) % 6))
      const shown = spinning && t < 1 ? tumbling : face === null ? '·' : String(face)
      drawDie(ctx, canvas.width, canvas.height, angle, shown)
      if (spinning && t < 1) frame = window.requestAnimationFrame(tick)
      else if (spinning) setSpinning(false)
    }
    frame = window.requestAnimationFrame(tick)
    return () => {
      alive = false
      window.cancelAnimationFrame(frame)
    }
  }, [spinning, face])

  return (
    <ModeShell
      controls={
        <>
          <p className="hint">
            A cube drawn on the canvas. Its faces tumble, then it settles on a 1d6 roll. This is not a physics engine.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const next = seed + 1
              setSeed(next)
              setFace(rollNotation('1d6', next).total)
              setSpinning(true)
            }}
          >
            Roll the cube
          </button>
        </>
      }
      result={
        <>
          <h2>3D physics dice</h2>
          <canvas
            ref={canvasRef}
            width={360}
            height={240}
            style={stageStyle}
            aria-label={face === null ? 'Drawn cube die' : `Drawn cube showing ${face}`}
          />
          <p className="lede" aria-live="polite">
            {face === null ? 'Roll to see a face.' : `Rolled ${face}`}
          </p>
        </>
      }
    />
  )
}
