import { useRef, useState } from 'react'
import { freshRally, projectRally, RALLY_H, RALLY_W, stepRally, type Rally } from '../../lib/games/rally'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '] as const

function bike(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
  const s = Math.max(0.25, Math.min(2.6, scale))
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#14160f'
  ctx.beginPath()
  ctx.arc(-9, -4, 4.5, 0, Math.PI * 2)
  ctx.arc(9, -4, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillRect(-11, -11, 22, 6)
  ctx.fillStyle = INK
  ctx.fillRect(-2, -18, 7, 7)
  ctx.restore()
}

export default function RallyTool() {
  const [state, setState] = useState<Rally>(freshRally)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepRally(current, {
        left: held.current.has('ArrowLeft'),
        right: held.current.has('ArrowRight'),
        accel: held.current.has('ArrowUp'),
        brake: held.current.has('ArrowDown'),
        shove: held.current.has(' '),
      }),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const sky = ctx.createLinearGradient(0, 0, 0, 120)
    sky.addColorStop(0, '#142033')
    sky.addColorStop(0.65, '#e07a3d')
    sky.addColorStop(1, '#f2c14e')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, RALLY_W, 112)
    ctx.fillStyle = '#3d7a34'
    ctx.fillRect(0, 112, RALLY_W, RALLY_H - 112)
    ctx.fillStyle = '#ffe7a3'
    ctx.beginPath()
    ctx.arc(370, 74, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#243044'
    for (let i = 0; i < 7; i += 1) {
      const mx = ((i * 120 - state.z * 0.12) % 640) - 100
      ctx.beginPath()
      ctx.moveTo(mx, 112)
      ctx.lineTo(mx + 46, 64)
      ctx.lineTo(mx + 92, 112)
      ctx.fill()
    }
    const slices: { y: number; lx: number; rx: number; ahead: number }[] = []
    for (let i = 80; i >= 1; i -= 1) {
      const ahead = 5 + i * 4.5
      const left = projectRally(state.z, state.x, ahead, -1)
      const right = projectRally(state.z, state.x, ahead, 1)
      slices.push({ y: left.y, lx: left.x, rx: right.x, ahead })
    }
    slices.sort((a, b) => a.y - b.y)
    for (let i = 0; i < slices.length - 1; i += 1) {
      const a = slices[i]
      const b = slices[i + 1]
      const h = b.y - a.y
      if (h <= 0 || a.y > RALLY_H) continue
      const band = Math.floor((state.z + b.ahead) / 28) % 2 === 0
      ctx.fillStyle = band ? '#3d7a34' : '#4d8c40'
      ctx.fillRect(0, a.y, RALLY_W, h + 1)
      ctx.beginPath()
      ctx.moveTo(a.lx, a.y)
      ctx.lineTo(a.rx, a.y)
      ctx.lineTo(b.rx, b.y)
      ctx.lineTo(b.lx, b.y)
      ctx.closePath()
      ctx.fillStyle = band ? '#4a4e57' : '#353941'
      ctx.fill()
      ctx.fillStyle = band ? RED : INK
      const inset = 0.07
      ctx.beginPath()
      ctx.moveTo(a.lx, a.y)
      ctx.lineTo(a.lx + (a.rx - a.lx) * inset, a.y)
      ctx.lineTo(b.lx + (b.rx - b.lx) * inset, b.y)
      ctx.lineTo(b.lx, b.y)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(a.rx, a.y)
      ctx.lineTo(a.rx - (a.rx - a.lx) * inset, a.y)
      ctx.lineTo(b.rx - (b.rx - b.lx) * inset, b.y)
      ctx.lineTo(b.rx, b.y)
      ctx.fill()
      if (band && h > 2 && h < 16) {
        ctx.fillStyle = INK
        ctx.beginPath()
        ctx.moveTo((a.lx + a.rx) / 2 - 1, a.y)
        ctx.lineTo((a.lx + a.rx) / 2 + 1, a.y)
        ctx.lineTo((b.lx + b.rx) / 2 + 1.4, b.y)
        ctx.lineTo((b.lx + b.rx) / 2 - 1.4, b.y)
        ctx.fill()
      }
    }
    state.rivals
      .map((rival) => ({ rival, ahead: rival.z - state.z }))
      .filter((item) => item.ahead > 14 && item.ahead < 460)
      .sort((a, b) => b.ahead - a.ahead)
      .forEach(({ rival, ahead }, index) => {
        const at = projectRally(state.z, state.x, ahead, rival.x)
        bike(ctx, at.x, at.y, 70 / ahead, index % 2 ? '#7eb6ff' : RED)
      })
    const lean = state.x * 18 + (state.spin > 0 ? Math.sin(state.tick / 2) * 10 : 0)
    bike(ctx, RALLY_W / 2 + lean, RALLY_H - 6, 2.3, state.spin > 0 ? RED : LIME)
    ctx.fillStyle = '#14160f'
    ctx.fillRect(16, 16, 80, 6)
    ctx.fillStyle = LIME
    ctx.fillRect(16, 16, 80 * state.speed, 6)
  }, 16)

  const status = state.finished ? `Finished · P${state.place} · ${state.score}` : `P${state.place} · ${state.score}`
  return (
    <Arcade
      title="Rally"
      lede="Hold up to accelerate, steer through the bends, and press space to shove a rival alongside."
      status={status}
      onRestart={() => setState(freshRally())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={RALLY_W} height={RALLY_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Gas'],
          ['ArrowDown', 'Brake'],
          [' ', 'Shove'],
        ]}
      />
    </Arcade>
  )
}
