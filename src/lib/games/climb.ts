/** Single-screen climb. Use the ladders, jump the barrels, reach the top. */

export const CLIMB_W = 480
export const CLIMB_H = 320

export type ClimbInput = { left: boolean; right: boolean; up: boolean; down: boolean }
export type Shelf = { x: number; y: number; w: number }
export type Rung = { x: number; y: number; h: number }
export type Keg = { x: number; y: number; vx: number; vy: number }
export type Climb = {
  x: number
  y: number
  vx: number
  vy: number
  holding: boolean
  barrels: Keg[]
  score: number
  lives: number
  hurt: number
  spawn: number
  dead: boolean
  won: boolean
  tick: number
}

export const CLIMB_SHELVES: Shelf[] = [
  { x: 0, y: 292, w: 480 },
  { x: 0, y: 220, w: 390 },
  { x: 90, y: 148, w: 390 },
  { x: 0, y: 76, w: 250 },
]

export const CLIMB_LADDERS: Rung[] = [
  { x: 330, y: 220, h: 72 },
  { x: 96, y: 148, h: 72 },
  { x: 210, y: 76, h: 72 },
]

const PW = 14
const PH = 18

export function freshClimb(): Climb {
  return {
    x: 28,
    y: 292 - PH,
    vx: 0,
    vy: 0,
    holding: false,
    barrels: [],
    score: 0,
    lives: 3,
    hurt: 0,
    spawn: 50,
    dead: false,
    won: false,
    tick: 0,
  }
}

function onLadder(x: number, y: number) {
  return (
    CLIMB_LADDERS.find(
      (ladder) => Math.abs(x + PW / 2 - ladder.x) < 16 && y + PH >= ladder.y - 1 && y < ladder.y + ladder.h,
    ) ?? null
  )
}

function landOn(x: number, y: number, vy: number) {
  if (vy < 0) return { y, vy, grounded: false }
  const prev = y + PH - vy
  let top = Infinity
  for (const shelf of CLIMB_SHELVES) {
    const over = x + PW > shelf.x + 4 && x < shelf.x + shelf.w - 4
    if (over && prev <= shelf.y + 6 && y + PH >= shelf.y && shelf.y < top) top = shelf.y
  }
  if (top === Infinity) return { y, vy, grounded: false }
  return { y: top - PH, vy: 0, grounded: true }
}

function stepKeg(keg: Keg): Keg {
  let { x, y, vx, vy } = keg
  vy = Math.min(6, vy + 0.45)
  x += vx
  y += vy
  const landed = landOn(x, y, vy)
  const wasAir = vy > 0.5
  y = landed.y
  vy = landed.vy
  if (landed.grounded && wasAir) vx = -Math.sign(vx || 1) * 1.35
  if (x < 4 || x > CLIMB_W - 18) vx = -vx
  return { x, y, vx, vy }
}

export function stepClimb(state: Climb, input: ClimbInput): Climb {
  if (state.dead || state.won) return state
  let { x, y, vy, lives, hurt, spawn, score } = state
  let barrels = state.barrels.map(stepKeg)
  const ladder = onLadder(x, y)
  if (ladder && (input.up || input.down)) {
    if (input.up) y -= 2.1
    if (input.down) y += 2.1
    if (input.left) x -= 1.5
    if (input.right) x += 1.5
    vy = 0
  } else {
    if (input.left) x -= 2.2
    if (input.right) x += 2.2
    const grounded = landOn(x, y, 0).grounded
    if (input.up && !state.holding && grounded) vy = -6.3
    vy = Math.min(7, vy + 0.38)
    y += vy
    const landed = landOn(x, y, vy)
    y = landed.y
    vy = landed.vy
  }
  x = Math.max(4, Math.min(CLIMB_W - PW - 4, x))

  spawn -= 1
  if (spawn <= 0) {
    barrels = barrels.concat({ x: 18, y: 220 - 16, vx: 1.45, vy: 0 })
    spawn = 110
  }
  barrels = barrels.filter((keg) => keg.y < CLIMB_H + 10)

  hurt = Math.max(0, hurt - 1)
  const hit = barrels.some((keg) => x < keg.x + 14 && x + PW > keg.x && y < keg.y + 14 && y + PH > keg.y)
  if (hit && hurt === 0) {
    lives -= 1
    hurt = 50
    if (lives <= 0) {
      return {
        ...state,
        x,
        y,
        vx: 0,
        vy,
        holding: input.up || input.down,
        barrels,
        score,
        lives: 0,
        hurt,
        spawn,
        dead: true,
        tick: state.tick + 1,
      }
    }
  }

  const won = y + PH <= 80 && x < 120 && landOn(x, y, 0).grounded
  if (won) score += 500
  return {
    ...state,
    x,
    y,
    vx: 0,
    vy,
    holding: input.up || input.down,
    barrels,
    score: won ? score : state.score,
    lives,
    hurt,
    spawn,
    won,
    tick: state.tick + 1,
  }
}

export const CLIMB_BODY = { w: PW, h: PH }
