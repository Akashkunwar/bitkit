import { useRef, useState } from 'react'
import {
  flipperSegment,
  freshPins,
  PINS_BUMPERS,
  PINS_DROPS,
  PINS_H,
  PINS_W,
  stepPins,
  type Pins,
} from '../../lib/games/pins'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight'] as const

export default function PinsTool() {
  const [state, setState] = useState<Pins>(freshPins)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepPins(current, { left: held.current.has('ArrowLeft'), right: held.current.has('ArrowRight') }),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#1a2740'
    ctx.fillRect(0, 0, PINS_W, PINS_H)
    ctx.fillStyle = '#0e4d3a'
    ctx.beginPath()
    ctx.moveTo(20, 24)
    ctx.lineTo(PINS_W - 20, 24)
    ctx.lineTo(PINS_W - 20, 400)
    ctx.lineTo(214, 448)
    ctx.lineTo(108, 448)
    ctx.lineTo(20, 400)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#c4784a'
    ctx.lineWidth = 6
    ctx.stroke()
    ctx.lineWidth = 1
    PINS_BUMPERS.forEach((bumper) => {
      ctx.fillStyle = RED
      ctx.beginPath()
      ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(bumper.x, bumper.y, 5, 0, Math.PI * 2)
      ctx.fill()
    })
    state.drops.forEach((up, index) => {
      if (!up) return
      const target = PINS_DROPS[index]
      ctx.fillStyle = LIME
      ctx.fillRect(target.x, target.y, target.w, target.h)
    })
    ;(['left', 'right'] as const).forEach((side) => {
      const raised = side === 'left' ? state.left : state.right
      const [ax, ay, bx, by] = flipperSegment(side, raised)
      ctx.strokeStyle = INK
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    })
    ctx.fillStyle = state.locked ? LIME : INK
    ctx.beginPath()
    ctx.arc(state.x, state.y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f4f1e4'
    ctx.font = '700 13px ui-monospace, monospace'
    ctx.fillText(String(state.score), 28, 48)
    ctx.fillText(`ball ${state.balls}`, 220, 48)
  }, 16)

  return (
    <Arcade
      title="Pins"
      lede="Left and right raise the flippers. Either one launches. Drop all three targets for a bonus."
      status={state.dead ? 'Drained' : state.locked ? 'Launch' : `Score ${state.score} · ball ${state.balls}`}
      onRestart={() => setState(freshPins())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={PINS_W} height={PINS_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
        ]}
      />
    </Arcade>
  )
}
