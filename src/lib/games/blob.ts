import { nextRandom } from './random'

export const BLOB_W = 480
export const BLOB_H = 360
export const BLOB_WORLD = 1500

export type BlobCell = { id: number; x: number; y: number; r: number; bot: boolean }
export type BlobDot = { x: number; y: number }

export type BlobGame = {
  cells: BlobCell[]
  dots: BlobDot[]
  dead: boolean
  score: number
  seed: number
}

function clamp(value: number): number {
  return Math.max(20, Math.min(BLOB_WORLD - 20, value))
}

export function freshBlob(seed = 5): BlobGame {
  let next = seed
  const dots: BlobDot[] = []
  for (let i = 0; i < 80; i += 1) {
    const x = nextRandom(next)
    const y = nextRandom(x.seed)
    next = y.seed
    dots.push({ x: x.value * BLOB_WORLD, y: y.value * BLOB_WORLD })
  }
  const cells: BlobCell[] = [{ id: 0, x: BLOB_WORLD / 2, y: BLOB_WORLD / 2, r: 18, bot: false }]
  for (let id = 1; id <= 7; id += 1) {
    const x = nextRandom(next)
    const y = nextRandom(x.seed)
    const size = nextRandom(y.seed)
    next = size.seed
    cells.push({ id, x: x.value * BLOB_WORLD, y: y.value * BLOB_WORLD, r: 14 + size.value * 20, bot: true })
  }
  return { cells, dots, dead: false, score: 18, seed: next }
}

export function stepBlob(state: BlobGame, dx: number, dy: number): BlobGame {
  if (state.dead) return state
  let seed = state.seed
  const cells = state.cells.map((cell) => ({ ...cell }))
  let dots = state.dots.map((dot) => ({ ...dot }))
  const you = cells.find((cell) => cell.id === 0)
  if (!you) return { ...state, dead: true }

  const length = Math.hypot(dx, dy)
  if (length > 0) {
    const speed = 2.7 * Math.sqrt(18 / you.r)
    you.x = clamp(you.x + (dx / length) * speed)
    you.y = clamp(you.y + (dy / length) * speed)
  }

  for (const bot of cells) {
    if (!bot.bot) continue
    const roll = nextRandom(seed)
    seed = roll.seed
    const aim = dots[Math.floor(roll.value * dots.length)] ?? you
    const angle = Math.atan2(aim.y - bot.y, aim.x - bot.x)
    const speed = 1.5 * Math.sqrt(18 / Math.max(12, bot.r))
    bot.x = clamp(bot.x + Math.cos(angle) * speed)
    bot.y = clamp(bot.y + Math.sin(angle) * speed)
  }

  dots = dots.filter((dot) => {
    for (const cell of cells) {
      if (Math.hypot(cell.x - dot.x, cell.y - dot.y) < cell.r) {
        cell.r = Math.min(90, Math.sqrt(cell.r * cell.r + 7))
        return false
      }
    }
    return true
  })
  while (dots.length < 80) {
    const x = nextRandom(seed)
    const y = nextRandom(x.seed)
    seed = y.seed
    dots.push({ x: x.value * BLOB_WORLD, y: y.value * BLOB_WORLD })
  }

  let dead = false
  const alive: BlobCell[] = []
  for (const cell of cells) {
    const hunter = cells.find(
      (other) =>
        other !== cell &&
        other.r > cell.r * 1.12 &&
        Math.hypot(other.x - cell.x, other.y - cell.y) < other.r - cell.r * 0.25,
    )
    if (!hunter) {
      alive.push(cell)
      continue
    }
    hunter.r = Math.min(110, Math.sqrt(hunter.r * hunter.r + cell.r * cell.r * 0.45))
    if (cell.id === 0) dead = true
  }

  while (alive.filter((cell) => cell.bot).length < 7 && !dead) {
    const x = nextRandom(seed)
    const y = nextRandom(x.seed)
    seed = y.seed
    const id = alive.reduce((max, cell) => Math.max(max, cell.id), 0) + 1
    alive.push({ id, x: x.value * BLOB_WORLD, y: y.value * BLOB_WORLD, r: 14, bot: true })
  }

  const player = alive.find((cell) => cell.id === 0)
  return { cells: alive, dots, dead, score: player ? Math.round(player.r) : state.score, seed }
}
