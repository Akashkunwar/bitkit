import { useRef, useState } from 'react'
import {
  freshLedge,
  LEDGE_BODY,
  LEDGE_H,
  LEDGE_LEVELS,
  LEDGE_W,
  ledgeCamera,
  stepLedge,
  TILE,
  type Ledge,
} from '../../lib/games/ledge'
import { Arcade, HoldKeys } from './kit'
import { useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '] as const

export default function LedgeTool() {
  const [state, setState] = useState<Ledge>(freshLedge)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const jump = held.current.has('ArrowUp') || held.current.has(' ')
    setState((current) =>
      stepLedge(current, {
        left: held.current.has('ArrowLeft'),
        right: held.current.has('ArrowRight'),
        jump,
      }),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const cam = ledgeCamera(state)
    const sky = ctx.createLinearGradient(0, 0, 0, LEDGE_H)
    sky.addColorStop(0, '#8fd4ef')
    sky.addColorStop(1, '#d7f3c2')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, LEDGE_W, LEDGE_H)
    ctx.fillStyle = '#9ad0e6'
    for (let i = 0; i < 4; i += 1) {
      const cx = ((i * 180 - cam * 0.2) % 560) + 40
      ctx.beginPath()
      ctx.ellipse(cx, 46, 36, 12, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.save()
    ctx.translate(-cam, 0)
    state.rows.forEach((row, ty) => {
      ;[...row].forEach((ch, tx) => {
        const x = tx * TILE
        const y = ty * TILE
        if (x + TILE < cam || x > cam + LEDGE_W) return
        if (ch === '#') {
          const grass = state.rows[ty - 1]?.[tx] !== '#'
          ctx.fillStyle = grass ? '#6eae45' : '#c4784a'
          ctx.fillRect(x, y, TILE, TILE)
          ctx.fillStyle = grass ? '#4e8a32' : '#8d4e32'
          ctx.fillRect(x, y + (grass ? 5 : 0), TILE, grass ? TILE - 5 : 1)
          if (!grass) ctx.fillRect(x, y + 8, TILE, 1)
        } else if (ch === 'o' && state.coins[ty * row.length + tx]) {
          ctx.fillStyle = '#f2c14e'
          ctx.beginPath()
          ctx.arc(x + 8, y + 8, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#a9781d'
          ctx.fillRect(x + 7, y + 5, 2, 6)
        } else if (ch === '^') {
          ctx.fillStyle = '#d7dde6'
          ctx.beginPath()
          ctx.moveTo(x + 2, y + TILE)
          ctx.lineTo(x + 8, y + 4)
          ctx.lineTo(x + 14, y + TILE)
          ctx.fill()
        } else if (ch === 'F') {
          ctx.fillStyle = '#f4f1e4'
          ctx.fillRect(x + 7, y, 2, TILE)
          ctx.fillStyle = '#e85d4c'
          ctx.beginPath()
          ctx.moveTo(x + 9, y + 1)
          ctx.lineTo(x + 16, y + 5)
          ctx.lineTo(x + 9, y + 9)
          ctx.fill()
        }
      })
    })
    state.enemies.forEach((enemy) => {
      if (!enemy.alive) return
      ctx.fillStyle = '#e85d4c'
      ctx.fillRect(enemy.x, enemy.y + 4, LEDGE_BODY.w, LEDGE_BODY.h - 4)
      ctx.fillStyle = '#f4f1e4'
      ctx.fillRect(enemy.x + (enemy.vx > 0 ? 7 : 2), enemy.y + 6, 3, 3)
    })
    ctx.fillStyle = '#2a241c'
    ctx.fillRect(state.x + 2, state.y, 8, 4)
    ctx.fillStyle = '#3ddc97'
    ctx.fillRect(state.x, state.y + 4, LEDGE_BODY.w, 7)
    ctx.fillStyle = '#245c48'
    ctx.fillRect(state.x, state.y + 11, LEDGE_BODY.w, 3)
    ctx.fillStyle = '#17382c'
    ctx.fillRect(state.x + 1, state.y + 13, 4, 2)
    ctx.fillRect(state.x + 7, state.y + 13, 4, 2)
    ctx.fillStyle = '#143028'
    const eye = state.face > 0 ? state.x + 8 : state.x + 2
    ctx.fillRect(eye, state.y + 6, 2, 2)
    ctx.restore()
  }, 16)

  const stage = state.won ? 'Clear' : state.dead ? 'Fell' : `Stage ${state.level + 1}/${LEDGE_LEVELS.length}`
  return (
    <Arcade
      title="Ledge"
      lede="Run and jump the stages. Land on a walker to stomp it, pick up the coins, and touch the flag."
      status={state.won ? 'Clear' : state.dead ? 'Out of lives' : `${stage} · ${state.score} · lives ${state.lives}`}
      onRestart={() => setState(freshLedge())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={LEDGE_W} height={LEDGE_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Jump'],
        ]}
      />
    </Arcade>
  )
}
