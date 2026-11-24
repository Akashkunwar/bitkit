import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { adjacent, emptyMask, placeMines, reveal } from '../../lib/games/mines'

const COLS = 9
const ROWS = 9
const MINES = 10

type Board = { mines: boolean[][] | null; opened: boolean[][]; flags: boolean[][]; dead: boolean; seed: number }

function cellName(x: number, y: number, isOpen: boolean, flagged: boolean, mine: boolean | undefined, count: number) {
  const place = `Row ${y + 1}, column ${x + 1}`
  if (!isOpen) return `${place}, ${flagged ? 'flagged' : 'covered'}`
  if (mine) return `${place}, mine`
  return `${place}, ${count}`
}

function fresh(): Board {
  return {
    mines: null,
    opened: emptyMask(COLS, ROWS, false),
    flags: emptyMask(COLS, ROWS, false),
    dead: false,
    seed: 3,
  }
}

export default function MinesTool() {
  const [board, setBoard] = useState<Board>(fresh)

  const open = (x: number, y: number) => {
    setBoard((current) => {
      if (current.dead || current.flags[y][x] || current.opened[y][x]) return current
      const mines = current.mines ?? placeMines(COLS, ROWS, MINES, x, y, current.seed + x * 17 + y)
      const next = reveal(mines, current.opened, x, y)
      return { ...current, mines, opened: next.opened, dead: next.hit }
    })
  }

  const flag = (x: number, y: number) => {
    setBoard((current) => {
      if (current.opened[y][x]) return current
      const flags = current.flags.map((row) => row.slice())
      flags[y][x] = !flags[y][x]
      return { ...current, flags }
    })
  }

  const won = board.mines !== null && board.opened.flat().filter(Boolean).length === COLS * ROWS - MINES && !board.dead

  return (
    <ToolLayout
      title="Mines"
      lede="Open every safe square. The first click is never a mine. Right-click or Shift-click flags a square."
    >
      <div className="arcade">
        <div className="arcade-top">
          <strong>{won ? 'Clear' : board.dead ? 'Boom' : `${MINES} mines`}</strong>
          <button type="button" className="btn" onClick={() => setBoard({ ...fresh(), seed: board.seed + 1 })}>
            Restart
          </button>
        </div>
        <div className="arcade-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {board.opened.flatMap((row, y) =>
            row.map((isOpen, x) => {
              const mine = board.mines?.[y][x]
              const count = board.mines && isOpen ? adjacent(board.mines, x, y) : 0
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  className="arcade-cell"
                  aria-label={cellName(x, y, isOpen, board.flags[y][x], mine, count)}
                  onClick={(event) => {
                    if (event.shiftKey) flag(x, y)
                    else open(x, y)
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    flag(x, y)
                  }}
                >
                  {isOpen ? (mine ? '•' : count || '') : board.flags[y][x] ? '⚑' : ''}
                </button>
              )
            }),
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
