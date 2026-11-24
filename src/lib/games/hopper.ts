export const HOP_COLS = 11
export const HOP_ROWS = 8

export type Car = { row: number; x: number; w: number; speed: number }
export type Hopper = { c: number; r: number; cars: Car[]; score: number; lives: number; dead: boolean }

const SPEEDS = [1.6, -2.1, 1.4, -2.4, 1.8, -1.5]

export function freshHopper(): Hopper {
  const cars: Car[] = []
  for (let row = 1; row <= 6; row += 1) {
    const speed = SPEEDS[row - 1]
    for (let i = 0; i < 3; i += 1) cars.push({ row, x: i * 180, w: row % 2 === 0 ? 70 : 46, speed })
  }
  return { c: 5, r: 7, cars, score: 0, lives: 3, dead: false }
}

function hit(state: Hopper, c: number, r: number) {
  return state.cars.some((car) => car.row === r && c * 40 + 8 < car.x + car.w && c * 40 + 32 > car.x)
}

export function stepHopper(state: Hopper, hop: { dc: number; dr: number } | null): Hopper {
  if (state.dead) return state
  const cars = state.cars.map((car) => {
    let x = car.x + car.speed
    if (x > 480) x = -car.w
    if (x + car.w < 0) x = 480
    return { ...car, x }
  })
  let { c, r, score, lives } = state
  if (hop) {
    c = Math.max(0, Math.min(HOP_COLS - 1, c + hop.dc))
    r = Math.max(0, Math.min(HOP_ROWS - 1, r + hop.dr))
  }
  if (r > 0 && r < 7 && hit({ ...state, cars }, c, r)) {
    lives -= 1
    c = 5
    r = 7
    if (lives <= 0) return { ...state, cars, c, r, lives, dead: true }
  }
  if (r === 0) {
    score += 1
    c = 5
    r = 7
  }
  return { ...state, cars, c, r, score, lives }
}
