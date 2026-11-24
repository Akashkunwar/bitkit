export type PongState = {
  width: number
  height: number
  ball: { x: number; y: number; vx: number; vy: number }
  playerY: number
  cpuY: number
  paddle: number
  score: [number, number]
}

export function freshPong(): PongState {
  return {
    width: 480,
    height: 320,
    ball: { x: 240, y: 160, vx: 4, vy: 2.4 },
    playerY: 130,
    cpuY: 130,
    paddle: 64,
    score: [0, 0],
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** One frame. The player paddle is on the left and follows `dir`. */
export function stepPong(state: PongState, dir: -1 | 0 | 1): PongState {
  const playerY = clamp(state.playerY + dir * 7, 0, state.height - state.paddle)
  const target = state.ball.y - state.paddle / 2
  const cpuY = clamp(
    state.cpuY + Math.sign(target - state.cpuY) * Math.min(4.2, Math.abs(target - state.cpuY)),
    0,
    state.height - state.paddle,
  )
  let { x, y, vx, vy } = state.ball
  x += vx
  y += vy
  if (y <= 0 || y >= state.height) {
    vy = -vy
    y = clamp(y, 0, state.height)
  }
  const score: [number, number] = [state.score[0], state.score[1]]
  if (x <= 28 && vx < 0 && y >= playerY && y <= playerY + state.paddle) {
    vx = Math.abs(vx) + 0.15
    x = 28
  }
  if (x >= state.width - 28 && vx > 0 && y >= cpuY && y <= cpuY + state.paddle) {
    vx = -Math.abs(vx) - 0.15
    x = state.width - 28
  }
  if (x < 0) {
    score[1] += 1
    x = state.width / 2
    y = state.height / 2
    vx = 4
    vy = 2.4
  } else if (x > state.width) {
    score[0] += 1
    x = state.width / 2
    y = state.height / 2
    vx = -4
    vy = -2.4
  }
  return { ...state, ball: { x, y, vx, vy }, playerY, cpuY, score }
}
