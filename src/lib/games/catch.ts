export const CATCH_W = 360
export const CATCH_H = 320

export type CatchGame = {
  x: number
  items: { x: number; y: number; good: boolean }[]
  score: number
  misses: number
  dead: boolean
  tick: number
}

export function freshCatch(): CatchGame {
  return { x: 150, items: [], score: 0, misses: 0, dead: false, tick: 0 }
}

export function stepCatch(state: CatchGame, dir: -1 | 0 | 1): CatchGame {
  if (state.dead) return state
  const tick = state.tick + 1
  const x = Math.max(0, Math.min(CATCH_W - 64, state.x + dir * 7))
  let items = state.items.map((item) => ({ ...item, y: item.y + 3.2 }))
  if (tick % 28 === 0) items = items.concat({ x: 20 + ((tick * 37) % 280), y: -10, good: tick % 56 !== 0 })
  let score = state.score
  let misses = state.misses
  const kept: CatchGame['items'] = []
  items.forEach((item) => {
    const caught = item.y > CATCH_H - 36 && item.x + 12 > x && item.x < x + 64
    if (caught && item.good) score += 1
    else if (caught && !item.good) misses += 1
    else if (item.y > CATCH_H) {
      if (item.good) misses += 1
    } else kept.push(item)
  })
  return { x, items: kept, score, misses, dead: misses >= 5, tick }
}
