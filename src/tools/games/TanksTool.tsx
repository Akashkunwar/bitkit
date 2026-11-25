import { useRef, useState } from 'react'
import { freshTanks, stepTanks, TANK_CELL, TANK_N, type TankDir, type Tanks } from '../../lib/games/tanks'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, lastHeld, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '] as const
const SIZE = TANK_CELL * TANK_N

const DIRS: Record<string, TankDir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

function dirOf(held: Set<string>): TankDir | null {
  const key = lastHeld(held, Object.keys(DIRS))
  return key ? DIRS[key] : null
}

export default function TanksTool() {
  const [state, setState] = useState<Tanks>(freshTanks)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) => stepTanks(current, { dir: dirOf(held.current), fire: held.current.has(' ') }))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, SIZE, SIZE)
    state.rows.forEach((row, r) => {
      ;[...row].forEach((ch, c) => {
        const x = c * TANK_CELL
        const y = r * TANK_CELL
        if (ch === '#') {
          ctx.fillStyle = '#a8643c'
          ctx.fillRect(x + 1, y + 1, TANK_CELL - 2, TANK_CELL - 2)
          ctx.strokeStyle = '#6d3e28'
          ctx.strokeRect(x + 3, y + 3, TANK_CELL - 6, TANK_CELL - 6)
        } else if (ch === 'S') {
          ctx.fillStyle = '#9aa3ad'
          ctx.fillRect(x + 1, y + 1, TANK_CELL - 2, TANK_CELL - 2)
          ctx.fillStyle = '#d5dbe2'
          ctx.fillRect(x + 4, y + 4, TANK_CELL - 8, 3)
        } else if (ch === 'B') {
          ctx.fillStyle = LIME
          ctx.fillRect(x + 5, y + 6, 14, 10)
          ctx.fillStyle = RED
          ctx.fillRect(x + 8, y + 8, 8, 6)
        }
      })
    })
    state.tanks.forEach((tank) => {
      if (!tank.alive) return
      ctx.save()
      ctx.translate(tank.x + 9, tank.y + 9)
      const turn = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[tank.dir]
      ctx.rotate(turn)
      ctx.fillStyle = tank.foe ? RED : LIME
      ctx.fillRect(-8, -8, 16, 16)
      ctx.fillStyle = INK
      ctx.fillRect(-2, -14, 4, 8)
      ctx.restore()
    })
    ctx.fillStyle = INK
    state.shells.forEach((shell) => ctx.fillRect(shell.x - 2, shell.y - 2, 4, 4))
  }, 16)

  const status = state.won
    ? 'Base held'
    : state.dead
      ? state.lost === 'tank'
        ? 'Lives gone'
        : 'Base lost'
      : `Stage ${state.stage + 1} · ${state.score} · lives ${state.lives}`
  return (
    <Arcade
      title="Tanks"
      lede="Guard the base. Bricks break under fire. Steel does not. Space shoots."
      status={status}
      onRestart={() => setState(freshTanks())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={SIZE} height={SIZE} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Up'],
          ['ArrowDown', 'Down'],
          [' ', 'Fire'],
        ]}
      />
    </Arcade>
  )
}
