import { useRef, useState } from 'react'
import { freshWyrm, stepWyrm, WYRM_H, WYRM_W, WYRM_WORLD, type Wyrm } from '../../lib/games/wyrm'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

function delta(from: number, to: number): number {
  let gap = to - from
  if (gap > WYRM_WORLD / 2) gap -= WYRM_WORLD
  if (gap < -WYRM_WORLD / 2) gap += WYRM_WORLD
  return gap
}

export default function WyrmTool() {
  const [state, setState] = useState<Wyrm>(() => freshWyrm())
  const held = useHeld(['ArrowLeft', 'ArrowRight'])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) => stepWyrm(current, held.current.has('ArrowLeft'), held.current.has('ArrowRight')))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const you = state.bodies[0]
    if (!canvas || !ctx || !you) return
    ctx.fillStyle = '#10140e'
    ctx.fillRect(0, 0, WYRM_W, WYRM_H)
    const head = you.pts[0]
    ctx.fillStyle = INK
    state.orbs.forEach((orb) => {
      const x = WYRM_W / 2 + delta(head.x, orb.x)
      const y = WYRM_H / 2 + delta(head.y, orb.y)
      if (x < -8 || y < -8 || x > WYRM_W + 8 || y > WYRM_H + 8) return
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })
    state.bodies.forEach((worm) => {
      ctx.fillStyle = worm.bot ? RED : LIME
      worm.pts.forEach((point, index) => {
        const x = WYRM_W / 2 + delta(head.x, point.x)
        const y = WYRM_H / 2 + delta(head.y, point.y)
        ctx.beginPath()
        ctx.arc(x, y, index === 0 ? 6 : 4, 0, Math.PI * 2)
        ctx.fill()
      })
    })
  }, 16)

  return (
    <Arcade
      title="Slither.io"
      lede="Turn left and right. Eat the orbs to grow. Touching a body ends the run. The field wraps."
      status={state.dead ? `Crashed · ${state.score}` : `Orbs ${state.score}`}
      onRestart={() => setState(freshWyrm())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={WYRM_W} height={WYRM_H} />
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
