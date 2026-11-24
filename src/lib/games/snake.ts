import { mulberry32 } from './random'

export const SNAKE_COLS = 20
export const SNAKE_ROWS = 20

export type Cell = { x: number; y: number }
export type SnakeDir = 'up' | 'down' | 'left' | 'right'

const STEP: Record<SnakeDir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export function opposite(a: SnakeDir, b: SnakeDir): boolean {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  )
}

export function placeFood(body: Cell[], seed: number): Cell {
  const taken = new Set(body.map((cell) => `${cell.x},${cell.y}`))
  const open: Cell[] = []
  for (let y = 0; y < SNAKE_ROWS; y += 1) {
    for (let x = 0; x < SNAKE_COLS; x += 1) {
      if (!taken.has(`${x},${y}`)) open.push({ x, y })
    }
  }
  if (!open.length) return { x: 0, y: 0 }
  const rand = mulberry32(seed)
  return open[Math.floor(rand() * open.length)]
}

/** One step. The head is body[0]. Hitting a wall or the body ends the run. */
export function stepSnake(body: Cell[], dir: SnakeDir, food: Cell): { body: Cell[]; ate: boolean; dead: boolean } {
  const delta = STEP[dir]
  const head = { x: body[0].x + delta.x, y: body[0].y + delta.y }
  if (head.x < 0 || head.y < 0 || head.x >= SNAKE_COLS || head.y >= SNAKE_ROWS) {
    return { body, ate: false, dead: true }
  }
  const ate = head.x === food.x && head.y === food.y
  const next = [head, ...body]
  if (!ate) next.pop()
  if (next.slice(1).some((cell) => cell.x === head.x && cell.y === head.y)) {
    return { body, ate: false, dead: true }
  }
  return { body: next, ate, dead: false }
}
