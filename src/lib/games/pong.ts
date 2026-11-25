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

function redirect(vx: number, vy: number, paddleY: number, ballY: number, paddle: number, dir: 1 | -1) {
  const offset = (ballY - (paddleY + paddle / 2)) / (paddle / 2)
  const speed = Math.min(8, Math.hypot(vx, vy) + 0.18)
  const raw = Math.max(-1, Math.min(1, offset)) * 0.9
  const angle = Math.abs(raw) < 0.18 ? Math.sign(raw || 1) * 0.18 : raw
  return { vx: dir * Math.max(3.2, Math.cos(angle) * speed), vy: Math.sin(angle) * speed }
}

/** One frame. The player paddle is on the left and follows `dir`. */
export function stepPong(state: PongState, dir: -1 | 0 | 1): PongState {
  const playerY = clamp(state.playerY + dir * 7, 0, state.height - state.paddle)
  const chasing = state.ball.vx > 0
  const target = state.ball.y - state.paddle / 2
  const cpuSpeed = chasing ? 2.7 : 1.1
  const cpuY = clamp(
    state.cpuY + Math.sign(target - state.cpuY) * Math.min(cpuSpeed, Math.abs(target - state.cpuY)),
    0,
    state.height - state.paddle,
  )
  let { x, y, vx, vy } = state.ball
  const prevX = x
  x += vx
  y += vy
  if (y <= 0 || y >= state.height) {
    vy = -vy
    y = clamp(y, 0, state.height)
  }
  const score: [number, number] = [state.score[0], state.score[1]]
  const hits = (top: number) => y >= top && y <= top + state.paddle
  if (vx < 0 && prevX > 28 && x <= 28 && hits(playerY)) {
    const bounce = redirect(vx, vy, playerY, y, state.paddle, 1)
    vx = bounce.vx
    vy = bounce.vy
    x = 28
  }
  if (vx > 0 && prevX < state.width - 28 && x >= state.width - 28 && hits(cpuY)) {
    const bounce = redirect(vx, vy, cpuY, y, state.paddle, -1)
    vx = bounce.vx
    vy = bounce.vy
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
