type Point = { x: number; y: number }
type Body = { x: number; y: number; vx: number; vy: number }
type TimelinePoint = { lat: number; lng: number; time: string }

const SIGN_STARTS: { month: number; day: number; sign: string }[] = [
  { month: 1, day: 20, sign: 'Aquarius' },
  { month: 2, day: 19, sign: 'Pisces' },
  { month: 3, day: 21, sign: 'Aries' },
  { month: 4, day: 20, sign: 'Taurus' },
  { month: 5, day: 21, sign: 'Gemini' },
  { month: 6, day: 21, sign: 'Cancer' },
  { month: 7, day: 23, sign: 'Leo' },
  { month: 8, day: 23, sign: 'Virgo' },
  { month: 9, day: 23, sign: 'Libra' },
  { month: 10, day: 23, sign: 'Scorpio' },
  { month: 11, day: 22, sign: 'Sagittarius' },
  { month: 12, day: 22, sign: 'Capricorn' },
]

/** Button labels for the visited-countries list. This is not a map. */
export const COUNTRIES = [
  'Argentina',
  'Australia',
  'Brazil',
  'Canada',
  'Chile',
  'China',
  'Egypt',
  'France',
  'Germany',
  'India',
  'Indonesia',
  'Italy',
  'Japan',
  'Kenya',
  'Mexico',
  'Nigeria',
  'Norway',
  'Spain',
  'Sweden',
  'United Kingdom',
  'United States',
  'South Korea',
]

function live(grid: number[][], row: number, col: number): number {
  if (row < 0 || col < 0 || row >= grid.length) return 0
  return grid[row][col] ? 1 : 0
}

/** Conway's Life. Reads `grid` and returns a new one. */
export function stepLife(grid: number[][]): number[][] {
  return grid.map((row, r) =>
    row.map((cell, c) => {
      let neighbors = 0
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr !== 0 || dc !== 0) neighbors += live(grid, r + dr, c + dc)
        }
      }
      if (cell) return neighbors === 2 || neighbors === 3 ? 1 : 0
      return neighbors === 3 ? 1 : 0
    }),
  )
}

/** Particle life keeps the same number of particles. */
export function stepParticles(count: number): number {
  return count
}

/**
 * Every unsupported grain drops one cell. A grain sitting at the top therefore
 * falls one cell when `falling` is true. The input column is not changed.
 */
export function stepSand(column: number[], falling: boolean): number[] {
  const next = column.slice()
  if (!falling) return next
  for (let i = next.length - 2; i >= 0; i -= 1) {
    if (next[i] !== 0 && next[i + 1] === 0) {
      next[i + 1] = next[i]
      next[i] = 0
    }
  }
  return next
}

/** Iterations until |z| leaves the set, or `max` when the point stays inside. */
export function mandelbrotEscape(x: number, y: number, max = 20): number {
  let zr = 0
  let zi = 0
  for (let i = 0; i < max; i += 1) {
    const zr2 = zr * zr - zi * zi + x
    const zi2 = 2 * zr * zi + y
    zr = zr2
    zi = zi2
    if (zr * zr + zi * zi > 4) return i + 1
  }
  return max
}

export function primesUpTo(n: number): number[] {
  const limit = Math.floor(n)
  if (limit < 2) return []
  const composite = Array<boolean>(limit + 1).fill(false)
  const primes: number[] = []
  for (let value = 2; value <= limit; value += 1) {
    if (composite[value]) continue
    primes.push(value)
    for (let multiple = value * value; multiple <= limit; multiple += value) composite[multiple] = true
  }
  return primes
}

/** One step of a simple pendulum. Both results stay finite for finite inputs. */
export function stepPendulum(theta: number, omega: number, dt: number): { theta: number; omega: number } {
  const nextOmega = omega - Math.sin(theta) * dt
  return { theta: theta + nextOmega * dt, omega: nextOmega }
}

export function dropBall(bins: number[], bin: number): number[] {
  const next = bins.slice()
  if (bin >= 0 && bin < next.length) next[bin] += 1
  return next
}

