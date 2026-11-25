import { useRef, useState } from 'react'
import { freshHaul, haulGround, HAUL_H, HAUL_W, HAUL_WHEEL, stepHaul, type Haul } from '../../lib/games/haul'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

export default function HaulTool() {
  const [state, setState] = useState<Haul>(freshHaul)
  const held = useHeld(['ArrowRight', 'ArrowLeft'])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) => stepHaul(current, held.current.has('ArrowRight'), held.current.has('ArrowLeft')))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const camX = state.x - 140
    const camY = state.y - 150
    const sky = ctx.createLinearGradient(0, 0, 0, HAUL_H)
    sky.addColorStop(0, '#1b2838')
    sky.addColorStop(0.55, '#c9844a')
    sky.addColorStop(1, '#6a3a28')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, HAUL_W, HAUL_H)
    ctx.beginPath()
    ctx.moveTo(0, HAUL_H)
    for (let x = 0; x <= HAUL_W; x += 4) ctx.lineTo(x, haulGround(camX + x) - camY)
    ctx.lineTo(HAUL_W, HAUL_H)
    ctx.fillStyle = '#2f5a32'
    ctx.fill()
    ctx.beginPath()
    for (let x = 0; x <= HAUL_W; x += 4) {
      const y = haulGround(camX + x) - camY
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = LIME
    ctx.lineWidth = 2
    ctx.stroke()
    state.spots.forEach((spot) => {
      if (spot.taken) return
      const sx = spot.x - camX
      if (sx < -20 || sx > HAUL_W + 20) return
      ctx.fillStyle = LIME
      ctx.beginPath()
      ctx.arc(sx, haulGround(spot.x) - 30 - camY, 6, 0, Math.PI * 2)
      ctx.fill()
    })
    const bx = state.x - camX
    const groundY = (haulGround(state.x - HAUL_WHEEL) + haulGround(state.x + HAUL_WHEEL)) / 2
    const lift = groundY - 16 - state.y
    const backY = haulGround(state.x - HAUL_WHEEL) - camY - lift
    const frontY = haulGround(state.x + HAUL_WHEEL) - camY - lift
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(bx - HAUL_WHEEL, backY - 12)
    ctx.lineTo(bx + HAUL_WHEEL, frontY - 12)
    ctx.stroke()
    ctx.fillStyle = INK
    for (const [px, py] of [
      [bx - HAUL_WHEEL, backY],
      [bx + HAUL_WHEEL, frontY],
    ] as const) {
      ctx.beginPath()
      ctx.arc(px, py, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = RED
    ctx.fillRect(bx - 4, state.y - camY - 22, 8, 12)
    ctx.fillStyle = '#2a2e22'
    ctx.fillRect(16, 16, 104, 8)
    ctx.fillStyle = state.fuel < 25 ? RED : LIME
    ctx.fillRect(16, 16, state.fuel, 8)
  }, 16)

  const status = state.dead ? `Stopped · ${state.score}` : `${state.score} · fuel ${Math.ceil(state.fuel)}`
  return (
    <Arcade
      title="Hill Climb Racing"
      lede="Right accelerates, left brakes. Ease off before a steep face or the bike flips. Coins refill the tank."
      status={status}
      onRestart={() => setState(freshHaul())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={HAUL_W} height={HAUL_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Brake'],
          ['ArrowRight', 'Gas'],
        ]}
      />
    </Arcade>
  )
}
