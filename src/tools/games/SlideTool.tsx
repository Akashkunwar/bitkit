import { useCallback, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { mulberry32 } from '../../lib/games/random'
import { emptySlide, movesLeft, moveGrid, reached2048, spawnRandom, type Dir } from '../../lib/games/slide'
import { useArrows } from './keys'

type Run = { grid: number[][]; score: number; seed: number; over: boolean; won: boolean }

function deal(seed: number): Run {
  const rand = mulberry32(seed)
  const grid = spawnRandom(spawnRandom(emptySlide(), rand), rand)
  return { grid, score: 0, seed: Math.floor(rand() * 1_000_000_000), over: false, won: reached2048(grid) }
}

export default function SlideTool() {
  const [run, setRun] = useState<Run>(() => deal(11))

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
      if (current.over) return current
      const moved = moveGrid(current.grid, nextDir)
      if (!moved.moved) return current
      const rand = mulberry32(current.seed)
      const grid = spawnRandom(moved.grid, rand)
      const won = current.won || reached2048(grid)
      return {
        grid,
        score: current.score + moved.score,
        seed: Math.floor(rand() * 1_000_000_000),
        won,
        over: !movesLeft(grid),
      }
    })
  }, [])
  useArrows(play)

  const status = run.over ? `No moves · ${run.score}` : run.won ? `2048 · ${run.score}` : String(run.score)
  return (
    <ToolLayout title="2048" lede="Slide the tiles. Two equal numbers merge into their sum.">
      <div className="arcade">
        <div className="arcade-top">
          <strong>{status}</strong>
          <button type="button" className="btn" onClick={() => setRun(deal(Date.now() % 1_000_000_000))}>
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
        <div className="arcade-keys">
          <button type="button" className="btn" onClick={() => play('ArrowUp')}>
            Up
          </button>
          <button type="button" className="btn" onClick={() => play('ArrowLeft')}>
            Left
          </button>
          <button type="button" className="btn" onClick={() => play('ArrowRight')}>
            Right
          </button>
          <button type="button" className="btn" onClick={() => play('ArrowDown')}>
            Down
          </button>
        </div>
        <p className="hint">Arrow keys or the buttons slide the whole board.</p>
      </div>
    </ToolLayout>
  )
}
