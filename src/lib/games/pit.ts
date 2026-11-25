import { nextRandom } from './random'

export const PIT_W = 480
export const PIT_H = 360
export const PIT_WORLD = 860
export const PIT_TIME = 60 * 45

export type PitThing = { x: number; y: number; r: number }

export type Pit = {
  x: number
  y: number
  r: number
  things: PitThing[]
  score: number
  time: number
  over: boolean
  seed: number
}

function thing(seed: number, maxR: number): { thing: PitThing; seed: number } {
  const x = nextRandom(seed)
  const y = nextRandom(x.seed)
  const size = nextRandom(y.seed)
  return {
    seed: size.seed,
    thing: {
      x: 30 + x.value * (PIT_WORLD - 60),
      y: 30 + y.value * (PIT_WORLD - 60),
      r: 8 + size.value * maxR,
    },
  }
}

export function freshPit(seed = 4): Pit {
  const things: PitThing[] = []
  let next = seed
  for (let i = 0; i < 28; i += 1) {
    const made = thing(next, 26)
    next = made.seed
    things.push(made.thing)
  }
  return { x: PIT_WORLD / 2, y: PIT_WORLD / 2, r: 18, things, score: 0, time: PIT_TIME, over: false, seed: next }
}

export function stepPit(state: Pit, dx: number, dy: number): Pit {
  if (state.over) return state
  const time = state.time - 1
  if (time <= 0) return { ...state, time: 0, over: true }
  const length = Math.hypot(dx, dy)
  let { x, y, r, seed } = state
  if (length > 0) {
    const speed = 3.1 * Math.sqrt(18 / r)
    x = Math.max(r, Math.min(PIT_WORLD - r, x + (dx / length) * speed))
    y = Math.max(r, Math.min(PIT_WORLD - r, y + (dy / length) * speed))
  }
  let score = state.score
  const things = state.things.map((item) => ({ ...item }))
  for (let index = things.length - 1; index >= 0; index -= 1) {
    const item = things[index]
    const close = Math.hypot(item.x - x, item.y - y) < r * 0.95
    if (!close || item.r > r * 0.92) continue
    r = Math.min(78, Math.sqrt(r * r + item.r * item.r * 0.5))
    score += Math.round(item.r)
    const made = thing(seed, Math.max(18, r * 0.7))
    seed = made.seed
    things[index] = made.thing
  }
  return { x, y, r, things, score, time, over: false, seed }
}
