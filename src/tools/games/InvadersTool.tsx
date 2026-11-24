import { useRef, useState } from 'react'
import { freshInvaders, INV_H, INV_W, stepInvaders, type Invaders } from '../../lib/games/invaders'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', ' '] as const

export default function InvadersTool() {
  const [state, setState] = useState<Invaders>(freshInvaders)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepInvaders(
        current,
        held.current.has('ArrowLeft') ? -1 : held.current.has('ArrowRight') ? 1 : 0,
        held.current.has(' '),
      ),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, INV_W, INV_H)
    ctx.fillStyle = LIME
    state.aliens.forEach((alien) => {
      if (alien.alive) ctx.fillRect(alien.x, alien.y, 22, 14)
    })
    ctx.fillStyle = INK
    ctx.fillRect(state.player, INV_H - 28, 32, 8)
    state.shots.forEach((shot) => {
      ctx.fillStyle = shot.vy < 0 ? INK : RED
      ctx.fillRect(shot.x, shot.y, 3, 8)
    })
  }, 16)

  return (
    <Arcade
      title="Invaders"
      lede="Move with the arrow keys and hold space to fire. Don't let the formation reach you."
      status={state.won ? 'Cleared' : state.dead ? 'Overrun' : `Score ${state.score} · lives ${state.lives}`}
      onRestart={() => setState(freshInvaders())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={INV_W} height={INV_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          [' ', 'Fire'],
        ]}
      />
    </Arcade>
  )
}
