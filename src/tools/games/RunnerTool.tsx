import { useEffect, useRef, useState } from 'react'
import { freshRunner, RUN_GROUND, RUN_H, RUN_W, stepRunner, type Runner } from '../../lib/games/runner'
import { Arcade } from './kit'
import { BG, INK, LIME, isTypingTarget, useTap, useTick } from './loop'

export default function RunnerTool() {
  const [state, setState] = useState<Runner>(freshRunner)
  const tap = useTap()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.key !== ' ' && event.key !== 'ArrowUp') || isTypingTarget(event.target)) return
      event.preventDefault()
      tap.tap()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [tap])

  useTick(() => setState((current) => stepRunner(current, tap.take())), 16)
  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, RUN_W, RUN_H)
    ctx.fillStyle = '#2a2e22'
    ctx.fillRect(0, RUN_GROUND, RUN_W, RUN_H - RUN_GROUND)
    ctx.fillStyle = LIME
    state.hurdles.forEach((hurdle) => ctx.fillRect(hurdle.x, RUN_GROUND - hurdle.h, hurdle.w, hurdle.h))
    ctx.fillStyle = INK
    ctx.fillRect(40, state.y - 18, 16, 18)
  }, 16)

  return (
    <Arcade
      title="Runner"
      lede="Space or up jumps the runner. Miss a hurdle and the run ends."
      status={state.dead ? 'Tripped' : `Score ${state.score}`}
      onRestart={() => setState(freshRunner())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={RUN_W} height={RUN_H} onPointerDown={() => tap.tap()} />
      <button type="button" className="btn" onClick={() => tap.tap()}>
        Jump
      </button>
    </Arcade>
  )
}
