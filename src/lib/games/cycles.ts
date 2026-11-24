export const CYC_W = 40
export const CYC_H = 26

export type Cycles = {
  grid: number[]
  a: { x: number; y: number }
  b: { x: number; y: number }
  da: { x: number; y: number }
  db: { x: number; y: number }
  over: 0 | 1 | 2 | 3
}

function at(grid: number[], x: number, y: number) {
  if (x < 0 || y < 0 || x >= CYC_W || y >= CYC_H) return 9
  return grid[y * CYC_W + x]
}

function turn(dir: { x: number; y: number }, way: -1 | 1) {
  return way === -1 ? { x: -dir.y, y: dir.x } : { x: dir.y, y: -dir.x }
}

export function freshCycles(): Cycles {
  const grid = Array(CYC_W * CYC_H).fill(0)
  grid[13 * CYC_W + 4] = 1
  grid[13 * CYC_W + 35] = 2
  return { grid, a: { x: 4, y: 13 }, b: { x: 35, y: 13 }, da: { x: 1, y: 0 }, db: { x: -1, y: 0 }, over: 0 }
}

export function stepCycles(state: Cycles, steer: -1 | 0 | 1): Cycles {
  if (state.over) return state
  const da = steer === 0 ? state.da : turn(state.da, steer)
  let db = state.db
  const ahead = { x: state.b.x + db.x, y: state.b.y + db.y }
  if (at(state.grid, ahead.x, ahead.y) !== 0) {
    const left = turn(db, -1)
    const right = turn(db, 1)
    if (at(state.grid, state.b.x + left.x, state.b.y + left.y) === 0) db = left
    else if (at(state.grid, state.b.x + right.x, state.b.y + right.y) === 0) db = right
  }
  const na = { x: state.a.x + da.x, y: state.a.y + da.y }
  const nb = { x: state.b.x + db.x, y: state.b.y + db.y }
  const aHit = at(state.grid, na.x, na.y) !== 0 || (na.x === nb.x && na.y === nb.y)
  const bHit = at(state.grid, nb.x, nb.y) !== 0 || (na.x === nb.x && na.y === nb.y)
  const grid = state.grid.slice()
  let over: Cycles['over'] = 0
  if (aHit && bHit) over = 3
  else if (aHit) over = 2
  else if (bHit) over = 1
  if (!aHit) {
    grid[na.y * CYC_W + na.x] = 1
  }
  if (!bHit && !(na.x === nb.x && na.y === nb.y && aHit)) {
    grid[nb.y * CYC_W + nb.x] = 2
  }
  return { grid, a: aHit ? state.a : na, b: bHit ? state.b : nb, da, db, over }
}
