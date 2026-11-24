/** Chase-view road race. Steer through bends, pass rivals, and shove them aside. */

export const RALLY_W = 480
export const RALLY_H = 300

export type RallyInput = { left: boolean; right: boolean; accel: boolean; brake: boolean; shove: boolean }
export type Rival = { z: number; x: number; pace: number; passed: boolean }
export type RallySeg = { length: number; curve: number }
export type Rally = {
  z: number
  x: number
  speed: number
  rivals: Rival[]
  score: number
  spin: number
  shove: number
  place: number
  finished: boolean
  tick: number
}

export const RALLY_TRACK: RallySeg[] = [
  { length: 500, curve: 0 },
  { length: 380, curve: 0.85 },
  { length: 280, curve: 0 },
  { length: 420, curve: -1.05 },
  { length: 240, curve: 0.3 },
  { length: 460, curve: 1.15 },
  { length: 320, curve: -0.95 },
  { length: 360, curve: 0.55 },
  { length: 480, curve: -0.4 },
  { length: 520, curve: 0 },
]

export const RALLY_FINISH = RALLY_TRACK.reduce((sum, seg) => sum + seg.length, 0)

export function curveAt(z: number) {
  let left = Math.max(0, z)
  for (const seg of RALLY_TRACK) {
    if (left < seg.length) return seg.curve
    left -= seg.length
  }
  return 0
}

export function projectRally(z: number, playerX: number, ahead: number, lateral: number) {
  const depth = Math.max(8, ahead)
  let bend = 0
  const steps = 6
  for (let i = 1; i <= steps; i += 1) bend += curveAt(z + (depth * i) / steps) * (depth / steps)
  const y = 98 + 1680 / depth
  const x = RALLY_W / 2 + ((lateral - playerX) * 1280 + bend * 46) / depth
  const scale = 360 / depth
  return { x, y, scale, depth }
}

function rivals(): Rival[] {
  const spots = [220, 420, 680, 980, 1320, 1700, 2100, 2550, 3000, 3450]
  return spots.map((z, index) => ({
    z,
    x: index % 2 === 0 ? -0.28 : 0.32,
    pace: 1.15 + (index % 4) * 0.18,
    passed: false,
  }))
}

export function freshRally(): Rally {
  return {
    z: 0,
    x: 0,
    speed: 0.42,
    rivals: rivals(),
    score: 0,
    spin: 0,
    shove: 0,
    place: rivals().length + 1,
    finished: false,
    tick: 0,
  }
}

export function stepRally(state: Rally, input: RallyInput): Rally {
  if (state.finished) return state
  let { x, speed, spin, shove, score } = state
  const braking = input.brake
  if (spin > 0) {
    speed *= 0.96
    spin -= 1
  } else if (braking) speed *= 0.962
  else if (input.accel) speed = Math.min(1, speed + 0.011)
  else speed = Math.max(0.16, speed * 0.996)

  const curve = curveAt(state.z)
  if (spin === 0) {
    x += curve * speed * 0.021
    const steer = 0.018 + speed * 0.014
    if (input.left) x -= steer
    if (input.right) x += steer
  }
  if (Math.abs(x) > 0.9) speed *= 0.984
  if (Math.abs(x) > 1.28) {
    spin = 26
    speed *= 0.5
    x = Math.sign(x) * 1.05
  }
  x = Math.max(-1.55, Math.min(1.55, x))

  const z = state.z + speed * 2.15
  let nextRivals = state.rivals.map((rival) => ({ ...rival, z: rival.z + rival.pace }))
  nextRivals.forEach((rival) => {
    if (!rival.passed && z >= rival.z) {
      rival.passed = true
      score += 100
    }
    const alongside = Math.abs(rival.z - z) < 36 && Math.abs(rival.x - x) < 0.22
    if (alongside && spin === 0) {
      speed *= 0.82
      spin = 12
      rival.pace *= 0.9
      rival.x += Math.sign(rival.x - x || 1) * 0.12
    }
  })
  shove = Math.max(0, shove - 1)
  if (input.shove && shove === 0 && spin === 0) {
    nextRivals = nextRivals.map((rival) => {
      if (Math.abs(rival.z - z) < 48 && Math.abs(rival.x - x) < 0.48) {
        score += 25
        return { ...rival, x: rival.x + Math.sign(rival.x - x || 1) * 0.38, pace: rival.pace * 0.9 }
      }
      return rival
    })
    shove = 18
  }
  const place = 1 + nextRivals.filter((rival) => rival.z > z).length
  const finished = z >= RALLY_FINISH
  return {
    ...state,
    z,
    x,
    speed,
    rivals: nextRivals,
    score,
    spin,
    shove,
    place,
    finished,
    tick: state.tick + 1,
  }
}
