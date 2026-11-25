/** Run-and-gun. Jump, fire ahead or upward, and clear four waves. */

export const RAID_W = 480
export const RAID_H = 270

export type RaidInput = { left: boolean; right: boolean; jump: boolean; fire: boolean; aimUp: boolean }
export type RaidBullet = { x: number; y: number; vx: number; vy: number; foe: boolean }
export type Soldier = {
  x: number
  y: number
  w: number
  h: number
  vx: number
  hp: number
  cool: number
  kind: 'grunt' | 'turret' | 'boss'
  face: 1 | -1
}
export type Plat = { x: number; y: number; w: number; h: number }
export type Raid = {
  x: number
  y: number
  vx: number
  vy: number
  face: 1 | -1
  holding: boolean
  cool: number
  hurt: number
  bullets: RaidBullet[]
  foes: Soldier[]
  platforms: Plat[]
  score: number
  lives: number
  wave: number
  pause: number
  dead: boolean
  won: boolean
  tick: number
}

const PW = 16
const PH = 22
const GRAV = 0.38
const JUMP = -7.05

export const RAID_PLATS: Plat[] = [
  { x: 0, y: 246, w: 480, h: 24 },
  { x: 36, y: 188, w: 128, h: 8 },
  { x: 196, y: 142, w: 108, h: 8 },
  { x: 332, y: 188, w: 120, h: 8 },
]

function grunt(x: number, hp = 1): Soldier {
  return { x, y: 246 - 20, w: 16, h: 20, vx: -0.7, hp, cool: 40, kind: hp > 2 ? 'boss' : 'grunt', face: -1 }
}

function turret(x: number, y: number): Soldier {
  return { x, y: y - 18, w: 18, h: 18, vx: 0, hp: 3, cool: 30, kind: 'turret', face: -1 }
}

export function raidWave(wave: number): Soldier[] {
  if (wave <= 1) return [grunt(400), grunt(450), grunt(360)]
  if (wave === 2) return [grunt(420), grunt(70), turret(220, 142)]
  if (wave === 3) return [grunt(430), grunt(80), turret(50, 188), turret(360, 188)]
  return [grunt(400, 8), grunt(450), turret(220, 142)]
}

export function freshRaid(): Raid {
  return {
    x: 48,
    y: 246 - PH,
    vx: 0,
    vy: 0,
    face: 1,
    holding: false,
    cool: 0,
    hurt: 0,
    bullets: [],
    foes: raidWave(1),
    platforms: RAID_PLATS,
    score: 0,
    lives: 3,
    wave: 1,
    pause: 50,
    dead: false,
    won: false,
    tick: 0,
  }
}

function overlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function land(x: number, y: number, vy: number, plats: Plat[]) {
  if (vy < 0) return { y, vy, grounded: false }
  const prevFoot = y + PH - vy
  let top = Infinity
  for (const plat of plats) {
    const overlapX = x + PW > plat.x && x < plat.x + plat.w
    if (overlapX && prevFoot <= plat.y + 4 && y + PH >= plat.y && plat.y < top) top = plat.y
  }
  if (top === Infinity) return { y, vy, grounded: false }
  return { y: top - PH, vy: 0, grounded: true }
}

