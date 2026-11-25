import { nextRandom } from './random'

export const WYRM_W = 480
export const WYRM_H = 360
export const WYRM_WORLD = 1100
const STEP = 2.8
const GAP = 6

export type WyrmPoint = { x: number; y: number }
export type WyrmBody = { id: number; pts: WyrmPoint[]; angle: number; grow: number; bot: boolean }

export type Wyrm = {
  bodies: WyrmBody[]
  orbs: WyrmPoint[]
  dead: boolean
  score: number
  seed: number
}

function wrap(value: number): number {
  return ((value % WYRM_WORLD) + WYRM_WORLD) % WYRM_WORLD
}

function body(id: number, x: number, y: number, angle: number, bot: boolean): WyrmBody {
  const pts: WyrmPoint[] = []
  for (let i = 0; i < 16; i += 1)
    pts.push({ x: wrap(x - Math.cos(angle) * GAP * i), y: wrap(y - Math.sin(angle) * GAP * i) })
  return { id, pts, angle, grow: 0, bot }
}

export function freshWyrm(seed = 9): Wyrm {
  let next = seed
  const bodies = [body(0, 420, 420, 0, false)]
  for (let id = 1; id <= 4; id += 1) {
    const x = nextRandom(next)
    const y = nextRandom(x.seed)
    const angle = nextRandom(y.seed)
    next = angle.seed
    bodies.push(body(id, 80 + x.value * 900, 80 + y.value * 900, angle.value * Math.PI * 2, true))
  }
  const orbs: WyrmPoint[] = []
  for (let i = 0; i < 36; i += 1) {
    const x = nextRandom(next)
    const y = nextRandom(x.seed)
    next = y.seed
    orbs.push({ x: x.value * WYRM_WORLD, y: y.value * WYRM_WORLD })
  }
  return { bodies, orbs, dead: false, score: 0, seed: next }
}

function advance(worm: WyrmBody, angle: number) {
  worm.angle = angle
  const head = worm.pts[0]
  worm.pts.unshift({ x: wrap(head.x + Math.cos(angle) * STEP), y: wrap(head.y + Math.sin(angle) * STEP) })
  if (worm.grow > 0) worm.grow -= 1
  else worm.pts.pop()
}

function hitsBody(head: WyrmPoint, pts: WyrmPoint[], skip: number): boolean {
  for (let i = skip; i < pts.length; i += 1) {
    const dx = Math.abs(head.x - pts[i].x)
    const dy = Math.abs(head.y - pts[i].y)
    const near = Math.min(dx, WYRM_WORLD - dx) ** 2 + Math.min(dy, WYRM_WORLD - dy) ** 2
    if (near < 36) return true
  }
  return false
}

export function stepWyrm(state: Wyrm, left: boolean, right: boolean): Wyrm {
  if (state.dead) return state
  let seed = state.seed
  const bodies = state.bodies.map((worm) => ({ ...worm, pts: worm.pts.map((point) => ({ ...point })) }))
  let orbs = state.orbs.map((orb) => ({ ...orb }))
  const you = bodies[0]
  let angle = you.angle
  if (left) angle -= 0.1
  if (right) angle += 0.1
  advance(you, angle)

  for (const worm of bodies) {
    if (!worm.bot) continue
    const roll = nextRandom(seed)
    seed = roll.seed
    let best = orbs[0]
    let bestDist = Infinity
    for (const orb of orbs) {
      const dist = Math.hypot(orb.x - worm.pts[0].x, orb.y - worm.pts[0].y)
      if (dist < bestDist) {
        best = orb
        bestDist = dist
      }
    }
    const aim = best ? Math.atan2(best.y - worm.pts[0].y, best.x - worm.pts[0].x) : worm.angle
    let delta = aim - worm.angle
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    advance(worm, worm.angle + Math.max(-0.12, Math.min(0.12, delta)) + (roll.value - 0.5) * 0.04)
  }

  let score = state.score
  const head = you.pts[0]
  orbs = orbs.filter((orb) => {
    let eaten = false
    for (const worm of bodies) {
      const dx = Math.min(Math.abs(worm.pts[0].x - orb.x), WYRM_WORLD - Math.abs(worm.pts[0].x - orb.x))
      const dy = Math.min(Math.abs(worm.pts[0].y - orb.y), WYRM_WORLD - Math.abs(worm.pts[0].y - orb.y))
      if (dx * dx + dy * dy < 120) {
        worm.grow += 4
        if (!worm.bot) score += 1
        eaten = true
        break
      }
    }
    return !eaten
  })
  while (orbs.length < 36) {
    const x = nextRandom(seed)
    const y = nextRandom(x.seed)
    seed = y.seed
    orbs.push({ x: x.value * WYRM_WORLD, y: y.value * WYRM_WORLD })
  }

  let dead = false
  for (const worm of bodies) {
    if (hitsBody(head, worm.pts, worm === you ? 10 : 0)) dead = true
  }
  return { bodies, orbs, dead, score, seed }
}
