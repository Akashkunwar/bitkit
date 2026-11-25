export const HAUL_W = 480
export const HAUL_H = 270
export const HAUL_WHEEL = 17

export type HaulCoin = { x: number; taken: boolean }

export type Haul = {
  x: number
  y: number
  vx: number
  vy: number
  air: boolean
  fuel: number
  coins: number
  spots: HaulCoin[]
  dead: boolean
  score: number
}

/** Ground line, in screen pixels. Smaller is higher. The opening is flat so the bike waits. */
export function haulGround(x: number): number {
  const fade = Math.min(1, Math.max(0, (x - 120) / 260))
  const roll = Math.sin(x * 0.0065) * 42 + Math.sin(x * 0.016 + 0.7) * 22 + Math.sin(x * 0.0028) * 28
  const period = 720
  const local = ((x % period) + period) % period
  const d = Math.abs(local - 360)
  const bump = d < 48 ? Math.cos((d / 48) * (Math.PI / 2)) * 58 : 0
  return 188 - fade * (roll + bump)
}

export function haulSlope(x: number): number {
  return Math.atan2(haulGround(x + HAUL_WHEEL) - haulGround(x - HAUL_WHEEL), HAUL_WHEEL * 2)
}

function rideY(x: number): number {
  return (haulGround(x - HAUL_WHEEL) + haulGround(x + HAUL_WHEEL)) / 2 - 16
}

export function freshHaul(): Haul {
  const spots: HaulCoin[] = []
  for (let i = 1; i <= 8; i += 1) spots.push({ x: 280 * i, taken: false })
  const x = 48
  return {
    x,
    y: rideY(x),
    vx: 0,
    vy: 0,
    air: false,
    fuel: 100,
    coins: 0,
    spots,
    dead: false,
    score: 0,
  }
}

function scored(state: Haul): Haul {
  return { ...state, score: Math.max(0, Math.floor(state.x / 8)) + state.coins * 100 }
}

export function stepHaul(state: Haul, gas: boolean, brake: boolean): Haul {
  if (state.dead) return state
  let { x, y, vx, vy, air } = state
  let fuel = state.fuel - (gas ? 0.05 : 0.012)
  if (fuel <= 0) return scored({ ...state, fuel: 0, dead: true })

  const spots = state.spots.map((spot) => ({ ...spot }))
  const slope = haulSlope(x)
  if (!air) {
    if (gas) vx += 0.15
    if (brake) vx *= 0.86
    vx += Math.sin(slope) * 0.26
    vx *= 0.993
    vx = Math.max(-3.4, Math.min(6.2, vx))
    x += vx
    if (x < 36) {
      x = 36
      if (vx < 0) vx = 0
    }
    const ground = rideY(x)
    if (ground > y + 4 && vx > 2.6) {
      air = true
      vy = -0.2
    } else {
      y = ground
      if (Math.abs(haulSlope(x)) > 0.82 && vx > 4.4) return scored({ ...state, x, y, vx, fuel, spots, dead: true })
    }
  } else {
    vy += 0.34
    y += vy
    x += vx * 0.98
    const ground = rideY(x)
    if (y >= ground) {
      const landed = Math.abs(haulSlope(x))
      y = ground
      air = false
      if (landed > 0.95 && vy > 3.4) return scored({ ...state, x, y, vx, vy, air, fuel, spots, dead: true })
      vy = 0
    }
  }

  if (y > HAUL_H + 40) return scored({ ...state, x, y, vx, vy, air, fuel, spots, dead: true })

  let coins = state.coins
  for (const spot of spots) {
    if (spot.taken) continue
    const coinY = haulGround(spot.x) - 30
    if (Math.hypot(spot.x - x, coinY - y) < 24) {
      spot.taken = true
      coins += 1
      fuel = Math.min(100, fuel + 6)
    }
  }
  const last = spots[spots.length - 1]
  if (last && x > last.x - 900) spots.push({ x: last.x + 280, taken: false })

  return scored({ x, y, vx, vy, air, fuel, coins, spots, dead: false, score: 0 })
}
