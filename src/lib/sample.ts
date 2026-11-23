function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NAMES = ['ada', 'kai', 'mina', 'ravi', 'noor', 'leo', 'vera', 'omar']
const NOTES = ['local', 'draft', 'sample', 'offline']

/** A made-up JSON object. The same seed always returns the same object. */
export function randomObject(seed: number): Record<string, unknown> {
  const rand = mulberry32(seed)
  const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)]
  return {
    id: Math.floor(rand() * 9000) + 1000,
    name: pick(NAMES),
    active: rand() > 0.5,
    count: Math.floor(rand() * 20),
    note: pick(NOTES),
    tags: [pick(NOTES), pick(NOTES)],
  }
}

/** A made-up IPv4 address. It is not looked up and it is not assigned to anyone. */
export function randomIpv4(seed: number): string {
  const rand = mulberry32(seed)
  return Array.from({ length: 4 }, () => Math.floor(rand() * 256)).join('.')
}
