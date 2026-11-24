import { useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { freshSudoku, sudokuSolved } from '../../lib/games/sudoku'
import { Arcade } from './kit'

export default function SudokuTool() {
  const [made, setMade] = useState(() => freshSudoku(mulberry32(15)))
  const [grid, setGrid] = useState(made.puzzle.slice())
  const [sel, setSel] = useState(0)
  const put = (value: number) => {
    if (made.given[sel]) return
    setGrid((current) => current.map((cell, index) => (index === sel ? value : cell)))
  }
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
              style={{ fontWeight: made.given[index] ? 800 : 500 }}
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
