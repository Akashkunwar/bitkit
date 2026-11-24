import { useEffect, useState } from 'react'
import { stepLife } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

function lifeSeed(): number[][] {
  const grid = Array.from({ length: 28 }, () => Array<number>(28).fill(0))
  grid[8][14] = 1
  grid[9][14] = 1
  grid[10][14] = 1
  const glider = [
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
  ]
  glider.forEach((row, r) => {
    row.forEach((cell, c) => {
      grid[16 + r][6 + c] = cell
    })
  })
  return grid
}

export function LifeSim() {
  const [grid, setGrid] = useState(lifeSeed)
  const [generation, setGeneration] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setGrid((current) => stepLife(current))
      setGeneration((value) => value + 1)
    }, 140)
    return () => window.clearInterval(id)
  }, [playing])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const cell = 12
    ctx.fillStyle = '#14202b'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.fillStyle = '#7dcea0'
    grid.forEach((row, r) => {
      row.forEach((value, c) => {
        if (value) ctx.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2)
      })
    })
  }

  return (
    <div className="stack">
      <p>Generation {generation}. A vertical blinker flips onto its side each step.</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => setPlaying((value) => !value)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setGrid((current) => stepLife(current))
            setGeneration((value) => value + 1)
          }}
        >
          Step
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setGrid(lifeSeed())
            setGeneration(0)
          }}
        >
          Reset
        </button>
      </div>
      <CanvasCard width={336} height={336} draw={draw} filename="game-of-life.png" label="Game of Life" />
    </div>
  )
}
