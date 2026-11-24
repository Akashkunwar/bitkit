import { useEffect, useRef, useState } from 'react'
import { freshMissile, launchMissile, MISS_H, MISS_W, stepMissile, type Missile } from '../../lib/games/missile'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, isTypingTarget, useHeld, useTap, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const
const AIM = 5

export default function MissileTool() {
  const [state, setState] = useState<Missile>(freshMissile)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const held = useHeld(KEYS)
  const fire = useTap()
  const aim = useRef({ x: MISS_W / 2, y: MISS_H / 3 })

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== ' ' && event.key !== 'Enter') || isTypingTarget(event.target)) return
      event.preventDefault()
      fire.tap()
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [fire])

  useTick(() => setState((current) => stepMissile(current)), 16)

  useTick(() => {
    let { x, y } = aim.current
    if (held.current.has('ArrowLeft')) x -= AIM
    if (held.current.has('ArrowRight')) x += AIM
    if (held.current.has('ArrowUp')) y -= AIM
    if (held.current.has('ArrowDown')) y += AIM
    aim.current = {
      x: Math.max(0, Math.min(MISS_W, x)),
      y: Math.max(0, Math.min(MISS_H, y)),
    }
    if (fire.take()) {
      const shot = aim.current
      setState((current) => launchMissile(current, shot.x, shot.y))
    }
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, MISS_W, MISS_H)
    state.cities.forEach((city, index) => {
      ctx.fillStyle = city ? LIME : '#333'
      ctx.fillRect(index * 80 + 22, MISS_H - 22, 28, 16)
    })
    ctx.fillStyle = RED
    state.incoming.forEach((shot) => ctx.fillRect(shot.x, shot.y, 4, 8))
    ctx.strokeStyle = INK
    state.booms.forEach((boom) => {
      ctx.beginPath()
      ctx.arc(boom.x, boom.y, 28, 0, Math.PI * 2)
      ctx.stroke()
    })
    const { x, y } = aim.current
    ctx.beginPath()
    ctx.moveTo(x - 8, y)
    ctx.lineTo(x + 8, y)
    ctx.moveTo(x, y - 8)
    ctx.lineTo(x, y + 8)
    ctx.stroke()
  }, 16)

  const status = state.dead ? 'Cities gone' : `Score ${state.score}`
  return (
    <Arcade
      title="Missiles"
      lede="Click the sky, or aim with the arrows and fire with space or enter. The burst only lasts a moment. Each city can be lost once."
      status={status}
      onRestart={() => setState(freshMissile())}
    >
      <canvas
        ref={canvasRef}
        className="arcade-canvas"
        width={MISS_W}
        height={MISS_H}
        role="img"
        aria-label={status}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const x = ((event.clientX - rect.left) / rect.width) * MISS_W
          const y = ((event.clientY - rect.top) / rect.height) * MISS_H
          aim.current = { x, y }
          setState((current) => launchMissile(current, x, y))
        }}
      />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Up'],
          ['ArrowDown', 'Down'],
        ]}
      />
      <button
        type="button"
        className="btn"
        onPointerDown={(event) => {
          event.preventDefault()
          fire.tap()
        }}
      >
        Fire
      </button>
    </Arcade>
  )
}
