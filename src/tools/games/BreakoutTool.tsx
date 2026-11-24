import { useEffect, useRef, useState } from 'react'
import { freshBreakout, stepBreakout, type Breakout } from '../../lib/games/breakout'
import { Arcade, HoldKeys } from './kit'
import { useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight'] as const

export default function BreakoutTool() {
  const [state, setState] = useState<Breakout>(freshBreakout)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const held = useHeld(KEYS)

  useTick(() => {
    const dir = held.current.has('ArrowLeft') ? -1 : held.current.has('ArrowRight') ? 1 : 0
    setState((current) => stepBreakout(current, dir))
  }, 16)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = state.width
    canvas.height = state.height
    ctx.fillStyle = '#14160f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const colW = state.width / state.cols
    state.bricks.forEach((alive, index) => {
      if (!alive) return
      const col = index % state.cols
      const row = Math.floor(index / state.cols)
      ctx.fillStyle = ['#f87171', '#fb923c', '#fde047', '#4ade80', '#60a5fa'][row % 5]
      ctx.fillRect(col * colW + 2, 36 + row * 24, colW - 6, 16)
    })
    ctx.fillStyle = '#f4f1e4'
    ctx.fillRect(state.paddleX, state.height - 24, 80, 10)
    ctx.beginPath()
    ctx.arc(state.ball.x, state.ball.y, 6, 0, Math.PI * 2)
    ctx.fill()
  }, [state])

  const status = state.lost ? `Score ${state.score}. The ball got past the paddle.` : `Score ${state.score}`
  return (
    <Arcade
      title="Breakout"
      lede="Left and right arrows move the paddle. Clear the bricks."
      status={String(state.score)}
      onRestart={() => setState(freshBreakout())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" role="img" aria-label={status} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
        ]}
      />
      <p className="hint">{state.lost ? 'The ball got past the paddle.' : 'Each brick is ten points.'}</p>
    </Arcade>
  )
}
