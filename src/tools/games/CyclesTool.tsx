import { useRef, useState } from 'react'
import { CYC_H, CYC_W, freshCycles, stepCycles, type Cycles } from '../../lib/games/cycles'
import { Arcade } from './kit'
import { BG, INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight'] as const

export default function CyclesTool() {
  const [state, setState] = useState<Cycles>(freshCycles)
  const held = useHeld(KEYS)
  const steer = useRef<-1 | 0 | 1>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const next = held.current.has('ArrowLeft') ? -1 : held.current.has('ArrowRight') ? 1 : 0
    const turn = next !== 0 && next !== steer.current ? next : 0
    steer.current = next
    setState((current) => stepCycles(current, turn as -1 | 0 | 1))
  }, 90)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const size = 12
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, CYC_W * size, CYC_H * size)
    for (let i = 0; i < state.grid.length; i += 1) {
      if (!state.grid[i]) continue
      ctx.fillStyle = state.grid[i] === 1 ? INK : RED
      ctx.fillRect((i % CYC_W) * size, Math.floor(i / CYC_W) * size, size - 1, size - 1)
    }
    ctx.fillStyle = LIME
    ctx.fillRect(state.a.x * size, state.a.y * size, size - 1, size - 1)
  }, 90)

  const status = state.over === 1 ? 'You win' : state.over === 2 ? 'You crashed' : state.over === 3 ? 'Draw' : 'Riding'
  return (
    <Arcade
      title="Cycles"
      lede="Left and right turn your light cycle. The trail is a wall. The other rider turns to stay alive."
      status={status}
      onRestart={() => setState(freshCycles())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={CYC_W * 12} height={CYC_H * 12} />
      <div className="arcade-keys">
        <button type="button" className="btn" onClick={() => setState((current) => stepCycles(current, -1))}>
          Left
        </button>
        <button type="button" className="btn" onClick={() => setState((current) => stepCycles(current, 1))}>
          Right
        </button>
      </div>
    </Arcade>
  )
}
