export type Move = { from: number; to: number; capture: number }
export type Draughts = { cells: number[]; turn: 1 | -1; over: 0 | 1 | -1; chain: number }

function inside(row: number, col: number) {
  return row >= 0 && col >= 0 && row < 8 && col < 8
}

export function freshDraughts(): Draughts {
  const cells = Array(64).fill(0)
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 0) continue
      if (row < 3) cells[row * 8 + col] = -1
      if (row > 4) cells[row * 8 + col] = 1
    }
  }
  return { cells, turn: 1, over: 0, chain: -1 }
}

export function draughtMoves(cells: number[], side: 1 | -1, onlyFrom = -1): Move[] {
  const quiet: Move[] = []
  const jumps: Move[] = []
  cells.forEach((piece, index) => {
    if (piece * side <= 0) return
    if (onlyFrom >= 0 && index !== onlyFrom) return
    const row = Math.floor(index / 8)
    const col = index % 8
    const dirs = Math.abs(piece) === 2 ? [-1, 1] : [side === 1 ? -1 : 1]
    dirs.forEach((dr) => {
      ;[-1, 1].forEach((dc) => {
        const r = row + dr
        const c = col + dc
        if (!inside(r, c)) return
        const mid = r * 8 + c
        if (cells[mid] === 0) quiet.push({ from: index, to: mid, capture: -1 })
        const r2 = row + dr * 2
        const c2 = col + dc * 2
        if (!inside(r2, c2)) return
        const land = r2 * 8 + c2
        if (cells[mid] * side < 0 && cells[land] === 0) jumps.push({ from: index, to: land, capture: mid })
      })
    })
  })
  return jumps.length ? jumps : quiet
}

function crown(piece: number, to: number) {
  const row = Math.floor(to / 8)
  if (piece === 1 && row === 0) return 2
  if (piece === -1 && row === 7) return -2
  return piece
}

export function playDraughts(state: Draughts, move: Move): Draughts {
  const allowed = draughtMoves(state.cells, state.turn, state.chain)
  if (!allowed.some((item) => item.from === move.from && item.to === move.to)) return state
  const cells = state.cells.slice()
  const before = cells[move.from]
  const piece = crown(before, move.to)
  cells[move.from] = 0
  if (move.capture >= 0) cells[move.capture] = 0
  cells[move.to] = piece
  // Reaching the back rank crowns the man and ends the turn, even mid-capture.
  if (move.capture >= 0 && piece === before) {
    const more = draughtMoves(cells, state.turn, move.to).filter((item) => item.capture >= 0)
    if (more.length) return { cells, turn: state.turn, over: 0, chain: move.to }
  }
  const turn = (state.turn * -1) as 1 | -1
  const over = draughtMoves(cells, turn).length === 0 ? state.turn : 0
  return { cells, turn, over, chain: -1 }
}

export function cpuDraughts(state: Draughts): Draughts {
  if (state.over || state.turn !== -1) return state
  const list = draughtMoves(state.cells, -1, state.chain)
  if (!list.length) return { ...state, over: 1 }
  return playDraughts(state, list[0])
}
