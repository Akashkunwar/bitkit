import { useRef, useState } from 'react'
import { CATCH_H, CATCH_W, freshCatch, stepCatch, type CatchGame } from '../../lib/games/catch'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, lastHeld, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight'] as const

export default function CatchTool() {
  const [state, setState] = useState<CatchGame>(freshCatch)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const key = lastHeld(held.current, KEYS)
    const dir = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0
    setState((current) => stepCatch(current, dir))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, CATCH_W, CATCH_H)
    state.items.forEach((item) => {
      ctx.fillStyle = item.good ? LIME : RED
      ctx.fillRect(item.x, item.y, 14, 14)
    })
    ctx.fillStyle = INK
    ctx.fillRect(state.x, CATCH_H - 24, 64, 10)
  }, 16)

  return (
    <Arcade
      title="Catch"
      lede="Slide the tray. Green squares score. Red squares, and missed green ones, cost a life."
      status={state.dead ? `Too many misses · ${state.score}` : `Score ${state.score} · misses ${state.misses}`}
      onRestart={() => setState(freshCatch())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={CATCH_W} height={CATCH_H} />
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
