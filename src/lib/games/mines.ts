export function emptyMask(cols: number, rows: number, value: boolean): boolean[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(value))
}

export function placeMines(
  cols: number,
  rows: number,
  count: number,
  safeX: number,
  safeY: number,
  seed: number,
): boolean[][] {
  const spots: { x: number; y: number }[] = []
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue
      spots.push({ x, y })
    }
  }
  let state = seed >>> 0
  const rand = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = spots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[spots[i], spots[j]] = [spots[j], spots[i]]
  }
  const mines = emptyMask(cols, rows, false)
  for (const spot of spots.slice(0, Math.min(count, spots.length))) mines[spot.y][spot.x] = true
  return mines
}

export function adjacent(mines: boolean[][], x: number, y: number): number {
  let count = 0
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue
      const ny = y + dy
      const nx = x + dx
      if (mines[ny]?.[nx]) count += 1
    }
  }
  return count
}

/** Open a cell. A zero opens its neighbours. A mine opens every mine. */
export function reveal(
  mines: boolean[][],
  opened: boolean[][],
  x: number,
  y: number,
): { opened: boolean[][]; hit: boolean } {
  if (opened[y][x]) return { opened, hit: false }
  if (mines[y][x]) {
    return { opened: mines.map((row, yy) => row.map((mine, xx) => opened[yy][xx] || mine)), hit: true }
  }
  const next = opened.map((row) => row.slice())
  const stack = [[x, y]]
  while (stack.length) {
    const [cx, cy] = stack.pop() as [number, number]
    if (cy < 0 || cx < 0 || cy >= next.length || cx >= next[0].length) continue
    if (next[cy][cx] || mines[cy][cx]) continue
    next[cy][cx] = true
    if (adjacent(mines, cx, cy) !== 0) continue
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const ny = cy + dy
        const nx = cx + dx
        if (next[ny]?.[nx] === false) stack.push([nx, ny])
      }
    }
  }
  return { opened: next, hit: false }
}
