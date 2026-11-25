import { useRef, useState } from 'react'
import { freshLander, GROUND, LAND_H, LAND_W, stepLander, type Lander } from '../../lib/games/lander'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp'] as const

export default function LanderTool() {
  const [state, setState] = useState<Lander>(freshLander)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepLander(current, {
        left: held.current.has('ArrowLeft'),
        right: held.current.has('ArrowRight'),
        thrust: held.current.has('ArrowUp'),
      }),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, LAND_W, LAND_H)
    ctx.fillStyle = LIME
    ctx.fillRect(state.pad, GROUND, 72, 6)
    ctx.fillStyle = '#2a2e22'
    ctx.fillRect(0, GROUND + 6, LAND_W, LAND_H - GROUND)
    ctx.fillStyle = state.crashed ? RED : INK
    ctx.beginPath()
    ctx.moveTo(state.x, state.y - 16)
    ctx.lineTo(state.x - 8, state.y)
    ctx.lineTo(state.x + 8, state.y)
    ctx.fill()
    if (held.current.has('ArrowUp') && state.fuel > 0 && !state.landed && !state.crashed) {
      ctx.fillStyle = RED
      ctx.fillRect(state.x - 3, state.y, 6, 8)
    }
  }, 16)

  const status = state.landed
    ? 'Down safely'
    : state.crashed
      ? 'Crashed'
      : `Fuel ${state.fuel} · vx ${state.vx.toFixed(1)} · vy ${state.vy.toFixed(1)}`
  return (
    <Arcade
      title="Lunar Lander"
      lede="Left and right push sideways. Up burns fuel. A safe landing needs a slow vertical speed and almost no sideways speed, on the green pad."
      status={status}
      onRestart={() => setState(freshLander(80 + (Date.now() % 240)))}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={LAND_W} height={LAND_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Thrust'],
        ]}
      />
    </Arcade>
  )
}