/** Snapshot of a cradle. The lifted ball is an end: index 0 or n - 1. */
export function cradleFrame(n: number, tick: number): number[] {
  const count = Math.max(0, Math.floor(n))
  if (count === 0) return []
  const lifted = Math.abs(Math.floor(tick)) % 2 === 0 ? 0 : count - 1
  return Array.from({ length: count }, (_, index) => (index === lifted ? 1 : 0))
}

export function harmonographPoints(steps: number): Point[] {
  const count = Math.max(0, Math.floor(steps))
  const points: Point[] = []
  for (let i = 0; i < count; i += 1) {
    const t = i * 0.02
    points.push({
      x: Math.sin(2 * t) * Math.exp(-0.008 * t) + 0.45 * Math.sin(3 * t) * Math.exp(-0.012 * t),
      y: Math.sin(3 * t + 0.4) * Math.exp(-0.01 * t) + 0.35 * Math.sin(2 * t + 1.2) * Math.exp(-0.006 * t),
    })
  }
  return points
}

export function spirographPoints(steps: number): Point[] {
  const count = Math.max(0, Math.floor(steps))
  const ring = 5
  const wheel = 3
  const pen = 2.2
  const points: Point[] = []
  for (let i = 0; i < count; i += 1) {
    const t = (i / Math.max(count, 1)) * Math.PI * 12
    const turn = (ring - wheel) / wheel
    points.push({
      x: (ring - wheel) * Math.cos(t) + pen * Math.cos(turn * t),
      y: (ring - wheel) * Math.sin(t) - pen * Math.sin(turn * t),
    })
  }
  return points
}

export function stepBodies(bodies: Body[]): Body[] {
  const next = bodies.map((body) => ({ ...body }))
  const gravity = 0.02
  for (let i = 0; i < next.length; i += 1) {
    let ax = 0
    let ay = 0
    for (let j = 0; j < next.length; j += 1) {
      if (i === j) continue
      const dx = next[j].x - next[i].x
      const dy = next[j].y - next[i].y
      const dist2 = dx * dx + dy * dy + 0.25
      const pull = gravity / (dist2 * Math.sqrt(dist2))
      ax += dx * pull
      ay += dy * pull
    }
    next[i].vx += ax
    next[i].vy += ay
  }
  for (const body of next) {
    body.x += body.vx
    body.y += body.vy
  }
  return next
}

export function planetAngle(index: number, tick: number): number {
  const orbit = (Math.abs(Math.floor(index)) + 1) ** 2
  return (tick / (24 * orbit)) * Math.PI * 2
}

/** Horizontal distance of a projectile launched at `angleRad`. */
export function trajectory(v: number, angleRad: number, g = 9.81): { range: number } {
  return { range: (v * v * Math.sin(2 * angleRad)) / g }
}

/** Small-angle period of a pendulum of the given length. */
export function period(length: number, g = 9.81): number {
  return 2 * Math.PI * Math.sqrt(length / g)
}

/** Tropical sun sign from a calendar date. No houses and no ephemeris. */
export function sunSign(month: number, day: number): string {
  let sign = 'Capricorn'
  for (const start of SIGN_STARTS) {
    if (month > start.month || (month === start.month && day >= start.day)) sign = start.sign
  }
  return sign
}

export function toggleCountry(selected: string[], name: string): string[] {
  if (selected.includes(name)) return selected.filter((country) => country !== name)
  return [...selected, name]
}

/** Parse a local JSON list of places. Does not fetch a map. */
export function parseTimeline(text: string): TimelinePoint[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON. Paste an array of points with lat, lng, and time.')
  }
  if (!Array.isArray(parsed)) throw new Error('Timeline JSON must be an array of points.')
  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Point ${index + 1} must be an object.`)
    const record = item as Record<string, unknown>
    const lat = typeof record.lat === 'number' ? record.lat : Number.NaN
    const lng = typeof record.lng === 'number' ? record.lng : Number.NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || typeof record.time !== 'string') {
      throw new Error(`Point ${index + 1} needs numeric lat, numeric lng, and a time string.`)
    }
    return { lat, lng, time: record.time }
  })
}
