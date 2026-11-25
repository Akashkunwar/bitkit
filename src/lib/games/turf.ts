import { nextRandom } from './random'

export const TURF_N = 36

export type Turf = {
  grid: number[]
  x: number
  y: number
  bx: number
  by: number
  dirX: number
  dirY: number
  bdx: number
  bdy: number
  trail: number[]
  botTrail: number[]
  dead: boolean
  score: number
  seed: number
}

function cell(x: number, y: number): number {
  return y * TURF_N + x
}

function inside(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < TURF_N && y < TURF_N
}

/** Trail cells become `owner`. Anything they seal off from the border is captured. */
export function claimTurf(grid: number[], trail: number[], owner: number): number[] {
  const next = grid.slice()
  for (const index of trail) next[index] = owner
  const seen = new Uint8Array(next.length)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    if (!inside(x, y)) return
    const index = cell(x, y)
    if (seen[index] || next[index] === owner) return
    seen[index] = 1
    stack.push(index)
  }
  for (let i = 0; i < TURF_N; i += 1) {
    push(i, 0)
    push(i, TURF_N - 1)
    push(0, i)
    push(TURF_N - 1, i)
  }
  while (stack.length) {
    const index = stack.pop() as number
    const x = index % TURF_N
    const y = Math.floor(index / TURF_N)
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }
  for (let index = 0; index < next.length; index += 1) {
    if (!seen[index]) next[index] = owner
  }
  return next
}

function paint(grid: number[], x: number, y: number, owner: number) {
  for (let dy = 0; dy < 4; dy += 1) {
    for (let dx = 0; dx < 4; dx += 1) grid[cell(x + dx, y + dy)] = owner
  }
}

export function freshTurf(seed = 2): Turf {
  const grid = Array.from({ length: TURF_N * TURF_N }, () => 0)
  paint(grid, 2, 16, 1)
  paint(grid, 30, 16, 2)
  return {
    grid,
    x: 3,
    y: 17,
    bx: 31,
    by: 17,
    dirX: 0,
    dirY: 0,
    bdx: 0,
    bdy: -1,
    trail: [],
    botTrail: [],
    dead: false,
    score: 16,
    seed,
  }
}

function turn(seed: number, dx: number, dy: number): { dx: number; dy: number; seed: number } {
  const roll = nextRandom(seed)
  if (roll.value > 0.2) return { dx, dy, seed: roll.seed }
  const left = roll.value < 0.1
  return { dx: left ? -dy : dy, dy: left ? dx : -dx, seed: roll.seed }
}

type Walker = { x: number; y: number; dx: number; dy: number; trail: number[]; owner: number }

function walk(grid: number[], walker: Walker): { grid: number[]; walker: Walker; died: boolean; cut: boolean } {
  const nx = walker.x + walker.dx
  const ny = walker.y + walker.dy
  if (!inside(nx, ny)) return { grid, walker, died: true, cut: false }
  const index = cell(nx, ny)
  const mine = grid[index] === walker.owner
  if (!mine && walker.trail.includes(index)) return { grid, walker, died: true, cut: false }
  if (mine && walker.trail.length > 0) {
    const claimed = claimTurf(grid, walker.trail, walker.owner)
    return { grid: claimed, walker: { ...walker, x: nx, y: ny, trail: [] }, died: false, cut: false }
  }
  const trail = mine ? walker.trail : walker.trail.concat(index)
  return { grid, walker: { ...walker, x: nx, y: ny, trail }, died: false, cut: false }
}

export function stepTurf(state: Turf, dx: number, dy: number): Turf {
  if (state.dead) return state
  let dirX = state.dirX
  let dirY = state.dirY
  if ((dx || dy) && !(dx === -dirX && dy === -dirY)) {
    dirX = Math.sign(dx)
    dirY = dx ? 0 : Math.sign(dy)
  }
  const idle = dirX === 0 && dirY === 0
  const player = idle
    ? {
        grid: state.grid,
        walker: { x: state.x, y: state.y, dx: 0, dy: 0, trail: state.trail, owner: 1 },
        died: false,
        cut: false,
      }
    : walk(state.grid, { x: state.x, y: state.y, dx: dirX, dy: dirY, trail: state.trail, owner: 1 })
  if (player.died) return { ...state, dead: true, dirX, dirY }

  let grid = player.grid
  let botTrail = state.botTrail.filter((index) => grid[index] !== 1)
  const trailCut = botTrail.length !== state.botTrail.length
  const turned = turn(state.seed, state.bdx, state.bdy)
  let bdx = turned.dx
  let bdy = turned.dy
  if (state.bx + bdx < 22) {
    bdx = 1
    bdy = 0
  }
  if (!inside(state.bx + bdx, state.by + bdy)) {
    bdx = bdx ? -bdx : 0
    bdy = bdx ? 0 : -bdy || 1
  }
  if (state.botTrail.length > 10) {
    bdx = Math.sign(31 - state.bx) || state.bdx
    bdy = Math.sign(17 - state.by) || 0
    if (bdx === -state.bdx && bdy === -state.bdy) bdx = state.bdx
  }
  const bot = walk(grid, {
    x: state.bx,
    y: state.by,
    dx: bdx,
    dy: bdy,
    trail: trailCut ? [] : botTrail,
    owner: 2,
  })
  const playerHitBot = bot.walker.trail.includes(cell(player.walker.x, player.walker.y))
  if (player.walker.trail.some((index) => index === cell(bot.walker.x, bot.walker.y)) || playerHitBot) {
    return {
      ...state,
      ...player.walker,
      x: player.walker.x,
      y: player.walker.y,
      dirX,
      dirY,
      dead: true,
      seed: turned.seed,
    }
  }

  grid = bot.died ? grid : bot.grid
  let bx = bot.walker.x
  let by = bot.walker.y
  botTrail = bot.died ? [] : bot.walker.trail
  if (bot.died || trailCut) {
    bdx = 0
    bdy = -1
    bx = 31
    by = 17
    botTrail = []
    if (grid[cell(bx, by)] !== 2) paint(grid, 30, 16, 2)
  }
  const score = grid.reduce((sum, owner) => sum + (owner === 1 ? 1 : 0), 0)
  return {
    grid,
    x: player.walker.x,
    y: player.walker.y,
    bx,
    by,
    dirX,
    dirY,
    bdx,
    bdy,
    trail: player.walker.trail,
    botTrail,
    dead: false,
    score,
    seed: turned.seed,
  }
}
