import { useRef, useState } from 'react'
import { BLAST_CELL, BLAST_H, BLAST_W, freshBlast, stepBlast, type Blast } from '../../lib/games/blast'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, lastHeld, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '] as const
const VIEW_W = BLAST_W * BLAST_CELL
const VIEW_H = BLAST_H * BLAST_CELL

export default function BlastTool() {
  const [state, setState] = useState<Blast>(freshBlast)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const horizontal = lastHeld(held.current, ['ArrowLeft', 'ArrowRight'])
    const vertical = lastHeld(held.current, ['ArrowUp', 'ArrowDown'])
    const dc = horizontal === 'ArrowLeft' ? -1 : horizontal === 'ArrowRight' ? 1 : 0
    const dr = vertical === 'ArrowUp' ? -1 : vertical === 'ArrowDown' ? 1 : 0
    setState((current) => stepBlast(current, { dc, dr, bomb: held.current.has(' ') }))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#1b2420'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    state.rows.forEach((row, r) => {
      ;[...row].forEach((ch, c) => {
        const x = c * BLAST_CELL
        const y = r * BLAST_CELL
        if (ch === '#') {
          ctx.fillStyle = '#3d4a55'
          ctx.fillRect(x + 1, y + 1, BLAST_CELL - 2, BLAST_CELL - 2)
        } else if (ch === '+') {
          ctx.fillStyle = '#c4784a'
          ctx.fillRect(x + 2, y + 2, BLAST_CELL - 4, BLAST_CELL - 4)
          ctx.strokeStyle = '#8d4e32'
          ctx.strokeRect(x + 6, y + 6, BLAST_CELL - 12, BLAST_CELL - 12)
        }
      })
    })
    state.flames.forEach((flame) => {
      ctx.fillStyle = flame.life > 8 ? '#ffb020' : RED
      ctx.fillRect(flame.c * BLAST_CELL + 4, flame.r * BLAST_CELL + 4, BLAST_CELL - 8, BLAST_CELL - 8)
    })
    state.bombs.forEach((bomb) => {
      ctx.fillStyle = BG
      ctx.beginPath()
      ctx.arc(bomb.c * BLAST_CELL + 14, bomb.r * BLAST_CELL + 16, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = bomb.fuse < 15 ? RED : INK
      ctx.fillRect(bomb.c * BLAST_CELL + 13, bomb.r * BLAST_CELL + 6, 2, 6)
    })
    state.enemies.forEach((enemy) => {
      ctx.fillStyle = RED
      ctx.fillRect(enemy.c * BLAST_CELL + 6, enemy.r * BLAST_CELL + 6, 16, 16)
      ctx.fillStyle = INK
      ctx.fillRect(enemy.c * BLAST_CELL + 9, enemy.r * BLAST_CELL + 10, 3, 3)
      ctx.fillRect(enemy.c * BLAST_CELL + 16, enemy.r * BLAST_CELL + 10, 3, 3)
    })
    if (state.hurt === 0 || state.tick % 4 < 2) {
      ctx.fillStyle = LIME
      ctx.fillRect(state.c * BLAST_CELL + 6, state.r * BLAST_CELL + 5, 16, 18)
      ctx.fillStyle = '#17382c'
      ctx.fillRect(state.c * BLAST_CELL + 9, state.r * BLAST_CELL + 9, 3, 3)
      ctx.fillRect(state.c * BLAST_CELL + 16, state.r * BLAST_CELL + 9, 3, 3)
    }
  }, 16)

  const status = state.won ? 'Floor clear' : state.dead ? 'Caught' : `${state.score} · lives ${state.lives}`
  return (
    <Arcade
      title="Blast"
      lede="Space drops a bomb. Step off it before the cross of fire reaches you, and clear every crawler."
      status={status}
      onRestart={() => setState(freshBlast())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={VIEW_W} height={VIEW_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Up'],
          ['ArrowDown', 'Down'],
          [' ', 'Bomb'],
        ]}
      />
    </Arcade>
  )
}
