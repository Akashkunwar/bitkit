import { useRef, useState, type PointerEvent } from 'react'
import { freshBlob, BLOB_H, BLOB_W, BLOB_WORLD, stepBlob, type BlobGame } from '../../lib/games/blob'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

export default function BlobTool() {
  const [state, setState] = useState<BlobGame>(() => freshBlob())
  const held = useHeld(KEYS)
  const aim = useRef({ x: 0, y: 0, on: false })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const keys = held.current
    let dx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)
    let dy = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)
    if (aim.current.on) {
      dx = aim.current.x
      dy = aim.current.y
    }
    setState((current) => stepBlob(current, dx, dy))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const you = state.cells.find((cell) => cell.id === 0)
    if (!canvas || !ctx || !you) return
    ctx.fillStyle = '#10140e'
    ctx.fillRect(0, 0, BLOB_W, BLOB_H)
    const camX = you.x - BLOB_W / 2
    const camY = you.y - BLOB_H / 2
    ctx.strokeStyle = '#22281c'
    ctx.lineWidth = 1
    for (let x = -((camX % 40) + 40) % 40; x < BLOB_W; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, BLOB_H)
      ctx.stroke()
    }
    ctx.fillStyle = INK
    state.dots.forEach((dot) => {
      const x = dot.x - camX
      const y = dot.y - camY
      if (x < -4 || y < -4 || x > BLOB_W || y > BLOB_H) return
      ctx.fillRect(x - 2, y - 2, 4, 4)
    })
    const draw = [...state.cells].sort((a, b) => b.r - a.r)
    draw.forEach((cell) => {
      ctx.fillStyle = cell.bot ? RED : LIME
      ctx.beginPath()
      ctx.arc(cell.x - camX, cell.y - camY, cell.r, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.strokeStyle = '#3c4630'
    ctx.strokeRect(-camX, -camY, BLOB_WORLD, BLOB_WORLD)
  }, 16)

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = BLOB_W / rect.width
    const scaleY = BLOB_H / rect.height
    aim.current = {
      x: (event.clientX - rect.left) * scaleX - BLOB_W / 2,
      y: (event.clientY - rect.top) * scaleY - BLOB_H / 2,
      on: true,
    }
  }

  return (
    <Arcade
      title="Agar.io"
      lede="Steer into smaller dots and cells. A larger cell swallows you. Pointer or arrows."
      status={state.dead ? `Eaten · ${state.score}` : `Mass ${state.score}`}
      onRestart={() => {
        aim.current = { x: 0, y: 0, on: false }
        setState(freshBlob())
      }}
    >
      <canvas
        ref={canvasRef}
        className="arcade-canvas"
        width={BLOB_W}
        height={BLOB_H}
        onPointerDown={point}
        onPointerMove={(event) => {
          if (event.buttons || aim.current.on) point(event)
        }}
        onPointerUp={() => {
          aim.current.on = false
        }}
        onPointerCancel={() => {
          aim.current.on = false
        }}
        onPointerLeave={() => {
          aim.current.on = false
        }}
      />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Up'],
          ['ArrowDown', 'Down'],
        ]}
      />
    </Arcade>
  )
}
