import { useEffect, useRef, useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { freshSudoku, sudokuSolved } from '../../lib/games/sudoku'
import { Arcade } from './kit'
import { isTypingTarget } from './loop'

export default function SudokuTool() {
  const [made, setMade] = useState(() => freshSudoku(mulberry32(15)))
  const [grid, setGrid] = useState(made.puzzle.slice())
  const [sel, setSel] = useState(0)
  const selRef = useRef(sel)
  const givenRef = useRef(made.given)
  selRef.current = sel
  givenRef.current = made.given
  const put = (value: number) => {
    if (givenRef.current[selRef.current]) return
    const at = selRef.current
    setGrid((current) => current.map((cell, index) => (index === at ? value : cell)))
  }
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault()
        put(Number(event.key))
      } else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        event.preventDefault()
        put(0)
      } else if (event.key === 'ArrowRight') setSel((index) => Math.min(80, index + 1))
      else if (event.key === 'ArrowLeft') setSel((index) => Math.max(0, index - 1))
      else if (event.key === 'ArrowDown') setSel((index) => Math.min(80, index + 9))
      else if (event.key === 'ArrowUp') setSel((index) => Math.max(0, index - 9))
      else return
      if (event.key.startsWith('Arrow')) event.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])
  return (
    <Arcade
      title="Sudoku"
      lede="Fill every row, column, and 3 by 3 box with 1 to 9. Given numbers stay put."
      status={sudokuSolved(grid) ? 'Solved' : 'Pick a cell'}
      onRestart={() => {
        const next = freshSudoku(mulberry32(Date.now() % 100000))
        setMade(next)
        setGrid(next.puzzle.slice())
      }}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(9, 1fr)', maxWidth: 360, gap: 2 }}>
        {grid.map((cell, index) => {
          const row = Math.floor(index / 9) + 1
          const column = (index % 9) + 1
          return (
            <button
              key={index}
              type="button"
              className={sel === index ? 'arcade-cell arcade-tile' : 'arcade-cell'}
              style={{
                fontWeight: made.given[index] ? 800 : 500,
                borderLeft: column % 3 === 1 ? '2px solid var(--ink)' : undefined,
                borderTop: row % 3 === 1 ? '2px solid var(--ink)' : undefined,
              }}
              aria-label={cell ? `Row ${row}, column ${column}, ${cell}` : `Row ${row}, column ${column}, empty`}
              onClick={() => setSel(index)}
            >
              {cell || ''}
            </button>
          )
        })}
      </div>
      <div className="arcade-keys">
        {Array.from({ length: 9 }, (_, value) => (
          <button key={value} type="button" className="btn" onClick={() => put(value + 1)}>
            {value + 1}
          </button>
        ))}
        <button type="button" className="btn" onClick={() => put(0)}>
          Clear
        </button>
      </div>
    </Arcade>
  )
}
