import { useEffect, useState } from 'react'
import { stepSand } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

function sandStart(): number[][] {
  return Array.from({ length: 16 }, (_, column) => {
    const cells = Array<number>(20).fill(0)
    const grains = 3 + (column % 4)
    for (let i = 0; i < grains; i += 1) cells[i] = 1
    return cells
  })
}

export function SandSim() {
  const [columns, setColumns] = useState(sandStart)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setColumns((current) => current.map((column) => stepSand(column, true)))
    }, 80)
    return () => window.clearInterval(id)
  }, [playing])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const cell = 16
    const hues = ['#e2b657', '#d9a441', '#c9842a', '#efd48a']
    ctx.fillStyle = '#1c2430'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    columns.forEach((column, x) => {
      column.forEach((grain, y) => {
        if (!grain) return
        ctx.fillStyle = hues[x % hues.length]
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2)
      })
    })
  }

  return (
    <div className="stack">
      <p>Each loose grain falls one cell. Grains at the top drop first.</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => setPlaying((value) => !value)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setColumns((current) => current.map((column) => stepSand(column, true)))}
        >
          Step
        </button>
        <button type="button" className="btn" onClick={() => setColumns(sandStart())}>
          Reset
        </button>
      </div>
      <CanvasCard width={256} height={320} draw={draw} filename="falling-sand.png" label="Falling sand" />
    </div>
  )
}
