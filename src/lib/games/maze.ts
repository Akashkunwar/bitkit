import { mulberry32 } from './random'

const N = 1
const E = 2
const S = 4
const W = 8
const OPP: Record<number, number> = { 1: S, 2: W, 4: N, 8: E }
const DR: Record<number, number> = { 1: -1, 2: 0, 4: 1, 8: 0 }
const DC: Record<number, number> = { 1: 0, 2: 1, 4: 0, 8: -1 }

export type Maze = {
  w: number
  h: number
  open: number[]
  pr: number
  pc: number
  er: number
  ec: number
  won: boolean
}

export function freshMaze(seed = 1): Maze {
  const w = 15
  const h = 11
  const open = Array(w * h).fill(0)
  const seen = Array(w * h).fill(false)
  const rand = mulberry32(seed)
  const dirs = [N, E, S, W]
  function carve(row: number, col: number) {
    seen[row * w + col] = true
    const order = dirs.slice()
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    order.forEach((dir) => {
      const r = row + DR[dir]
      const c = col + DC[dir]
      if (r < 0 || c < 0 || r >= h || c >= w || seen[r * w + c]) return
      open[row * w + col] |= dir
      open[r * w + c] |= OPP[dir]
      carve(r, c)
    })
  }
  carve(0, 0)
  return { w, h, open, pr: 0, pc: 0, er: h - 1, ec: w - 1, won: false }
}

export function moveMaze(state: Maze, dir: number): Maze {
  if (state.won) return state
  if ((state.open[state.pr * state.w + state.pc] & dir) === 0) return state
  const pr = state.pr + DR[dir]
  const pc = state.pc + DC[dir]
  return { ...state, pr, pc, won: pr === state.er && pc === state.ec }
}

export const MAZE_N = N
export const MAZE_E = E
export const MAZE_S = S
export const MAZE_W = W
