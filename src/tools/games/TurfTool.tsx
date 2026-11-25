import { useRef, useState } from 'react'
import { freshTurf, stepTurf, TURF_N, type Turf } from '../../lib/games/turf'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

const CELL = 12
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

export default function TurfTool() {
  const [state, setState] = useState<Turf>(() => freshTurf())
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const keys = held.current
    const dx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)
    const dy = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)
    setState((current) => stepTurf(current, dx, dx && dy ? 0 : dy))
  }, 110)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#171b14'
    ctx.fillRect(0, 0, TURF_N * CELL, TURF_N * CELL)
    for (let y = 0; y < TURF_N; y += 1) {
      for (let x = 0; x < TURF_N; x += 1) {
        const owner = state.grid[y * TURF_N + x]
        if (!owner) continue
        ctx.fillStyle = owner === 1 ? '#3d4a28' : '#4a2c28'
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
      }
    }
    ctx.fillStyle = LIME
    state.trail.forEach((index) => {
      ctx.fillRect((index % TURF_N) * CELL, Math.floor(index / TURF_N) * CELL, CELL, CELL)
    })
    ctx.fillStyle = RED
    state.botTrail.forEach((index) => {
      ctx.fillRect((index % TURF_N) * CELL, Math.floor(index / TURF_N) * CELL, CELL, CELL)
    })
    ctx.fillStyle = INK
    ctx.fillRect(state.x * CELL, state.y * CELL, CELL, CELL)
    ctx.fillStyle = RED
    ctx.fillRect(state.bx * CELL, state.by * CELL, CELL, CELL)
  }, 32)

  const total = TURF_N * TURF_N
  const share = Math.round((state.score / total) * 100)
  return (
    <Arcade
      title="Turf"
      lede="Leave your patch, loop around empty ground, and come home to claim it. Hitting a trail loses."
      status={state.dead ? `Cut · ${share}%` : `${share}%`}
      onRestart={() => setState(freshTurf())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={TURF_N * CELL} height={TURF_N * CELL} />
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
