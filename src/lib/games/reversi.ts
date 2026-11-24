const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

export type Reversi = { cells: number[]; turn: 1 | -1; over: boolean }

export function freshReversi(): Reversi {
  const cells = Array(64).fill(0)
  cells[27] = -1
  cells[28] = 1
  cells[35] = 1
  cells[36] = -1
  return { cells, turn: 1, over: false }
}

export function flips(cells: number[], index: number, player: number): number[] {
  if (cells[index] !== 0) return []
  const row = Math.floor(index / 8)
  const col = index % 8
  const out: number[] = []
  for (const [dr, dc] of DIRS) {
    const line: number[] = []
    let r = row + dr
    let c = col + dc
    while (r >= 0 && c >= 0 && r < 8 && c < 8 && cells[r * 8 + c] === -player) {
      line.push(r * 8 + c)
      r += dr
      c += dc
    }
    if (line.length && r >= 0 && c >= 0 && r < 8 && c < 8 && cells[r * 8 + c] === player) out.push(...line)
  }
  return out
}

export function playReversi(state: Reversi, index: number): Reversi {
  if (state.over) return state
  const gained = flips(state.cells, index, state.turn)
  if (!gained.length) return state
  const cells = state.cells.slice()
  cells[index] = state.turn
  gained.forEach((cell) => {
    cells[cell] = state.turn
  })
  return advance({ ...state, cells, turn: (state.turn * -1) as 1 | -1 })
}

function any(cells: number[], player: number) {
  return cells.some((_, index) => flips(cells, index, player).length > 0)
}

function advance(state: Reversi): Reversi {
  if (any(state.cells, state.turn)) return state
  const other = (state.turn * -1) as 1 | -1
  if (any(state.cells, other)) return { ...state, turn: other }
  return { ...state, over: true }
}

export function cpuReversi(state: Reversi): Reversi {
  if (state.over || state.turn !== -1) return state
  let best = -1
  let bestScore = -1
  state.cells.forEach((_, index) => {
    const gained = flips(state.cells, index, -1)
    if (gained.length > bestScore) {
      bestScore = gained.length
      best = index
    }
  })
  return best < 0 ? state : playReversi(state, best)
}

export function reversiScore(cells: number[]) {
  return {
    you: cells.filter((cell) => cell === 1).length,
    them: cells.filter((cell) => cell === -1).length,
  }
}
