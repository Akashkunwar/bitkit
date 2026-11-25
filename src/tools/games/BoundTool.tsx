import { useRef, useState } from 'react'
import { freshBound, BOUND_H, BOUND_W, stepBound, type Bound } from '../../lib/games/bound'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, useHeld, useTick } from './loop'

export default function BoundTool() {
  const [state, setState] = useState<Bound>(() => freshBound())
  const held = useHeld(['ArrowLeft', 'ArrowRight'])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) => stepBound(current, held.current.has('ArrowLeft'), held.current.has('ArrowRight')))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, BOUND_W, BOUND_H)
    state.pads.forEach((pad) => {
      ctx.fillStyle = pad.spike ? RED : LIME
      ctx.fillRect(pad.x, pad.y, pad.w, pad.spike ? 8 : 6)
    })
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(state.x, state.y, 8, 0, Math.PI * 2)
    ctx.fill()
  }, 16)

  return (
    <Arcade
      title="Bound"
      lede="The ball bounces on its own. Steer left and right. Red pads are spikes, and falling off ends the climb."
      status={state.dead ? `Fell · ${state.score}` : `Score ${state.score}`}
      onRestart={() => setState(freshBound())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={BOUND_W} height={BOUND_H} />
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
