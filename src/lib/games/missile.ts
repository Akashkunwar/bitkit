export const MISS_W = 480
export const MISS_H = 320

export type Missile = {
  incoming: { x: number; y: number; vx: number; vy: number }[]
  booms: { x: number; y: number; life: number }[]
  cities: boolean[]
  score: number
  dead: boolean
  tick: number
  cool: number
}

export function freshMissile(): Missile {
  return {
    incoming: [{ x: 40, y: 0, vx: 0.4, vy: 1.1 }],
    booms: [],
    cities: [true, true, true, true, true, true],
    score: 0,
    dead: false,
    tick: 0,
    cool: 0,
  }
}

export function launchMissile(state: Missile, x: number, y: number): Missile {
  if (state.dead || state.cool > 0) return state
  return { ...state, booms: state.booms.concat({ x, y, life: 18 }), cool: 10 }
}

export function stepMissile(state: Missile): Missile {
  if (state.dead) return state
  const tick = state.tick + 1
  let incoming = state.incoming.map((shot) => ({ ...shot, x: shot.x + shot.vx, y: shot.y + shot.vy }))
  const booms = state.booms.map((boom) => ({ ...boom, life: boom.life - 1 })).filter((boom) => boom.life > 0)
  let score = state.score
  incoming = incoming.filter((shot) => {
    const hit = booms.some((boom) => {
      const dx = shot.x - boom.x
      const dy = shot.y - boom.y
      return dx * dx + dy * dy < 28 * 28
    })
    if (hit) score += 1
    return !hit
  })
  const cities = state.cities.slice()
  incoming = incoming.filter((shot) => {
    if (shot.y < MISS_H - 24) return true
    const index = cities.findIndex((_, city) => {
      const left = city * 80 + 22
      return shot.x + 4 >= left && shot.x <= left + 28
    })
    if (index >= 0 && cities[index]) cities[index] = false
    return false
  })
  if (tick % 70 === 0) {
    const x = 30 + (tick % 420)
    incoming = incoming.concat({ x, y: 0, vx: ((tick % 2 === 0 ? 200 : 400) - x) / 180, vy: 1.15 })
  }
  return {
    incoming,
    booms,
    cities,
    score,
    dead: cities.every((city) => !city),
    tick,
    cool: Math.max(0, state.cool - 1),
  }
}
