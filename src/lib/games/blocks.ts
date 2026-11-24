export const BLOCK_COLS = 10
export const BLOCK_ROWS = 20

export type Grid = number[][]
export type Piece = { shape: number[][]; x: number; y: number; id: number }

const BASE: number[][][] = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
]

export function emptyBoard(): Grid {
  return Array.from({ length: BLOCK_ROWS }, () => Array(BLOCK_COLS).fill(0))
}

export function rotate(shape: number[][]): number[][] {
  const height = shape.length
  const width = shape[0].length
  const next = Array.from({ length: width }, () => Array(height).fill(0))
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) next[x][height - 1 - y] = shape[y][x]
  }
  return next
}

export function spawn(id: number): Piece {
  const shape = BASE[id % BASE.length].map((row) => row.slice())
  return { shape, x: Math.floor((BLOCK_COLS - shape[0].length) / 2), y: 0, id }
}

export function collides(board: Grid, piece: Piece): boolean {
  for (let y = 0; y < piece.shape.length; y += 1) {
    for (let x = 0; x < piece.shape[y].length; x += 1) {
      if (!piece.shape[y][x]) continue
      const bx = piece.x + x
      const by = piece.y + y
      if (bx < 0 || bx >= BLOCK_COLS || by >= BLOCK_ROWS) return true
      if (by >= 0 && board[by][bx]) return true
    }
  }
  return false
}

export function nudge(board: Grid, piece: Piece, dx: number, dy: number, shape = piece.shape): Piece | null {
  const kicks = dx === 0 && shape !== piece.shape ? [0, -1, 1, -2, 2] : [0]
  for (const kick of kicks) {
    const next = { ...piece, shape, x: piece.x + dx + kick, y: piece.y + dy }
    if (!collides(board, next)) return next
  }
  return null
}

export function lockPiece(board: Grid, piece: Piece): Grid {
  const next = board.map((row) => row.slice())
  for (let y = 0; y < piece.shape.length; y += 1) {
    for (let x = 0; x < piece.shape[y].length; x += 1) {
      if (!piece.shape[y][x]) continue
      const by = piece.y + y
      const bx = piece.x + x
      if (by >= 0 && by < BLOCK_ROWS && bx >= 0 && bx < BLOCK_COLS) next[by][bx] = piece.id + 1
    }
  }
  return next
}

export function clearLines(board: Grid): { board: Grid; cleared: number } {
  const kept = board.filter((row) => row.some((cell) => cell === 0))
  const cleared = board.length - kept.length
  const blank = Array.from({ length: cleared }, () => Array(BLOCK_COLS).fill(0))
  return { board: [...blank, ...kept], cleared }
}

/** Drop one row, or lock the piece and bring in `nextId`. `spawned` is true only when a new piece entered. */
export function drop(
  board: Grid,
  piece: Piece,
  nextId: number,
): { board: Grid; piece: Piece; cleared: number; dead: boolean; spawned: boolean } {
  const fallen = nudge(board, piece, 0, 1)
  if (fallen) return { board, piece: fallen, cleared: 0, dead: false, spawned: false }
  const locked = clearLines(lockPiece(board, piece))
  const spawned = spawn(nextId)
  if (collides(locked.board, spawned))
    return { board: locked.board, piece: spawned, cleared: locked.cleared, dead: true, spawned: true }
  return { board: locked.board, piece: spawned, cleared: locked.cleared, dead: false, spawned: true }
}
