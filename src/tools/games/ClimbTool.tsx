import { useRef, useState } from 'react'
import {
  CLIMB_BODY,
  CLIMB_H,
  CLIMB_LADDERS,
  CLIMB_SHELVES,
  CLIMB_W,
  freshClimb,
  stepClimb,
  type Climb,
} from '../../lib/games/climb'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const

export default function ClimbTool() {
  const [state, setState] = useState<Climb>(freshClimb)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepClimb(current, {
        left: held.current.has('ArrowLeft'),
        right: held.current.has('ArrowRight'),
        up: held.current.has('ArrowUp'),
        down: held.current.has('ArrowDown'),
      }),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#1a2740'
    ctx.fillRect(0, 0, CLIMB_W, CLIMB_H)
    ctx.fillStyle = '#243044'
    ctx.fillRect(0, 0, CLIMB_W, 36)
    ctx.fillStyle = LIME
    ctx.fillRect(18, 40, 28, 22)
    ctx.fillStyle = '#6a5436'
    CLIMB_LADDERS.forEach((ladder) => {
      ctx.fillRect(ladder.x - 8, ladder.y, 3, ladder.h)
      ctx.fillRect(ladder.x + 5, ladder.y, 3, ladder.h)
      for (let y = ladder.y; y < ladder.y + ladder.h; y += 10) ctx.fillRect(ladder.x - 8, y, 16, 2)
    })
    ctx.fillStyle = '#c4784a'
    CLIMB_SHELVES.forEach((shelf) => ctx.fillRect(shelf.x, shelf.y, shelf.w, 8))
    state.barrels.forEach((keg) => {
      ctx.fillStyle = RED
      ctx.beginPath()
      ctx.arc(keg.x + 7, keg.y + 7, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#8d2e28'
      ctx.stroke()
    })
    if (state.hurt === 0 || state.tick % 4 < 2) {
      ctx.fillStyle = INK
      ctx.fillRect(state.x, state.y, CLIMB_BODY.w, CLIMB_BODY.h)
      ctx.fillStyle = '#2a241c'
      ctx.fillRect(state.x + 3, state.y, 8, 4)
      ctx.fillStyle = LIME
      ctx.fillRect(state.x + 9, state.y + 6, 2, 2)
    }
  }, 16)

  const status = state.won ? 'Top reached' : state.dead ? 'Flattened' : `${state.score} · lives ${state.lives}`
  return (
    <Arcade
      title="Donkey Kong"
      lede="Up and down the ladders. Up jumps when you are not on a ladder. Reach the green mark before a barrel does."
      status={status}
      onRestart={() => setState(freshClimb())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={CLIMB_W} height={CLIMB_H} />
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
