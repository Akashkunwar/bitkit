function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function secretSanta(names: string[], seed: number): { from: string; to: string }[] {
  const people = names.map((name) => name.trim()).filter(Boolean)
  if (people.length < 2) throw new Error('Add at least two names.')
  if (new Set(people.map((name) => name.toLowerCase())).size !== people.length) {
    throw new Error('Use a different name for each person.')
  }
  const rand = mulberry32(seed)
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const targets = [...people]
    for (let i = targets.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      const swap = targets[i]
      targets[i] = targets[j]
      targets[j] = swap
    }
    if (targets.every((name, index) => name !== people[index])) {
      return people.map((from, index) => ({ from, to: targets[index] }))
    }
  }
  return people.map((from, index) => ({ from, to: people[(index + 1) % people.length] }))
}

/** 5×5 card. Center is 0, which the sheet prints as FREE. */
export function bingoCard(seed: number): number[][] {
  const rand = mulberry32(seed)
  const ranges: [number, number][] = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ]
  const cols = ranges.map(([lo, hi]) => {
    const pool = Array.from({ length: hi - lo + 1 }, (_, index) => lo + index)
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      const swap = pool[i]
      pool[i] = pool[j]
      pool[j] = swap
    }
    return pool.slice(0, 5)
  })
  const grid = Array.from({ length: 5 }, (_, row) => cols.map((col) => col[row]))
  grid[2][2] = 0
  return grid
}

export function wordSearch(words: string[], size: number, seed: number): { grid: string[][]; placed: string[] } {
  const n = Math.min(18, Math.max(8, Math.floor(size)))
  const grid = Array.from({ length: n }, () => Array.from({ length: n }, () => ''))
  const rand = mulberry32(seed)
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [0, -1],
    [-1, 0],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ]
  const placed: string[] = []
  for (const raw of words) {
    const word = raw
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
    if (word.length < 2 || word.length > n || placed.includes(word)) continue
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const [dr, dc] = dirs[Math.floor(rand() * dirs.length)]
      const row = Math.floor(rand() * n)
      const col = Math.floor(rand() * n)
      const cells: [number, number][] = []
      let fits = true
      for (let i = 0; i < word.length; i += 1) {
        const r = row + dr * i
        const c = col + dc * i
        if (r < 0 || c < 0 || r >= n || c >= n || (grid[r][c] && grid[r][c] !== word[i])) {
          fits = false
          break
        }
        cells.push([r, c])
      }
      if (!fits) continue
      cells.forEach(([r, c], index) => {
        grid[r][c] = word[index]
      })
      placed.push(word)
      break
    }
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(rand() * letters.length)]
    }
  }
  return { grid, placed }
}

/** Odd-sized wall grid. `true` is a wall. */
export function maze(cols: number, rows: number, seed: number): boolean[][] {
  const width = Math.min(41, Math.max(11, Math.floor(cols) | 1))
  const height = Math.min(41, Math.max(11, Math.floor(rows) | 1))
  const wall = Array.from({ length: height }, () => Array.from({ length: width }, () => true))
  const rand = mulberry32(seed)
  const stack: [number, number][] = [[1, 1]]
  wall[1][1] = false
  const dirs: [number, number][] = [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0],
  ]
  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const options = dirs.filter(([dr, dc]) => {
      const nr = r + dr
      const nc = c + dc
      return nr > 0 && nc > 0 && nr < height && nc < width && wall[nr][nc]
    })
    if (!options.length) {
      stack.pop()
      continue
    }
    const [dr, dc] = options[Math.floor(rand() * options.length)]
    wall[r + dr / 2][c + dc / 2] = false
    wall[r + dr][c + dc] = false
    stack.push([r + dr, c + dc])
  }
  wall[1][0] = false
  wall[height - 2][width - 1] = false
  return wall
}

export const CHRISTMAS_WORDS = [
  'tree',
  'lights',
  'snow',
  'gift',
  'cookie',
  'stocking',
  'reindeer',
  'carol',
  'star',
  'wreath',
  'cocoa',
  'candle',
  'bell',
  'sleigh',
  'holly',
  'mitten',
  'scarf',
  'frost',
  'ornament',
  'pudding',
  'ribbon',
  'angel',
  'nutmeg',
  'chimney',
]

/** 5×5 word card. The center is null, which the sheet prints as FREE. */
export function wordBingo(words: string[], seed: number): (string | null)[][] {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const raw of words) {
    const word = raw.trim()
    const key = word.toLowerCase()
    if (!word || seen.has(key)) continue
    seen.add(key)
    unique.push(word)
  }
  if (unique.length < 24) throw new Error('Add 24 different words.')
  const rand = mulberry32(seed)
  const pool = [...unique]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const swap = pool[i]
    pool[i] = pool[j]
    pool[j] = swap
  }
  const chosen = pool.slice(0, 24)
  const grid: (string | null)[][] = []
  let cursor = 0
  for (let row = 0; row < 5; row += 1) {
    const line: (string | null)[] = []
    for (let col = 0; col < 5; col += 1) {
      if (row === 2 && col === 2) line.push(null)
      else {
        line.push(chosen[cursor])
        cursor += 1
      }
    }
    grid.push(line)
  }
  return grid
}

export function seatNames(names: string[], perTable: number, seed: number): string[][] {
  const people = names.map((name) => name.trim()).filter(Boolean)
  const size = Math.floor(perTable)
  if (people.length < 2) throw new Error('Add at least two names.')
  if (size < 2) throw new Error('Put at least two seats at a table.')
  const rand = mulberry32(seed)
  const pool = [...people]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const swap = pool[i]
    pool[i] = pool[j]
    pool[j] = swap
  }
  const tables: string[][] = []
  for (let i = 0; i < pool.length; i += size) tables.push(pool.slice(i, i + size))
  return tables
}
