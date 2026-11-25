const SHAPE = ['..***..', '..***..', '*******', '***O***', '*******', '..***..', '..***..']

export type Pegs = { cells: string[]; selected: number; won: boolean }

export function freshPegs(): Pegs {
  return { cells: SHAPE.join('').split(''), selected: -1, won: false }
}

function canJump(cells: string[], from: number, to: number) {
  if (cells[from] !== '*' || cells[to] !== 'O') return false
  const row = Math.floor(from / 7)
  const col = from % 7
  const tr = Math.floor(to / 7)
  const tc = to % 7
  if (!((row === tr && Math.abs(col - tc) === 2) || (col === tc && Math.abs(row - tr) === 2))) return false
  const mid = ((row + tr) / 2) * 7 + (col + tc) / 2
  return cells[mid] === '*'
}

export function pegsStuck(cells: string[]) {
  const pegs = cells.filter((cell) => cell === '*').length
  if (pegs <= 1) return false
  for (let from = 0; from < cells.length; from += 1) {
    if (cells[from] !== '*') continue
    for (let to = 0; to < cells.length; to += 1) if (canJump(cells, from, to)) return false
  }
  return true
}

export function playPeg(state: Pegs, index: number): Pegs {
  if (state.won || state.cells[index] === '.') return state
  if (state.selected < 0) return state.cells[index] === '*' ? { ...state, selected: index } : state
  if (state.selected === index) return { ...state, selected: -1 }
  if (!canJump(state.cells, state.selected, index))
    return { ...state, selected: state.cells[index] === '*' ? index : -1 }
  const cells = state.cells.slice()
  const from = state.selected
  const mid = ((Math.floor(from / 7) + Math.floor(index / 7)) / 2) * 7 + ((from % 7) + (index % 7)) / 2
  cells[from] = 'O'
  cells[mid] = 'O'
  cells[index] = '*'
  const left = cells.filter((cell) => cell === '*').length
  return { cells, selected: -1, won: left === 1 }
}
