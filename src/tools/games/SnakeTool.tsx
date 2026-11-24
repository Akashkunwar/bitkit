import { useCallback, useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { opposite, placeFood, SNAKE_COLS, SNAKE_ROWS, stepSnake, type Cell, type SnakeDir } from '../../lib/games/snake'
import { useArrows } from './keys'
import { HoldKeys } from './kit'
import { useTick } from './loop'

const PAD_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const

const START: Cell[] = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
]

type Run = { body: Cell[]; dir: SnakeDir; food: Cell; score: number; dead: boolean; seed: number }

function fresh(): Run {
  const body = START.map((cell) => ({ ...cell }))
  return { body, dir: 'right', food: placeFood(body, 1), score: 0, dead: false, seed: 2 }
}

export default function SnakeTool() {
  const [run, setRun] = useState<Run>(fresh)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dir = useRef<SnakeDir>('right')

  const pad = useRef(new Set<string>())
  const turn = useCallback((key: string) => {
    const next: Record<string, SnakeDir | undefined> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    }
    const wanted = next[key]
    if (!wanted || opposite(dir.current, wanted)) return
    dir.current = wanted
  }, [])
  useArrows(turn)
  useTick(() => {
    const key = PAD_KEYS.find((item) => pad.current.has(item))
    if (key) turn(key)
  }, 16)

  useEffect(() => {
    const id = window.setInterval(() => {
      setRun((current) => {
        if (current.dead) return current
        const stepped = stepSnake(current.body, dir.current, current.food)
        if (stepped.dead) return { ...current, dead: true }
        const seed = current.seed + (stepped.ate ? 1 : 0)
        return {
          ...current,
          body: stepped.body,
          dir: dir.current,
          food: stepped.ate ? placeFood(stepped.body, seed) : current.food,
          score: current.score + (stepped.ate ? 1 : 0),
          seed,
        }
      })
    }, 140)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const size = 20
    canvas.width = SNAKE_COLS * size
    canvas.height = SNAKE_ROWS * size
    ctx.fillStyle = '#14160f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#c9f150'
    ctx.fillRect(run.food.x * size + 2, run.food.y * size + 2, size - 4, size - 4)
    ctx.fillStyle = '#f4f1e4'
    run.body.forEach((cell) => ctx.fillRect(cell.x * size + 1, cell.y * size + 1, size - 2, size - 2))
  }, [run])

  return (
    <ToolLayout title="Snake" lede="Steer with the arrow keys. Eat the square, and don't bite yourself.">
      <div className="arcade">
        <div className="arcade-top">
          <strong>{run.score}</strong>
          <button
            type="button"
            className="btn"
            onClick={() => {
              dir.current = 'right'
              setRun(fresh())
            }}
          >
            Restart
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className="arcade-canvas"
          role="img"
          aria-label={run.dead ? `Score ${run.score}. That run is over.` : `Score ${run.score}`}
        />
        <HoldKeys
          held={pad}
          labels={[
            ['ArrowUp', 'Up'],
            ['ArrowLeft', 'Left'],
            ['ArrowRight', 'Right'],
            ['ArrowDown', 'Down'],
          ]}
        />
        <p className="hint">
          {run.dead ? 'That run is over.' : 'Arrow keys move. The snake cannot reverse into itself.'}
        </p>
      </div>
    </ToolLayout>
  )
}
