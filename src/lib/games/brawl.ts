/** Side-view brawl. Punch the near ones, kick the ones a step further out. */

export const BRAWL_W = 480
export const BRAWL_H = 240

export type BrawlInput = { left: boolean; right: boolean; punch: boolean; kick: boolean }
export type Thug = { x: number; hp: number; stun: number; max: number; boss: boolean }
export type Brawl = {
  x: number
  face: 1 | -1
  punch: number
  kick: number
  cool: number
  hp: number
  foes: Thug[]
  score: number
  wave: number
  hurt: number
  dead: boolean
  won: boolean
  tick: number
}

function waveOf(wave: number): Thug[] {
  if (wave <= 1) {
    return [
      { x: 340, hp: 18, stun: 0, max: 18, boss: false },
      { x: 400, hp: 18, stun: 0, max: 18, boss: false },
      { x: 460, hp: 18, stun: 0, max: 18, boss: false },
    ]
  }
  if (wave === 2) {
    return [0, 1, 2, 3].map((i) => ({ x: 520 + i * 48, hp: 24, stun: 0, max: 24, boss: false }))
  }
  return [
    { x: 500, hp: 22, stun: 0, max: 22, boss: false },
    { x: 580, hp: 70, stun: 0, max: 70, boss: true },
  ]
}

export function freshBrawl(): Brawl {
  return {
    x: 72,
    face: 1,
    punch: 0,
    kick: 0,
    cool: 0,
    hp: 100,
    foes: waveOf(1),
    score: 0,
    wave: 1,
    hurt: 0,
    dead: false,
    won: false,
    tick: 0,
  }
}

function reaches(x: number, face: number, foeX: number, range: number) {
  const near = face > 0 ? foeX - x : x - foeX
  return near > -12 && near < range
}

export function stepBrawl(state: Brawl, input: BrawlInput): Brawl {
  if (state.dead || state.won) return state
  let { x, face, punch, kick, cool, hp, score, wave, hurt } = state
  if (input.left) {
    x -= 2.4
    face = -1
  }
  if (input.right) {
    x += 2.4
    face = 1
  }
  x = Math.max(24, Math.min(BRAWL_W - 24, x))
  cool = Math.max(0, cool - 1)
  if (cool === 0 && punch === 0 && kick === 0) {
    if (input.punch) {
      punch = 8
      cool = 16
    } else if (input.kick) {
      kick = 10
      cool = 22
    }
  } else {
    punch = Math.max(0, punch - 1)
    kick = Math.max(0, kick - 1)
  }

  let foes = state.foes.map((foe) => ({ ...foe, stun: Math.max(0, foe.stun - 1) }))
  const swinging = punch > 6 || kick > 8
  if (swinging) {
    const range = kick > 0 ? 62 : 36
    const damage = kick > 0 ? 12 : 8
    foes = foes.map((foe) => {
      if (foe.stun > 0 || foe.hp <= 0 || !reaches(x, face, foe.x, range)) return foe
      const hpLeft = foe.hp - damage
      score += hpLeft <= 0 ? (foe.boss ? 400 : 50) : 0
      return { ...foe, hp: hpLeft, stun: 14, x: foe.x + face * (kick > 0 ? 16 : 8) }
    })
  }
  foes = foes.filter((foe) => foe.hp > 0)

  hurt = Math.max(0, hurt - 1)
  foes = foes.map((foe) => {
    if (foe.stun > 0) return foe
    const dir = Math.sign(x - foe.x) || -1
    const speed = foe.boss ? 1.15 : 0.85
    const next = { ...foe, x: foe.x + dir * speed }
    if (hurt === 0 && Math.abs(next.x - x) < 22) {
      hp -= foe.boss ? 8 : 5
      hurt = 28
    }
    return next
  })

  if (hp <= 0) {
    return {
      ...state,
      x,
      face,
      punch: 0,
      kick: 0,
      cool,
      hp: 0,
      foes,
      score,
      wave,
      hurt,
      dead: true,
      tick: state.tick + 1,
    }
  }

  let won = false
  if (foes.length === 0) {
    if (wave >= 3) won = true
    else {
      wave += 1
      foes = waveOf(wave)
    }
  }
  return { ...state, x, face, punch, kick, cool, hp, foes, score, wave, hurt, won, tick: state.tick + 1 }
}
