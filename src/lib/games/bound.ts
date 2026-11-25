import { nextRandom } from './random'

export const BOUND_W = 320
export const BOUND_H = 460

export type BoundPad = { x: number; y: number; w: number; spike: boolean }

export type Bound = {
  x: number
  y: number
  vx: number
  vy: number
  pads: BoundPad[]
  score: number
  dead: boolean
  seed: number
}

function padFrom(seed: number, y: number): { pad: BoundPad; seed: number } {
  const across = nextRandom(seed)
  const width = nextRandom(across.seed)
  return {
    seed: width.seed,
    pad: {
      x: 12 + across.value * (BOUND_W - 108),
      y,
      w: 54 + width.value * 36,
      spike: across.value > 0.84,
    },
  }
}

export function freshBound(seed = 3): Bound {
  const pads: BoundPad[] = []
  let next = seed
  for (let i = 0; i < 8; i += 1) {
    const made = padFrom(next, BOUND_H - 36 - i * 58)
    next = made.seed
    pads.push({ ...made.pad, spike: i < 3 ? false : made.pad.spike })
  }
  return { x: BOUND_W / 2, y: BOUND_H - 64, vx: 0, vy: -7.4, pads, score: 0, dead: false, seed: next }
}

export function stepBound(state: Bound, left: boolean, right: boolean): Bound {
  if (state.dead) return state
  let { x, y, vx, vy, seed, score } = state
  const pads = state.pads.map((pad) => ({ ...pad }))
  vx += (right ? 0.48 : 0) - (left ? 0.48 : 0)
  vx *= 0.88
  vx = Math.max(-4.4, Math.min(4.4, vx))
  vy = Math.min(9, vy + 0.2)
  const prevY = y
  x += vx
  y += vy
  if (x < 8) x = BOUND_W - 8
  if (x > BOUND_W - 8) x = 8

  let dead = false
  for (const pad of pads) {
    const over = x > pad.x - 2 && x < pad.x + pad.w + 2
    if (over && prevY <= pad.y && y >= pad.y && vy > 0) {
      if (pad.spike) dead = true
      else {
        y = pad.y
        vy = -7.5
        score += 1
      }
    }
  }

  if (y < 140) {
    const shift = 140 - y
    y += shift
    for (const pad of pads) pad.y += shift
  }
  const kept = pads.filter((pad) => pad.y < BOUND_H + 24)
  while (kept.length < 8) {
    const highest = kept.reduce((top, pad) => Math.min(top, pad.y), BOUND_H)
    const made = padFrom(seed, highest - 56 - nextRandom(seed).value * 18)
    seed = made.seed
    kept.push(made.pad)
  }
  if (y > BOUND_H - 4) dead = true
  return { x, y, vx, vy, pads: kept, score, dead, seed }
}
