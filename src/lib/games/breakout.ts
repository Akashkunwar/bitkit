export type Breakout = {
  width: number
  height: number
  ball: { x: number; y: number; vx: number; vy: number }
  paddleX: number
  bricks: boolean[]
  cols: number
  score: number
  lost: boolean
  won: boolean
}

export function freshBreakout(): Breakout {
  return {
    width: 480,
    height: 360,
    ball: { x: 240, y: 280, vx: 3.2, vy: -3.2 },
    paddleX: 200,
    bricks: Array.from({ length: 8 * 5 }, () => true),
    cols: 8,
    score: 0,
    lost: false,
    won: false,
  }
}

/** One frame. `dir` moves the paddle. A brick the ball hits is removed. */
export function stepBreakout(state: Breakout, dir: -1 | 0 | 1): Breakout {
  if (state.lost || state.won) return state
  const paddleX = Math.max(0, Math.min(state.width - 80, state.paddleX + dir * 8))
  let { x, y, vx, vy } = state.ball
  x += vx
  y += vy
  if (x < 8 || x > state.width - 8) vx = -vx
  if (y < 8) vy = Math.abs(vy)
  const bricks = state.bricks.slice()
  let score = state.score
  const colW = state.width / state.cols
  const rowH = 18
  let hitBrick = false
  bricks.forEach((alive, index) => {
    if (hitBrick || !alive) return
    const col = index % state.cols
    const row = Math.floor(index / state.cols)
    const left = col * colW
    const top = 36 + row * (rowH + 6)
    if (x >= left && x <= left + colW - 4 && y >= top && y <= top + rowH) {
      bricks[index] = false
      score += 10
      vy = -vy
      hitBrick = true
    }
  })
  if (y >= state.height - 28 && y <= state.height - 16 && x >= paddleX && x <= paddleX + 80 && vy > 0) {
    vy = -Math.abs(vy)
    vx += (x - (paddleX + 40)) * 0.04
  }
  vx = Math.max(-6.5, Math.min(6.5, vx))
  const won = bricks.every((alive) => !alive)
  const lost = !won && y > state.height
  return { ...state, ball: { x, y, vx, vy }, paddleX, bricks, score, lost, won }
}
