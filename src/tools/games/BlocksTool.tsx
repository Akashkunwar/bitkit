import { useCallback, useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import {
  BLOCK_COLS,
  BLOCK_ROWS,
  drop,
  emptyBoard,
  nudge,
  rotate,
  spawn,
  type Grid,
  type Piece,
} from '../../lib/games/blocks'
import { mulberry32 } from '../../lib/games/random'
import { useArrows } from './keys'

const COLORS = ['#67e8f9', '#fde047', '#c084fc', '#4ade80', '#f87171', '#60a5fa', '#fb923c']

type Run = { board: Grid; piece: Piece; score: number; dead: boolean; bag: number }

function fresh(): Run {
  return { board: emptyBoard(), piece: spawn(0), score: 0, dead: false, bag: 1 }
}

export default function BlocksTool() {
  const [run, setRun] = useState<Run>(fresh)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rand = useRef(mulberry32(7))

  const repeat = useRef(0)
  useEffect(() => () => window.clearInterval(repeat.current), [])

  const play = useCallback((key: string) => {
    setRun((current) => {
      if (current.dead) return current
      if (key === 'ArrowLeft') {
        const piece = nudge(current.board, current.piece, -1, 0)
        return piece ? { ...current, piece } : current
      }
      if (key === 'ArrowRight') {
        const piece = nudge(current.board, current.piece, 1, 0)
        return piece ? { ...current, piece } : current
      }
      if (key === 'ArrowUp') {
        const piece = nudge(current.board, current.piece, 0, 0, rotate(current.piece.shape))
        return piece ? { ...current, piece } : current
      }
      if (key === 'ArrowDown') {
        const piece = nudge(current.board, current.piece, 0, 1)
        return piece ? { ...current, piece, score: current.score + 1 } : current
      }
      if (key === ' ') {
        let piece = current.piece
        let score = current.score
        let fallen = nudge(current.board, piece, 0, 1)
        while (fallen) {
          piece = fallen
          score += 1
          fallen = nudge(current.board, piece, 0, 1)
        }
        const landed = drop(current.board, piece, Math.floor(rand.current() * 7))
        return {
          board: landed.board,
          piece: landed.piece,
          score: score + landed.cleared * landed.cleared * 100,
          dead: landed.dead,
          bag: current.bag + 1,
        }
      }
      return current
    })
  }, [])
  useArrows(play)

  useEffect(() => {
    const id = window.setInterval(() => {
      setRun((current) => {
        if (current.dead) return current
        const landed = drop(current.board, current.piece, Math.floor(rand.current() * 7))
        return {
          board: landed.board,
          piece: landed.piece,
          score: current.score + landed.cleared * landed.cleared * 100,
          dead: landed.dead,
          bag: current.bag + (landed.cleared ? 1 : 0),
        }
      })
    }, 520)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const size = 24
    canvas.width = BLOCK_COLS * size
    canvas.height = BLOCK_ROWS * size
    ctx.fillStyle = '#14160f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const paint = (x: number, y: number, id: number) => {
      ctx.fillStyle = COLORS[id % COLORS.length]
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2)
    }
    run.board.forEach((row, y) => row.forEach((cell, x) => cell && paint(x, y, cell - 1)))
    run.piece.shape.forEach((row, y) =>
      row.forEach((bit, x) => bit && paint(run.piece.x + x, run.piece.y + y, run.piece.id)),
    )
  }, [run])

  return (
    <ToolLayout title="Blocks" lede="Falling blocks. Arrow keys move and turn. Space drops the piece.">
      <div className="arcade">
        <div className="arcade-top">
          <strong>{run.score}</strong>
          <button
            type="button"
            className="btn"
            onClick={() => {
              rand.current = mulberry32(7)
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
          aria-label={run.dead ? `Score ${run.score}. The stack reached the top.` : `Score ${run.score}`}
        />
        <div className="arcade-keys">
          {(
            [
              ['ArrowLeft', 'Left'],
              ['ArrowRight', 'Right'],
              ['ArrowUp', 'Turn'],
              ['ArrowDown', 'Down'],
              [' ', 'Drop'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="btn"
              onPointerDown={(event) => {
                event.preventDefault()
                event.currentTarget.setPointerCapture(event.pointerId)
                window.clearInterval(repeat.current)
                play(key)
                if (key === ' ') return
                repeat.current = window.setInterval(() => play(key), 140)
              }}
              onPointerUp={() => window.clearInterval(repeat.current)}
              onPointerCancel={() => window.clearInterval(repeat.current)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="hint">
          {run.dead ? 'The stack reached the top.' : 'Clear a full line and the rows above it fall.'}
        </p>
      </div>
    </ToolLayout>
  )
}
