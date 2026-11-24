export type Mark = 'X' | 'O' | null

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function winner(board: Mark[]): 'X' | 'O' | 'draw' | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return board.every(Boolean) ? 'draw' : null
}

function score(board: Mark[], player: 'X' | 'O', depth: number): number {
  const result = winner(board)
  if (result === player) return 10 - depth
  if (result && result !== 'draw') return depth - 10
  if (result === 'draw') return 0
  const turn = board.filter(Boolean).length % 2 === 0 ? 'X' : 'O'
  let best = turn === player ? -Infinity : Infinity
  board.forEach((cell, index) => {
    if (cell) return
    const next = board.slice()
    next[index] = turn
    const value = score(next, player, depth + 1)
    best = turn === player ? Math.max(best, value) : Math.min(best, value)
  })
  return best
}

/** The move that wins, or blocks a loss. X always starts. */
export function bestMove(board: Mark[], player: 'X' | 'O'): number {
  let choice = board.findIndex((cell) => !cell)
  let best = -Infinity
  board.forEach((cell, index) => {
    if (cell) return
    const next = board.slice()
    next[index] = player
    const value = score(next, player, 0)
    if (value > best) {
      best = value
      choice = index
    }
  })
  return choice
}
