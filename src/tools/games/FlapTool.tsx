import { useEffect, useRef, useState } from 'react'
import { FLAP_H, FLAP_W, freshFlap, stepFlap, type Flap } from '../../lib/games/flap'
import { Arcade } from './kit'
import { BG, INK, LIME, isTypingTarget, useTap, useTick } from './loop'

export default function FlapTool() {
  const [state, setState] = useState<Flap>(freshFlap)
  const tap = useTap()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.key !== ' ' && event.key !== 'ArrowUp') || isTypingTarget(event.target)) return
      event.preventDefault()
      tap.tap()
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [tap])

  useTick(() => setState((current) => stepFlap(current, tap.take())), 16)
  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, FLAP_W, FLAP_H)
    ctx.fillStyle = LIME
    state.pipes.forEach((pipe) => {
      ctx.fillRect(pipe.x, 0, 46, Math.max(0, pipe.gap))
      ctx.fillRect(pipe.x, pipe.gap + 108, 46, FLAP_H)
    })
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(86, state.y, 8, 0, Math.PI * 2)
    ctx.fill()
  }, 16)

  return (
    <Arcade
      title="Flap"
      lede="Tap, click, or press space to hop through the gaps."
      status={state.dead ? 'Hit a pipe' : `Score ${state.score}`}
      onRestart={() => setState(freshFlap())}
    >
      <canvas
        ref={canvasRef}
        className="arcade-canvas"
        width={FLAP_W}
        height={FLAP_H}
        onPointerDown={(event) => {
          event.preventDefault()
          tap.tap()
        }}
      />
      <button type="button" className="btn" onClick={() => tap.tap()}>
        Flap
      </button>
    </Arcade>
  )
}
