import { useRef, useState } from 'react'
import { freshRaid, RAID_BODY, RAID_H, RAID_W, stepRaid, type Raid } from '../../lib/games/raid'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'w', 'W'] as const

export default function RaidTool() {
  const [state, setState] = useState<Raid>(freshRaid)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepRaid(current, {
        left: held.current.has('ArrowLeft'),
        right: held.current.has('ArrowRight'),
        jump: held.current.has('ArrowUp'),
        fire: held.current.has(' '),
        aimUp: held.current.has('w') || held.current.has('W'),
      }),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const sky = ctx.createLinearGradient(0, 0, 0, RAID_H)
    sky.addColorStop(0, '#1a2838')
    sky.addColorStop(1, '#31402a')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, RAID_W, RAID_H)
    ctx.fillStyle = '#243028'
    for (let i = 0; i < 5; i += 1) {
      const hx = ((i * 130 - state.tick * 0.3) % 560) - 40
      ctx.fillRect(hx, 150 - (i % 3) * 12, 90, 96)
    }
    state.platforms.forEach((plat, index) => {
      ctx.fillStyle = index === 0 ? '#4d5a38' : '#6a5436'
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h)
      ctx.fillStyle = index === 0 ? '#6e8a48' : '#8b6b42'
      ctx.fillRect(plat.x, plat.y, plat.w, 3)
    })
    state.foes.forEach((foe) => {
      ctx.fillStyle = foe.kind === 'boss' ? '#ffb020' : foe.kind === 'turret' ? '#8aa0b8' : RED
      ctx.fillRect(foe.x, foe.y, foe.w, foe.h)
      ctx.fillStyle = INK
      ctx.fillRect(foe.x + (foe.face > 0 ? foe.w - 2 : -4), foe.y + 7, 6, 3)
    })
    if (state.hurt === 0 || state.tick % 4 < 2) {
      ctx.fillStyle = LIME
      ctx.fillRect(state.x, state.y, RAID_BODY.w, RAID_BODY.h)
      ctx.fillStyle = '#1c2414'
      ctx.fillRect(state.x + (state.face > 0 ? 10 : 2), state.y + 5, 4, 3)
      ctx.fillStyle = INK
      ctx.fillRect(state.x + (state.face > 0 ? RAID_BODY.w - 2 : -6), state.y + 9, 8, 3)
    }
    state.bullets.forEach((bullet) => {
      ctx.fillStyle = bullet.foe ? RED : INK
      ctx.fillRect(bullet.x, bullet.y, bullet.foe ? 4 : 5, bullet.vy === 0 ? 3 : 6)
    })
    ctx.fillStyle = BG
    ctx.globalAlpha = 0.55
    ctx.fillRect(8, 8, 92, 8)
    ctx.globalAlpha = 1
    ctx.fillStyle = LIME
    ctx.fillRect(8, 8, (92 * Math.max(0, state.lives)) / 3, 8)
  }, 16)

  const status = state.won
    ? 'Waves clear'
    : state.dead
      ? 'Down'
      : `Wave ${state.wave}/4 · ${state.score} · lives ${state.lives}`
  return (
    <Arcade
      title="Raid"
      lede="Run, jump, and fire through four waves. Space shoots ahead. W shoots upward."
      status={status}
      onRestart={() => setState(freshRaid())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={RAID_W} height={RAID_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Jump'],
          [' ', 'Fire'],
          ['w', 'Up shot'],
        ]}
      />
    </Arcade>
  )
}
