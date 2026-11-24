import { useRef, useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { AST_H, AST_W, freshAsteroids, stepAsteroids, type Asteroids } from '../../lib/games/asteroids'
import { Arcade, HoldKeys } from './kit'
import { BG, INK, LIME, useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '] as const

export default function AsteroidsTool() {
  const rand = useRef(mulberry32(7))
  const [state, setState] = useState<Asteroids>(() => freshAsteroids(rand.current))
  const held = useHeld(KEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useTick(() => {
    setState((current) =>
      stepAsteroids(
        current,
        {
          left: held.current.has('ArrowLeft'),
          right: held.current.has('ArrowRight'),
          thrust: held.current.has('ArrowUp'),
          fire: held.current.has(' '),
        },
        rand.current,
      ),
    )
  }, 16)

  useTick(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = AST_W
    canvas.height = AST_H
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, AST_W, AST_H)
    ctx.strokeStyle = INK
    ctx.beginPath()
    const { x, y, a } = state.ship
    ctx.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12)
    ctx.lineTo(x + Math.cos(a + 2.4) * 10, y + Math.sin(a + 2.4) * 10)
    ctx.lineTo(x + Math.cos(a - 2.4) * 10, y + Math.sin(a - 2.4) * 10)
    ctx.closePath()
    ctx.stroke()
    ctx.fillStyle = LIME
    state.bolts.forEach((bolt) => ctx.fillRect(bolt.x - 1, bolt.y - 1, 3, 3))
    ctx.strokeStyle = LIME
    state.rocks.forEach((rock) => {
      ctx.beginPath()
      ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2)
      ctx.stroke()
    })
  }, 16)

  return (
    <Arcade
      title="Asteroids"
      lede="Turn with left and right, thrust with up, and fire with space. Big rocks break into smaller ones."
      status={state.dead ? 'Ship lost' : `Score ${state.score} · lives ${state.lives}`}
      onRestart={() => {
        rand.current = mulberry32(Date.now() % 100000)
        setState(freshAsteroids(rand.current))
      }}
    >
      <canvas ref={canvasRef} className="arcade-canvas" width={AST_W} height={AST_H} />
      <HoldKeys
        held={held}
        labels={[
          ['ArrowLeft', 'Left'],
          ['ArrowRight', 'Right'],
          ['ArrowUp', 'Thrust'],
          [' ', 'Fire'],
        ]}
      />
    </Arcade>
  )
}
