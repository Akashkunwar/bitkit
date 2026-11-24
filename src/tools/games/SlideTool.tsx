import { useCallback, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { emptySlide, moveGrid, spawnTile, type Dir } from '../../lib/games/slide'
import { useArrows } from './keys'

function start(): number[][] {
  return spawnTile(spawnTile(emptySlide(), 2, 0), 2, 3)
}

type Run = { grid: number[][]; score: number; step: number }

export default function SlideTool() {
  const [run, setRun] = useState<Run>({ grid: start(), score: 0, step: 1 })

  const play = useCallback((key: string) => {
    const dir: Record<string, Dir | undefined> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    }
    const nextDir = dir[key]
    if (!nextDir) return
    setRun((current) => {
      const moved = moveGrid(current.grid, nextDir)
      if (!moved.moved) return current
      const step = current.step + 1
      return {
        grid: spawnTile(moved.grid, step % 5 === 0 ? 4 : 2, step),
        score: current.score + moved.score,
        step,
      }
    })
  }, [])
  useArrows(play)

  return (
    <ToolLayout title="2048" lede="Slide the tiles. Two equal numbers merge into their sum.">
      <div className="arcade">
        <div className="arcade-top">
          <strong>{run.score}</strong>
          <button type="button" className="btn" onClick={() => setRun({ grid: start(), score: 0, step: 1 })}>
            Restart
          </button>
        </div>
        <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {run.grid.flat().map((value, index) => (
            <div key={index} className="arcade-cell arcade-tile">
              {value || ''}
            </div>
          ))}
        </div>
        <p className="hint">Arrow keys slide the whole board.</p>
      </div>
    </ToolLayout>
  )
}