export function stepRaid(state: Raid, input: RaidInput): Raid {
  if (state.dead || state.won) return state
  let { x, y, vx, vy, face, cool, hurt, pause, wave, score, lives } = state
  const pressed = input.jump && !state.holding
  if (input.left) {
    vx -= 0.45
    face = -1
  }
  if (input.right) {
    vx += 0.45
    face = 1
  }
  if (!input.left && !input.right) vx *= 0.72
  vx = Math.max(-2.6, Math.min(2.6, vx))
  const before = land(x, y, 0, state.platforms)
  vy = Math.min(8, vy + GRAV)
  if (pressed && before.grounded) vy = JUMP
  x = Math.max(0, Math.min(RAID_W - PW, x + vx))
  y += vy
  const landed = land(x, y, vy, state.platforms)
  y = landed.y
  vy = landed.vy
  if (y > RAID_H) {
    y = 246 - PH
    vy = 0
    lives -= 1
  }

  cool = Math.max(0, cool - 1)
  let bullets = state.bullets.map((bullet) => ({
    ...bullet,
    x: bullet.x + bullet.vx,
    y: bullet.y + bullet.vy,
  }))
  if (input.fire && cool === 0 && hurt === 0) {
    const up = input.aimUp
    bullets = bullets.concat({
      x: x + (face > 0 ? PW : -4),
      y: y + (up ? 2 : 8),
      vx: up ? face * 1.4 : face * 6.2,
      vy: up ? -6.2 : 0,
      foe: false,
    })
    cool = 12
  }

  let foes = state.foes.map((foe) => ({ ...foe }))
  foes.forEach((foe) => {
    if (foe.kind !== 'turret') {
      foe.face = x + PW / 2 < foe.x ? -1 : 1
      foe.vx = foe.face * (foe.kind === 'boss' ? 0.85 : 0.65)
      foe.x += foe.vx
      if (foe.x < 8 || foe.x > RAID_W - 24) foe.vx *= -1
    } else foe.face = x < foe.x ? -1 : 1
    foe.cool -= 1
    if (foe.cool <= 0) {
      const speed = foe.kind === 'turret' ? 2.6 : 2.3
      const dx = x + 8 - foe.x
      const dy = y + 8 - (foe.y + 6)
      const dist = Math.hypot(dx, dy) || 1
      const aimed = foe.kind !== 'grunt'
      bullets = bullets.concat({
        x: foe.x + (foe.face > 0 ? foe.w : -4),
        y: foe.y + 6,
        vx: aimed ? (dx / dist) * speed : foe.face * speed,
        vy: aimed ? (dy / dist) * speed : 0,
        foe: true,
      })
      foe.cool = foe.kind === 'boss' ? 28 : foe.kind === 'turret' ? 48 : 70
    }
  })

  const spent = new Set<number>()
  foes.forEach((foe) => {
    bullets.forEach((bullet, index) => {
      if (bullet.foe || spent.has(index) || foe.hp <= 0) return
      if (overlap(bullet.x, bullet.y, 4, 4, foe.x, foe.y, foe.w, foe.h)) {
        foe.hp -= 1
        spent.add(index)
        if (foe.hp <= 0) score += foe.kind === 'boss' ? 500 : 100
      }
    })
  })
  foes = foes.filter((foe) => foe.hp > 0)
  bullets = bullets.filter((bullet, index) => {
    if (spent.has(index)) return false
    if (bullet.x < -8 || bullet.x > RAID_W + 8 || bullet.y < -8 || bullet.y > RAID_H) return false
    return true
  })

  if (hurt === 0) {
    const hit =
      bullets.some((bullet) => bullet.foe && overlap(bullet.x, bullet.y, 4, 4, x, y, PW, PH)) ||
      foes.some((foe) => overlap(x, y, PW, PH, foe.x, foe.y, foe.w, foe.h))
    if (hit) {
      lives -= 1
      hurt = 50
      bullets = bullets.filter((bullet) => !bullet.foe)
      if (lives <= 0) {
        return {
          ...state,
          x,
          y,
          vx,
          vy,
          face,
          holding: input.jump,
          cool,
          hurt,
          bullets,
          foes,
          score,
          lives: 0,
          dead: true,
          tick: state.tick + 1,
        }
      }
    }
  } else hurt -= 1

  let won = false
  if (foes.length === 0) {
    pause -= 1
    if (pause <= 0) {
      if (wave >= 4) won = true
      else {
        wave += 1
        foes = raidWave(wave).map((foe) => {
          if (Math.abs(foe.x - x) < 56 && Math.abs(foe.y - y) < 36) {
            return { ...foe, x: foe.x < x ? Math.max(16, foe.x - 90) : Math.min(450, foe.x + 90) }
          }
          return foe
        })
        hurt = Math.max(hurt, 40)
        pause = 50
      }
    }
  }

  return {
    ...state,
    x,
    y,
    vx,
    vy,
    face,
    holding: input.jump,
    cool,
    hurt,
    bullets,
    foes,
    score,
    lives,
    wave,
    pause,
    won,
    tick: state.tick + 1,
  }
}

export const RAID_BODY = { w: PW, h: PH }
