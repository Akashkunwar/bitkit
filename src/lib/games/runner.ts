export const RUN_W = 480
export const RUN_H = 240
export const RUN_GROUND = 190

export type Hurdle = { x: number; w: number; h: number }
export type Runner = {
  y: number
  vy: number
  hurdles: Hurdle[]
  score: number
  dead: boolean
  tick: number
  buffer: number
}

export function freshRunner(): Runner {
  return { y: RUN_GROUND, vy: 0, hurdles: [{ x: 480, w: 18, h: 36 }], score: 0, dead: false, tick: 0, buffer: 0 }
}

export function stepRunner(state: Runner, jump: boolean): Runner {
  if (state.dead) return state
  const tick = state.tick + 1
  let buffer = jump ? 8 : Math.max(0, state.buffer - 1)
  let vy = state.vy + 0.55
  if (buffer > 0 && state.y >= RUN_GROUND) {
    vy = -9
    buffer = 0
  }
  let y = state.y + vy
  if (y > RUN_GROUND) {
    y = RUN_GROUND
    vy = 0
  }
  const speed = 4 + Math.min(4, state.score / 8)
  let hurdles = state.hurdles.map((hurdle) => ({ ...hurdle, x: hurdle.x - speed }))
  let score = state.score
  hurdles.forEach((hurdle) => {
    if (hurdle.x + hurdle.w < 48 && hurdle.x + hurdle.w >= 48 - speed) score += 1
  })
  if (hurdles.length === 0 || hurdles[hurdles.length - 1].x < 280) {
    hurdles = hurdles.concat({ x: 520, w: 16 + (tick % 3) * 8, h: 28 + (tick % 2) * 16 })
  }
  hurdles = hurdles.filter((hurdle) => hurdle.x > -40)
  const dead = hurdles.some((hurdle) => hurdle.x < 56 && hurdle.x + hurdle.w > 40 && y > RUN_GROUND - hurdle.h)
  return { y, vy, hurdles, score, dead, tick, buffer }
}
