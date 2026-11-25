export type Dir = 'left' | 'right' | 'up' | 'down'

function slideLeft(row: number[]): { row: number[]; score: number } {
  const tiles = row.filter((value) => value > 0)
  const out: number[] = []
  let score = 0
  for (let i = 0; i < tiles.length; i += 1) {
    if (tiles[i] === tiles[i + 1]) {
      const merged = tiles[i] * 2
      out.push(merged)
      score += merged
      i += 1
    } else {
      out.push(tiles[i])
    }
  }
  while (out.length < row.length) out.push(0)
  return { row: out, score }
}

function rotate(grid: number[][]): number[][] {
  const size = grid.length
  return Array.from({ length: size }, (_, x) => Array.from({ length: size }, (_, y) => grid[size - 1 - y][x]))
}

/** Slide every row toward `dir`. Equal tiles that meet merge once. */
export function moveGrid(grid: number[][], dir: Dir): { grid: number[][]; score: number; moved: boolean } {
  const turns = { left: 0, down: 1, right: 2, up: 3 }[dir]
  let turned = grid.map((row) => row.slice())
  for (let i = 0; i < turns; i += 1) turned = rotate(turned)
  let score = 0
  const slid = turned.map((row) => {
    const next = slideLeft(row)
    score += next.score
    return next.row
  })
  let back = slid
  for (let i = 0; i < (4 - turns) % 4; i += 1) back = rotate(back)
  const moved = back.some((row, y) => row.some((value, x) => value !== grid[y][x]))
  return { grid: back, score, moved }
}

export function emptySlide(): number[][] {
  return Array.from({ length: 4 }, () => Array(4).fill(0))
}

export function movesLeft(grid: number[][]): boolean {
  return (['left', 'right', 'up', 'down'] as const).some((dir) => moveGrid(grid, dir).moved)
}

export function reached2048(grid: number[][]): boolean {
  return grid.some((row) => row.some((value) => value >= 2048))
}

export function spawnRandom(grid: number[][], rand: () => number): number[][] {
  const open: { x: number; y: number }[] = []
  grid.forEach((row, y) => row.forEach((cell, x) => cell === 0 && open.push({ x, y })))
  if (!open.length) return grid
  const spot = open[Math.floor(rand() * open.length)]
  const value = rand() < 0.9 ? 2 : 4
  return grid.map((row, y) => row.map((cell, x) => (x === spot.x && y === spot.y ? value : cell)))
}

export function spawnTile(grid: number[][], value: number, index: number): number[][] {
  const open: { x: number; y: number }[] = []
  grid.forEach((row, y) => row.forEach((cell, x) => cell === 0 && open.push({ x, y })))
  if (!open.length) return grid
  const spot = open[index % open.length]
  return grid.map((row, y) => row.map((cell, x) => (x === spot.x && y === spot.y ? value : cell)))
}
