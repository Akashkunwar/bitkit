/** Deterministic 0..1 stream. The same seed always replays the same game. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    const next = nextRandom(a)
    a = next.seed
    return next.value
  }
}

/** One step of the same stream, so a game can store the seed on its state. */
export function nextRandom(seed: number): { value: number; seed: number } {
  const a = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: a >>> 0 }
}
