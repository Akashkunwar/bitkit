import { useEffect, useRef, useState } from 'react'
import { dropStack, freshStack, stepStack, type StackGame } from '../../lib/games/stack'
import { Arcade } from './kit'
import { BG, INK, LIME, isTypingTarget, useTap, useTick } from './loop'

export default function StackTool() {
  const [state, setState] = useState<StackGame>(freshStack)
  const tap = useTap()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.key !== ' ' && event.key !== 'ArrowDown') || isTypingTarget(event.target)) return
      event.preventDefault()
      tap.tap()
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [tap])

  useTick(() => {
    setState((current) => (tap.take() ? dropStack(current) : stepStack(current)))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, 320, 360)
    state.blocks.forEach((block, index) => {
      ctx.fillStyle = index === 0 ? '#3d4a28' : LIME
      const y = 340 - index * 18
      ctx.fillRect(block.x, y, block.w, 16)
    })
    ctx.fillStyle = INK
    ctx.fillRect(state.x, 340 - state.blocks.length * 18, state.w, 16)
  }, 16)

  return (
    <Arcade
      title="Stack"
      lede="Tap when the moving block lines up. Whatever hangs off is cut away."
      status={state.dead ? 'Missed' : `Height ${state.score}`}
      onRestart={() => setState(freshStack())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={320} height={360} onPointerDown={() => tap.tap()} />
      <button type="button" className="btn" onClick={() => tap.tap()}>
        Drop
      </button>
    </Arcade>
  )
}
