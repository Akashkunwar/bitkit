import { useRef, useState } from 'react'
import { freshRing, stepRing, type Ring, type RingSide } from '../../lib/games/ring'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, RED, useHeld, useTick } from './loop'

const KEYS = ['ArrowUp', 'ArrowDown', 'z', 'x', 'Z', 'X'] as const
const W = 480
const H = 280

function boxer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  pose: 'idle' | 'high' | 'low' | 'hit',
  face: 1 | -1,
) {
  ctx.fillStyle = color
  ctx.fillRect(x - 16, y - 28, 32, 36)
  ctx.fillStyle = '#f0c9a0'
  ctx.fillRect(x - 10, y - 52, 20, 22)
  ctx.fillStyle = BG
  ctx.fillRect(x + face * 2, y - 44, 4, 4)
  ctx.fillStyle = color
  const arm = pose === 'high' ? -48 : pose === 'low' ? -8 : pose === 'hit' ? -36 : -24
  ctx.fillRect(x + face * 12, y + arm, face * 22, 8)
  ctx.fillStyle = '#1c1c1c'
  ctx.fillRect(x - 10, y + 8, 8, 16)
  ctx.fillRect(x + 4, y + 8, 8, 16)
}

export default function RingTool() {
  const [state, setState] = useState<Ring>(freshRing)
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    const dodge: RingSide | 'none' = held.current.has('ArrowUp')
      ? 'high'
      : held.current.has('ArrowDown')
        ? 'low'
        : 'none'
    const punch: RingSide | 'none' =
      held.current.has('z') || held.current.has('Z')
        ? 'high'
        : held.current.has('x') || held.current.has('X')
          ? 'low'
          : 'none'
    setState((current) => stepRing(current, { dodge, punch }))
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#243044'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#c4554a'
    ctx.fillRect(40, 70, W - 80, H - 110)
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.strokeRect(70, 90, W - 140, H - 150)
    ctx.lineWidth = 1
    const duck = state.dodge === 'low' && state.dodgeFor > 0 ? 16 : state.dodge === 'high' ? -8 : 0
    const oppPose = state.phase === 'strike' ? state.kind : state.phase === 'recover' ? state.guard : 'idle'
    boxer(ctx, 300, 168, RED, oppPose, -1)
    boxer(ctx, 170, 176 + duck, LIME, state.phase === 'recover' ? 'hit' : 'idle', 1)
    ctx.fillStyle = '#14160f'
    ctx.fillRect(40, 28, 160, 8)
    ctx.fillRect(280, 28, 160, 8)
    ctx.fillStyle = LIME
    ctx.fillRect(40, 28, 1.6 * Math.max(0, state.playerHp), 8)
    ctx.fillStyle = RED
    ctx.fillRect(280, 28, Math.min(160, state.oppHp * 2), 8)
    ctx.fillStyle = INK
    ctx.font = '700 18px ui-monospace, monospace'
    const cue =
      state.phase === 'tell'
        ? state.kind.toUpperCase()
        : state.phase === 'strike'
          ? 'NOW'
          : `OPEN ${state.guard === 'high' ? 'LOW' : 'HIGH'}`
    ctx.fillText(cue, 200, 58)
    const width =
      state.phase === 'tell' ? (1 - state.timer / 28) * 120 : state.phase === 'recover' ? (state.timer / 26) * 120 : 120
    ctx.fillStyle = state.phase === 'strike' ? RED : LIME
    ctx.fillRect(180, 64, Math.max(0, width), 4)
  }, 16)

  const status = state.won
    ? `Decision · ${state.score}`
    : state.dead
      ? 'Knocked down'
      : `Round ${state.round} · ${state.score}`
  return (
    <Arcade
      title="Ring"
      lede="Up dodges a high punch, down dodges a low one. On the open cue, Z hits high and X hits low."
      status={status}
      onRestart={() => setState(freshRing())}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={W} height={H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowUp', 'Dodge high'],
          ['ArrowDown', 'Dodge low'],
          ['z', 'High'],
          ['x', 'Low'],
        ]}
      />
    </Arcade>
  )
}
