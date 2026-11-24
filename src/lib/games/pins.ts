/** Pinball. Flippers, bumpers, and three drop targets. */

export const PINS_W = 320
export const PINS_H = 460
const BALL = 7

export type PinsInput = { left: boolean; right: boolean }
export type Pins = {
  x: number
  y: number
  vx: number
  vy: number
  left: number
  right: number
  drops: boolean[]
  score: number
  balls: number
  locked: boolean
  dead: boolean
  tick: number
}

export const PINS_BUMPERS = [
  { x: 160, y: 150, r: 18 },
  { x: 100, y: 200, r: 16 },
  { x: 220, y: 200, r: 16 },
]

export const PINS_DROPS = [
  { x: 78, y: 118, w: 28, h: 8 },
  { x: 146, y: 108, w: 28, h: 8 },
  { x: 214, y: 118, w: 28, h: 8 },
]

export function flipperSegment(side: 'left' | 'right', raised: number): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, raised))
  if (side === 'left') {
    const angle = 0.55 - t * 1.15
    return [78, 392, 78 + Math.cos(angle) * 62, 392 + Math.sin(angle) * 62]
  }
  const angle = Math.PI - 0.55 + t * 1.15
  return [242, 392, 242 + Math.cos(angle) * 62, 392 + Math.sin(angle) * 62]
}

export function freshPins(): Pins {
  return {
    x: 270,
    y: 250,
    vx: 0,
    vy: 0,
    left: 0,
    right: 0,
    drops: [true, true, true],
    score: 0,
    balls: 3,
    locked: true,
    dead: false,
    tick: 0,
  }
}

function closest(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
  const abx = bx - ax
  const aby = by - ay
  const len = abx * abx + aby * aby || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len))
  return { x: ax + abx * t, y: ay + aby * t, t }
}

export function stepPins(state: Pins, input: PinsInput): Pins {
  if (state.dead) return state
  const prevLeft = state.left
  const prevRight = state.right
  const left = input.left ? Math.min(1, state.left + 0.45) : Math.max(0, state.left - 0.28)
  const right = input.right ? Math.min(1, state.right + 0.45) : Math.max(0, state.right - 0.28)

  if (state.locked) {
    const launch = input.left || input.right
    return {
      ...state,
      left,
      right,
      x: 292,
      y: launch ? 360 : 300,
      vx: launch ? -1.2 : 0,
      vy: launch ? -8.4 : 0,
      locked: !launch,
      tick: state.tick + 1,
    }
  }

  let { x, y, vx, vy, score } = state
  let drops = state.drops.slice()
  let balls = state.balls
  vy = Math.min(9, vy + 0.2)
  vx *= 0.998
  x += vx
  y += vy

  if (x < 22 + BALL) {
    x = 22 + BALL
    vx = Math.abs(vx) * 0.75
    if (y > 300) {
      vy = -Math.abs(vy) - 2.4
      score += 15
    }
  }
  if (x > PINS_W - 22 - BALL) {
    x = PINS_W - 22 - BALL
    vx = -Math.abs(vx) * 0.75
    if (y > 300) {
      vy = -Math.abs(vy) - 2.4
      score += 15
    }
  }
  if (y < 20 + BALL) {
    y = 20 + BALL
    vy = Math.abs(vy) * 0.7
  }

  PINS_BUMPERS.forEach((bumper) => {
    const dx = x - bumper.x
    const dy = y - bumper.y
    const dist = Math.hypot(dx, dy) || 1
    const limit = bumper.r + BALL
    if (dist >= limit) return
    const nx = dx / dist
    const ny = dy / dist
    x = bumper.x + nx * limit
    y = bumper.y + ny * limit
    const dot = vx * nx + vy * ny
    if (dot < 0) {
      vx = (vx - 2 * dot * nx) * 1.05 + nx * 1.4
      vy = (vy - 2 * dot * ny) * 1.05 + ny * 1.4
    } else {
      vx += nx * 1.6
      vy += ny * 1.6
    }
    score += 50
  })

  drops.forEach((up, index) => {
    if (!up) return
    const target = PINS_DROPS[index]
    if (x > target.x && x < target.x + target.w && y > target.y && y < target.y + target.h + BALL) {
      drops = drops.map((value, i) => (i === index ? false : value))
      score += 200
      vy = -Math.abs(vy) - 1.5
    }
  })
  if (drops.every((up) => !up)) {
    drops = [true, true, true]
    score += 500
  }

  const kick = (side: 'left' | 'right', raised: number, prev: number) => {
    const [ax, ay, bx, by] = flipperSegment(side, raised)
    const near = closest(ax, ay, bx, by, x, y)
    const dx = x - near.x
    const dy = y - near.y
    const dist = Math.hypot(dx, dy)
    if (dist > BALL + 7) return
    const lift = raised - prev
    if (lift > 0.02) {
      vy = Math.min(vy, -7.2 - lift * 6)
      vx += side === 'left' ? 2.4 : -2.4
      score += 5
    } else if (vy > 0) {
      vy *= -0.35
    }
    const nx = dist ? dx / dist : 0
    const ny = dist ? dy / dist : -1
    x = near.x + nx * (BALL + 8)
    y = near.y + ny * (BALL + 8)
  }
  kick('left', left, prevLeft)
  kick('right', right, prevRight)

  let locked = false
  if (y > 430 && x > 108 && x < 214) {
    balls -= 1
    if (balls <= 0) {
      return {
        ...state,
        x,
        y,
        vx,
        vy,
        left,
        right,
        drops,
        score,
        balls: 0,
        locked: false,
        dead: true,
        tick: state.tick + 1,
      }
    }
    locked = true
    x = 292
    y = 300
    vx = 0
    vy = 0
  }

  return { ...state, x, y, vx, vy, left, right, drops, score, balls, locked, tick: state.tick + 1 }
}
