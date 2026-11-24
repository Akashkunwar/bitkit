/** Vertical shooter. Weave the lane, collect the star, and clear three waves. */

export const SQUAD_W = 480
export const SQUAD_H = 360

export type SquadInput = { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean }
export type SquadShot = { x: number; y: number; vx: number; vy: number; foe: boolean }
export type Bandit = { x: number; y: number; vx: number; hp: number; kind: number }
export type Squad = {
  x: number
  y: number
  cool: number
  spread: number
  shots: SquadShot[]
  foes: Bandit[]
  power: { x: number; y: number } | null
  spawned: number
  score: number
  lives: number
  wave: number
  hurt: number
  star: boolean
  dead: boolean
  won: boolean
  tick: number
  stars: { x: number; y: number; s: number }[]
}

const PW = 22
const PH = 18
const QUOTA = [8, 12, 14]

function stars() {
  const list: { x: number; y: number; s: number }[] = []
  for (let i = 0; i < 36; i += 1) list.push({ x: (i * 97) % SQUAD_W, y: (i * 53) % SQUAD_H, s: 1 + (i % 3) })
  return list
}

export function freshSquadron(): Squad {
  return {
    x: 220,
    y: 300,
    cool: 0,
    spread: 1,
    shots: [],
    foes: [],
    power: null,
    spawned: 0,
    score: 0,
    lives: 3,
    wave: 1,
    hurt: 0,
    star: false,
    dead: false,
    won: false,
    tick: 0,
    stars: stars(),
  }
}

function overlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export function stepSquadron(state: Squad, input: SquadInput): Squad {
  if (state.dead || state.won) return state
  let { x, y, cool, spread, score, lives, wave, spawned, hurt } = state
  const speed = 3.1
  if (input.left) x -= speed
  if (input.right) x += speed
  if (input.up) y -= speed
  if (input.down) y += speed
  x = Math.max(8, Math.min(SQUAD_W - PW - 8, x))
  y = Math.max(24, Math.min(SQUAD_H - PH - 8, y))

  let shots = state.shots.map((shot) => ({ ...shot, x: shot.x + shot.vx, y: shot.y + shot.vy }))
  cool = Math.max(0, cool - 1)
  if (input.fire && cool === 0) {
    const origins = spread >= 3 ? [-1.3, 0, 1.3] : [0]
    origins.forEach((vx) => {
      shots = shots.concat({ x: x + PW / 2 - 1, y, vx, vy: -6.4, foe: false })
    })
    cool = spread >= 3 ? 7 : 10
  }

  let foes = state.foes.map((foe) => ({ ...foe }))
  const quota = QUOTA[wave - 1] ?? QUOTA[2]
  if (spawned < quota && state.tick % 36 === 0) {
    const kind = (spawned + wave) % 3
    foes = foes.concat({
      x: 40 + ((spawned * 67 + wave * 30) % (SQUAD_W - 80)),
      y: -16,
      vx: kind === 1 ? 1.4 : 0.6,
      hp: kind === 2 ? 2 : 1,
      kind,
    })
    spawned += 1
  }
  foes.forEach((foe) => {
    foe.y += foe.kind === 2 ? 1.15 : 1.55
    foe.x += foe.kind === 0 ? Math.sin((state.tick + foe.y) / 10) * 1.4 : foe.vx
    if (foe.x < 10 || foe.x > SQUAD_W - 28) foe.vx *= -1
    if (foe.kind === 2 && state.tick % 50 === 0) {
      shots = shots.concat({ x: foe.x + 8, y: foe.y + 16, vx: 0, vy: 2.8, foe: true })
    }
  })

  let power = state.power
  let star = state.star
  if (!star && wave === 2 && spawned >= 4) {
    power = { x: 230, y: -10 }
    star = true
  }
  if (power) {
    power = { ...power, y: power.y + 1.3 }
    if (overlap(x, y, PW, PH, power.x, power.y, 14, 14)) {
      spread = 3
      score += 50
      power = null
    } else if (power.y > SQUAD_H) power = null
  }

  const spent = new Set<number>()
  foes.forEach((foe) => {
    shots.forEach((shot, index) => {
      if (shot.foe || spent.has(index) || foe.hp <= 0) return
      if (overlap(shot.x, shot.y, 3, 8, foe.x, foe.y, 18, 16)) {
        foe.hp -= 1
        spent.add(index)
        if (foe.hp <= 0) score += 20
      }
    })
  })
  foes = foes.filter((foe) => foe.hp > 0 && foe.y < SQUAD_H + 20)
  shots = shots.filter((shot, index) => {
    if (spent.has(index)) return false
    return shot.y > -12 && shot.y < SQUAD_H + 8 && shot.x > -10 && shot.x < SQUAD_W + 10
  })

  hurt = Math.max(0, hurt - 1)
  if (hurt === 0) {
    const ram = foes.some((foe) => overlap(x, y, PW, PH, foe.x, foe.y, 18, 16))
    const tagged = shots.some((shot) => shot.foe && overlap(shot.x, shot.y, 3, 8, x, y, PW, PH))
    if (ram || tagged) {
      lives -= 1
      hurt = 60
      shots = shots.filter((shot) => !shot.foe)
      if (lives <= 0) {
        return {
          ...state,
          x,
          y,
          cool,
          spread,
          shots,
          foes,
          power,
          spawned,
          score,
          lives: 0,
          wave,
          hurt,
          star,
          dead: true,
          tick: state.tick + 1,
        }
      }
    }
  }

  let won = false
  if (spawned >= quota && foes.length === 0) {
    if (wave >= 3) won = true
    else {
      wave += 1
      spawned = 0
    }
  }
  const field = state.stars.map((star) => ({
    ...star,
    y: star.y + star.s * 0.6 > SQUAD_H ? 0 : star.y + star.s * 0.6,
  }))
  return {
    ...state,
    x,
    y,
    cool,
    spread,
    shots,
    foes,
    power,
    spawned,
    score,
    lives,
    wave,
    hurt,
    star,
    won,
    tick: state.tick + 1,
    stars: field,
  }
}

export const SQUAD_BODY = { w: PW, h: PH }
