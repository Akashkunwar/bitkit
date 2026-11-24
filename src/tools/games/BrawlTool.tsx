import { useRef, useState } from 'react'
import { BRAWL_H, BRAWL_W, freshBrawl, stepBrawl, type Brawl } from '../../lib/games/brawl'
import { Arcade, HoldKeys } from './kit'
import { INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', ' ', 'ArrowUp'] as const

export default function BrawlTool() {
  const [state, setState] = useState<Brawl>(freshBrawl)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepBrawl(current, {
        left: held.current.has('ArrowLeft'),
        right: held.current.has('ArrowRight'),
        punch: held.current.has(' '),
        kick: held.current.has('ArrowUp'),
      }),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const sky = ctx.createLinearGradient(0, 0, 0, BRAWL_H)
    sky.addColorStop(0, '#2a3344')
    sky.addColorStop(0.55, '#6e4a58')
    sky.addColorStop(1, '#1c1814')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, BRAWL_W, BRAWL_H)
    ctx.fillStyle = '#3a342c'
    ctx.fillRect(0, 188, BRAWL_W, 52)
    ctx.fillStyle = '#2a241c'
    for (let x = 0; x < BRAWL_W; x += 28) ctx.fillRect(x, 188, 14, 4)
    const ground = 188
    state.foes.forEach((foe) => {
      const h = foe.boss ? 46 : 34
      ctx.fillStyle = foe.boss ? '#ffb020' : RED
      ctx.fillRect(foe.x - 10, ground - h, foe.boss ? 26 : 20, h)
      ctx.fillStyle = INK
      ctx.fillRect(foe.x - 4, ground - h + 8, 4, 4)
      ctx.fillStyle = '#14160f'
      ctx.fillRect(foe.x - 12, ground - 6, 4, 4)
      ctx.fillRect(foe.x + (foe.boss ? 10 : 6), ground - 6, 4, 4)
    })
    const swinging = state.punch > 0 || state.kick > 0
    ctx.fillStyle = LIME
    ctx.fillRect(state.x - 8, ground - 40, 16, 28)
    ctx.fillStyle = '#17382c'
    ctx.fillRect(state.x - 6, ground - 12, 5, 12)
    ctx.fillRect(state.x + 2, ground - 12, 5, 12)
    ctx.fillStyle = INK
    const arm = state.face > 0 ? 8 : -22
    ctx.fillRect(state.x + arm, ground - (state.kick > 0 ? 18 : 30), swinging ? 18 : 8, 4)
    ctx.fillStyle = '#14160f'
    ctx.fillRect(12, 14, 100, 6)
    ctx.fillStyle = LIME
    ctx.fillRect(12, 14, state.hp, 6)
  }, 16)

  const status = state.won
    ? 'Street clear'
    : state.dead
      ? 'Down'
      : `Wave ${state.wave}/3 · ${state.score} · ${state.hp} hp`
  return (
    <Arcade
      title="Brawl"
      lede="Space punches. Up kicks, which reaches further. Clear three waves."
      status={status}
      onRestart={() => setState(freshBrawl())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={BRAWL_W} height={BRAWL_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          [' ', 'Punch'],
          ['ArrowUp', 'Kick'],
        ]}
      />
    </Arcade>
  )
}
