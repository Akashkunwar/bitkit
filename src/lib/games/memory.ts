import { mulberry32 } from './random'

/** Pairs of ids, shuffled. */
export function deck(pairs: number, seed: number): number[] {
  const cards: number[] = []
  for (let id = 0; id < pairs; id += 1) cards.push(id, id)
  const rand = mulberry32(seed)
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

export function resolvePair(cards: number[], up: [number, number], matched: boolean[]): boolean[] {
  if (cards[up[0]] !== cards[up[1]]) return matched
  const next = matched.slice()
  next[up[0]] = true
  next[up[1]] = true
  return next
}
