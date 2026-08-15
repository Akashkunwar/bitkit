/** Unbiased random integer in [0, max) via rejection sampling on 32 bits. */
export function randomInt(max: number): number {
  if (max <= 1) return 0
  const limit = 2 ** 32 - ((2 ** 32) % max)
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

export function pickOne<T>(items: T[]): T | null {
  return items.length ? items[randomInt(items.length)] : null
}

/** Fisher–Yates, so every ordering is equally likely. */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pickMany<T>(items: T[], count: number, allowRepeats = false): T[] {
  if (!items.length || count <= 0) return []
  if (allowRepeats) return Array.from({ length: count }, () => items[randomInt(items.length)])
  return shuffle(items).slice(0, Math.min(count, items.length))
}

/**
 * Splits into teams as evenly as possible. Remainder members are spread one
 * per team rather than piled onto the last one.
 */
export function makeTeams<T>(items: T[], teamCount: number): T[][] {
  if (teamCount < 1) return [items]
  const pool = shuffle(items)
  const teams: T[][] = Array.from({ length: teamCount }, () => [])
  pool.forEach((item, i) => teams[i % teamCount].push(item))
  return teams
}

export function rollDice(sides: number, count: number): number[] {
  return Array.from({ length: Math.max(1, count) }, () => randomInt(Math.max(2, sides)) + 1)
}

export function flipCoins(count: number): ('Heads' | 'Tails')[] {
  return Array.from({ length: Math.max(1, count) }, () => (randomInt(2) ? 'Heads' : 'Tails'))
}

export function parseEntries(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export type Slice = { label: string; start: number; end: number; colour: string }

/** Hues spaced by the golden angle stay distinct however many slices there are. */
export function wheelSlices(entries: string[]): Slice[] {
  const step = (Math.PI * 2) / Math.max(1, entries.length)
  return entries.map((label, i) => ({
    label,
    start: i * step,
    end: (i + 1) * step,
    colour: `hsl(${(i * 137.508) % 360} 62% 52%)`,
  }))
}

/**
 * Angle to land the wheel on `index`, including several full turns so the
 * spin reads as a spin. The pointer sits at the top (−90°).
 */
export function angleForIndex(index: number, total: number, turns = 5): number {
  const step = 360 / Math.max(1, total)
  const centre = index * step + step / 2
  return turns * 360 + (360 - centre)
}
