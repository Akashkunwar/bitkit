type Point = { x: number; y: number }

const STITCH_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function perlerCounts(colors: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const color of colors) counts[color] = (counts[color] ?? 0) + 1
  return counts
}

/** One symbol per cell. The same color always maps to the same alphabet symbol. */
export function stitchSymbols(colors: string[]): string[] {
  const assigned = new Map<string, string>()
  return colors.map((color) => {
    const existing = assigned.get(color)
    if (existing) return existing
    const symbol = STITCH_ALPHABET[assigned.size % STITCH_ALPHABET.length]
    assigned.set(color, symbol)
    return symbol
  })
}

export function brickCount(width: number, height: number): number {
  return width * height
}

/** Shrink a grid by an integer factor. A 4×4 block of 1s at factor 2 becomes 2×2. */
export function downscale(grid: number[][], factor: number): number[][] {
  const scale = Math.max(1, Math.floor(factor))
  const rows = Math.floor(grid.length / scale)
  const cols = grid[0] ? Math.floor(grid[0].length / scale) : 0
  const out: number[][] = []
  for (let r = 0; r < rows; r += 1) {
    const row: number[] = []
    for (let c = 0; c < cols; c += 1) {
      let sum = 0
      let count = 0
      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          sum += grid[r * scale + y]?.[c * scale + x] ?? 0
          count += 1
        }
      }
      row.push(count ? Math.round(sum / count) : 0)
    }
    out.push(row)
  }
  return out
}

/** Paint-by-numbers ids. Equal colors share an id, starting at 1. */
export function paintIds(colors: string[]): number[] {
  const assigned = new Map<string, number>()
  return colors.map((color) => {
    const existing = assigned.get(color)
    if (existing !== undefined) return existing
    const id = assigned.size + 1
    assigned.set(color, id)
    return id
  })
}

/** Chords between nail indexes. Each pair joins two different nails. */
export function stringArtSteps(nails: number): [number, number][] {
  const count = Math.floor(nails)
  if (count < 2) return []
  let jump = Math.max(1, Math.round(count * 0.382))
  if (jump % count === 0) jump = 1
  const steps: [number, number][] = []
  for (let from = 0; from < count; from += 1) {
    const to = (from + jump) % count
    if (from !== to) steps.push([from, to])
  }
  return steps
}

/** Integer Minecraft-circle offsets. Radius 2 includes the four axis points. */
export function circlePoints(radius: number): Point[] {
  const r = Math.max(0, Math.round(radius))
  const points: Point[] = []
  const seen = new Set<string>()
  const add = (x: number, y: number) => {
    const key = `${x},${y}`
    if (seen.has(key)) return
    seen.add(key)
    points.push({ x, y })
  }
  if (r === 0) {
    add(0, 0)
    return points
  }
  let x = r
  let y = 0
  let decision = 1 - r
  while (x >= y) {
    add(x, y)
    add(y, x)
    add(-x, y)
    add(-y, x)
    add(-x, -y)
    add(-y, -x)
    add(x, -y)
    add(y, -x)
    y += 1
    if (decision < 0) decision += 2 * y + 1
    else {
      x -= 1
      decision += 2 * (y - x) + 1
    }
  }
  return points
}

/**
 * Filled sphere as horizontal slices from the bottom (y = -r) to the top (y = r).
 * Each layer is [x, z, x, z, ...] for the blocks in that slice.
 */
export function sphereLayers(radius: number): number[][] {
  const r = Math.max(0, Math.round(radius))
  const layers: number[][] = []
  for (let y = -r; y <= r; y += 1) {
    const layer: number[] = []
    for (let x = -r; x <= r; x += 1) {
      for (let z = -r; z <= r; z += 1) {
        if (x * x + y * y + z * z <= r * r) layer.push(x, z)
      }
    }
    layers.push(layer)
  }
  return layers
}

/** Upper half of the sphere, including the middle layer. */
export function domeLayers(radius: number): number[][] {
  const layers = sphereLayers(radius)
  return layers.slice(Math.floor(layers.length / 2)).map((layer) => layer.slice())
}
