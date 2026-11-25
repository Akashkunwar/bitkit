export const FIVE_N = 11

export type Five = { cells: number[]; turn: 1 | 2; winner: 0 | 1 | 2 | 3 }

export function freshFive(): Five {
  return { cells: Array(FIVE_N * FIVE_N).fill(0), turn: 1, winner: 0 }
}

function won(cells: number[], index: number) {
  const player = cells[index]
  const row = Math.floor(index / FIVE_N)
  const col = index % FIVE_N
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]
  return dirs.some(([dc, dr]) => {
    let n = 1
    for (const sign of [1, -1]) {
      for (let k = 1; k < 5; k += 1) {
        const c = col + dc * k * sign
        const r = row + dr * k * sign
        if (c < 0 || r < 0 || c >= FIVE_N || r >= FIVE_N || cells[r * FIVE_N + c] !== player) break
        n += 1
      }
    }
    return n >= 5
  })
}

export function playFive(state: Five, index: number): Five {
  if (state.winner || state.cells[index]) return state
  const cells = state.cells.slice()
  cells[index] = state.turn
  const winner = won(cells, index) ? state.turn : cells.every((cell) => cell) ? 3 : 0
  return { cells, turn: state.turn === 1 ? 2 : 1, winner }
}

function lineAt(cells: number[], index: number) {
  const player = cells[index]
  const row = Math.floor(index / FIVE_N)
  const col = index % FIVE_N
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]
  return Math.max(
    ...dirs.map(([dc, dr]) => {
      let n = 1
      for (const sign of [1, -1]) {
        for (let k = 1; k < 5; k += 1) {
          const c = col + dc * k * sign
          const r = row + dr * k * sign
          if (c < 0 || r < 0 || c >= FIVE_N || r >= FIVE_N || cells[r * FIVE_N + c] !== player) break
          n += 1
        }
      }
      return n
    }),
  )
}

function threat(cells: number[], index: number, player: number) {
  const next = cells.slice()
  next[index] = player
  const length = lineAt(next, index)
  if (length >= 5) return 1000
  if (length === 4) return 40
  if (length === 3) return 12
  return length
}

export function cpuFive(state: Five): Five {
  if (state.winner || state.turn !== 2) return state
  let best = -1
  let score = -1
  state.cells.forEach((cell, index) => {
    if (cell) return
    const near = [-1, 0, 1].some((dr) =>
      [-1, 0, 1].some((dc) => {
        const r = Math.floor(index / FIVE_N) + dr
        const c = (index % FIVE_N) + dc
        return r >= 0 && c >= 0 && r < FIVE_N && c < FIVE_N && state.cells[r * FIVE_N + c] !== 0
      }),
    )
    if (!near && state.cells.some((filled) => filled)) return
    const value = threat(state.cells, index, 2) * 2 + threat(state.cells, index, 1)
    if (value > score) {
      score = value
      best = index
    }
  })
  if (best < 0) best = Math.floor((FIVE_N * FIVE_N) / 2)
  return playFive(state, best)
}
