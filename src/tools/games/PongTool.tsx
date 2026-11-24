import { useEffect, useRef, useState } from 'react'
import { freshPong, stepPong, type PongState } from '../../lib/games/pong'
import { Arcade, HoldKeys } from './kit'
import { useHeld, useTick } from './loop'

const KEYS = ['ArrowUp', 'ArrowDown'] as const

export default function PongTool() {
  const [state, setState] = useState<PongState>(freshPong)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const held = useHeld(KEYS)

  useTick(() => {
    const dir = held.current.has('ArrowUp') ? -1 : held.current.has('ArrowDown') ? 1 : 0
    setState((current) => stepPong(current, dir))
  }, 16)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = state.width
    canvas.height = state.height
    ctx.fillStyle = '#14160f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#f4f1e4'
    ctx.fillRect(16, state.playerY, 8, state.paddle)
    ctx.fillRect(state.width - 24, state.cpuY, 8, state.paddle)
    ctx.beginPath()
    ctx.arc(state.ball.x, state.ball.y, 6, 0, Math.PI * 2)
    ctx.fill()
  }, [state])

  const status = `${state.score[0]} – ${state.score[1]}`
  return (
    <Arcade
      title="Pong"
      lede="Your paddle is on the left. Up and down arrows move it. The right paddle plays itself."
      status={status}
      onRestart={() => setState(freshPong())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" role="img" aria-label={status} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowUp', 'Up'],
          ['ArrowDown', 'Down'],
        ]}
      />
    </Arcade>
  )
}
