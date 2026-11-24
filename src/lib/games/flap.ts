export const FLAP_W = 480
export const FLAP_H = 360

export type Pipe = { x: number; gap: number }
export type Flap = { y: number; vy: number; pipes: Pipe[]; score: number; dead: boolean; passed: number }

export function freshFlap(): Flap {
  return { y: 160, vy: 0, pipes: [{ x: 480, gap: 140 }], score: 0, dead: false, passed: 0 }
}

export function stepFlap(state: Flap, flap: boolean): Flap {
  if (state.dead) return state
  const y = state.y + state.vy
  const vy = (flap ? -6.4 : state.vy) + 0.38
  let pipes = state.pipes.map((pipe) => ({ ...pipe, x: pipe.x - 2.6 }))
  let score = state.score
  let passed = state.passed
  pipes.forEach((pipe) => {
    if (pipe.x + 46 < 90 && pipe.x + 46 >= 87.4) {
      score += 1
      passed += 1
    }
  })
  if (pipes.length === 0 || pipes[pipes.length - 1].x < 260)
    pipes = pipes.concat({ x: 480, gap: 70 + ((passed * 47) % 160) })
  pipes = pipes.filter((pipe) => pipe.x > -60)
  let dead = y < 8 || y > FLAP_H - 8
  pipes.forEach((pipe) => {
    const hitX = pipe.x < 100 && pipe.x + 46 > 72
    if (hitX && (y < pipe.gap || y > pipe.gap + 108)) dead = true
  })
  return { y, vy, pipes, score, dead, passed }
}
