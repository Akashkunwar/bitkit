import { useEffect, useState } from 'react'
import { freshMaze, MAZE_E, MAZE_N, MAZE_S, MAZE_W, moveMaze, type Maze } from '../../lib/games/maze'
import { Arcade } from './kit'
import { isTypingTarget } from './loop'

const KEYS: Record<string, number> = { ArrowUp: MAZE_N, ArrowRight: MAZE_E, ArrowDown: MAZE_S, ArrowLeft: MAZE_W }

export default function MazeTool() {
  const [maze, setMaze] = useState<Maze>(() => freshMaze(2))
  const [seed, setSeed] = useState(2)
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const dir = KEYS[event.key]
      if (dir === undefined || isTypingTarget(event.target)) return
      event.preventDefault()
      setMaze((current) => moveMaze(current, dir))
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [])
  return (
    <Arcade
      title="Maze"
      lede="Arrow keys walk the passages. The green square is the way out."
      status={maze.won ? 'Out' : 'Find the exit'}
      onRestart={() => {
        const next = seed + 1
        setSeed(next)
        setMaze(freshMaze(next))
      }}
    >
      <div className="maze" style={{ gridTemplateColumns: `repeat(${maze.w}, 16px)` }}>
        {maze.open.map((mask, index) => {
          const row = Math.floor(index / maze.w)
          const col = index % maze.w
          const here = row === maze.pr && col === maze.pc
          const end = row === maze.er && col === maze.ec
          return (
            <i
              key={index}
              style={{
                borderTop: mask & MAZE_N ? '1px solid transparent' : undefined,
                borderRight: mask & MAZE_E ? '1px solid transparent' : undefined,
                borderBottom: mask & MAZE_S ? '1px solid transparent' : undefined,
                borderLeft: mask & MAZE_W ? '1px solid transparent' : undefined,
                background: here ? 'var(--accent, #c9f150)' : end ? '#3d4a28' : undefined,
              }}
            />
          )
        })}
      </div>
      <div className="arcade-keys">
        <button type="button" className="btn" onClick={() => setMaze((current) => moveMaze(current, MAZE_N))}>
          Up
        </button>
        <button type="button" className="btn" onClick={() => setMaze((current) => moveMaze(current, MAZE_W))}>
          Left
        </button>
        <button type="button" className="btn" onClick={() => setMaze((current) => moveMaze(current, MAZE_E))}>
          Right
        </button>
        <button type="button" className="btn" onClick={() => setMaze((current) => moveMaze(current, MAZE_S))}>
          Down
        </button>
      </div>
    </Arcade>
  )
}
