import { useEffect, useRef, useState } from 'react'
import { freshHopper, stepHopper, type Hopper } from '../../lib/games/hopper'
import { Arcade } from './kit'
import { BG, INK, LIME, RED, isTypingTarget, useTick } from './loop'

export default function HopperTool() {
  const [state, setState] = useState<Hopper>(freshHopper)
  const hop = useRef<{ dc: number; dr: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const move = hop.current
    hop.current = null
    setState((current) => stepHopper(current, move))
  }, 40)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, 440, 320)
    ctx.fillStyle = '#1c3d2a'
    ctx.fillRect(0, 0, 440, 40)
    state.cars.forEach((car) => {
      ctx.fillStyle = car.row % 2 === 0 ? RED : INK
      ctx.fillRect(car.x, car.row * 40 + 8, car.w, 24)
    })
    ctx.fillStyle = LIME
    ctx.fillRect(state.c * 40 + 8, state.r * 40 + 8, 24, 24)
  }, 40)

  const go = (dc: number, dr: number) => {
    hop.current = { dc, dr }
  }

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }
      const step = map[event.key]
      if (event.repeat || !step || isTypingTarget(event.target)) return
      event.preventDefault()
      go(step[0], step[1])
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [])

  return (
    <Arcade
      title="Hopper"
      lede="Cross the lanes. Arrow keys hop one square. Reaching the far side scores and sends you back."
      status={state.dead ? 'Squashed' : `Crossed ${state.score} · lives ${state.lives}`}
      onRestart={() => setState(freshHopper())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={440} height={320} />
      <div className="arcade-keys">
        <button type="button" className="btn" onClick={() => go(0, -1)}>
          Up
        </button>
        <button type="button" className="btn" onClick={() => go(-1, 0)}>
          Left
        </button>
        <button type="button" className="btn" onClick={() => go(1, 0)}>
          Right
        </button>
        <button type="button" className="btn" onClick={() => go(0, 1)}>
          Down
        </button>
      </div>
    </Arcade>
  )
}
