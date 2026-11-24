export type Connect = { cells: number[]; turn: 1 | 2; winner: 0 | 1 | 2 | 3 }

export function freshConnect(): Connect {
  return { cells: Array(42).fill(0), turn: 1, winner: 0 }
}

function dropRow(cells: number[], col: number) {
  for (let row = 5; row >= 0; row -= 1) if (cells[row * 7 + col] === 0) return row
  return -1
}

export function dropConnect(state: Connect, col: number): Connect {
  if (state.winner || col < 0 || col > 6) return state
  const row = dropRow(state.cells, col)
  if (row < 0) return state
  const cells = state.cells.slice()
  cells[row * 7 + col] = state.turn
  const winner = lineWinner(cells)
  const full = cells.every((cell) => cell !== 0)
  return { cells, turn: state.turn === 1 ? 2 : 1, winner: winner || (full ? 3 : 0) }
}

export function lineWinner(cells: number[]): 0 | 1 | 2 {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const player = cells[row * 7 + col]
      if (!player) continue
      for (const [dc, dr] of dirs) {
        let n = 1
        for (let k = 1; k < 4; k += 1) {
          const c = col + dc * k
          const r = row + dr * k
          if (c < 0 || r < 0 || c > 6 || r > 5 || cells[r * 7 + c] !== player) break
          n += 1
        }
        if (n >= 4) return player as 1 | 2
      }
    }
  }
  return 0
}

export function cpuConnect(state: Connect): Connect {
  if (state.winner || state.turn !== 2) return state
  const cols = [3, 2, 4, 1, 5, 0, 6]
  for (const col of cols) {
    const trial = dropConnect({ ...state, turn: 2 }, col)
    if (trial !== state && trial.winner === 2) return trial
  }
  for (const col of cols) {
    const threat = dropConnect({ ...state, turn: 1 }, col)
    if (threat.winner === 1 && dropRow(state.cells, col) >= 0) return dropConnect(state, col)
  }
  const open = cols.find((col) => dropRow(state.cells, col) >= 0)
  return open === undefined ? state : dropConnect(state, open)
}
