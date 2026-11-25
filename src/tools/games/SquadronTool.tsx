import { useRef, useState } from 'react'
import { freshSquadron, SQUAD_BODY, SQUAD_H, SQUAD_W, stepSquadron, type Squad } from '../../lib/games/squadron'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '] as const

export default function SquadronTool() {
  const [state, setState] = useState<Squad>(freshSquadron)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepSquadron(current, {
        left: held.current.has('ArrowLeft'),
        right: held.current.has('ArrowRight'),
        up: held.current.has('ArrowUp'),
        down: held.current.has('ArrowDown'),
        fire: held.current.has(' '),
      }),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#101820'
    ctx.fillRect(0, 0, SQUAD_W, SQUAD_H)
    ctx.fillStyle = INK
    state.stars.forEach((star) => ctx.fillRect(star.x, star.y, star.s, star.s))
    state.foes.forEach((foe) => {
      ctx.fillStyle = foe.kind === 2 ? '#ffb020' : foe.kind === 1 ? '#7eb6ff' : RED
      ctx.beginPath()
      ctx.moveTo(foe.x + 9, foe.y + 16)
      ctx.lineTo(foe.x + 18, foe.y)
      ctx.lineTo(foe.x, foe.y)
      ctx.closePath()
      ctx.fill()
    })
    if (state.power) {
      ctx.fillStyle = LIME
      ctx.beginPath()
      ctx.arc(state.power.x + 7, state.power.y + 7, 6, 0, Math.PI * 2)
      ctx.fill()
    }
    state.shots.forEach((shot) => {
      ctx.fillStyle = shot.foe ? RED : INK
      ctx.fillRect(shot.x, shot.y, 3, 8)
    })
    if (state.hurt === 0 || state.tick % 4 < 2) {
      ctx.fillStyle = state.spread > 1 ? LIME : INK
      ctx.beginPath()
      ctx.moveTo(state.x + SQUAD_BODY.w / 2, state.y)
      ctx.lineTo(state.x + SQUAD_BODY.w, state.y + SQUAD_BODY.h)
      ctx.lineTo(state.x, state.y + SQUAD_BODY.h)
      ctx.closePath()
      ctx.fill()
    }
  }, 16)

  const status = state.won
    ? 'Lane clear'
    : state.dead
      ? 'Shot down'
      : `Wave ${state.wave}/3 · ${state.score} · lives ${state.lives}`
  return (
    <Arcade
      title="1942"
      lede="Fly in four directions and hold space to fire. The green star widens your shot."
      status={status}
      onRestart={() => setState(freshSquadron())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={SQUAD_W} height={SQUAD_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Up'],
          ['ArrowDown', 'Down'],
          [' ', 'Fire'],
        ]}
      />
    </Arcade>
  )
}
