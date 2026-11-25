import { useRef, useState } from 'react'
import { freshPit, PIT_H, PIT_W, PIT_WORLD, stepPit, type Pit } from '../../lib/games/pit'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

export default function PitTool() {
  const [state, setState] = useState<Pit>(() => freshPit())
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const keys = held.current
    const dx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)
    const dy = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)
    setState((current) => stepPit(current, dx, dy))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#3e4a34'
    ctx.fillRect(0, 0, PIT_W, PIT_H)
    const camX = state.x - PIT_W / 2
    const camY = state.y - PIT_H / 2
    state.things.forEach((item) => {
      const x = item.x - camX
      const y = item.y - camY
      ctx.fillStyle = item.r <= state.r * 0.92 ? LIME : '#8a6244'
      ctx.fillRect(x - item.r, y - item.r, item.r * 2, item.r * 2)
    })
    ctx.fillStyle = '#0c0e0a'
    ctx.beginPath()
    ctx.arc(PIT_W / 2, PIT_H / 2, state.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = '#243020'
    ctx.strokeRect(-camX, -camY, PIT_WORLD, PIT_WORLD)
  }, 16)

  const seconds = Math.ceil(state.time / 60)
  return (
    <Arcade
      title="Hole.io"
      lede="Move the hole. It swallows anything smaller than it and grows. Larger blocks stay put until you can take them."
      status={state.over ? `Time · ${state.score}` : `${state.score} · ${seconds}s`}
      onRestart={() => setState(freshPit())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={PIT_W} height={PIT_H} />
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
