export const AST_W = 480
export const AST_H = 360

export type Rock = { x: number; y: number; vx: number; vy: number; r: number }
export type Bolt = { x: number; y: number; vx: number; vy: number; life: number }
export type AstInput = { left: boolean; right: boolean; thrust: boolean; fire: boolean }

export type Asteroids = {
  ship: { x: number; y: number; a: number; vx: number; vy: number; inv: number }
  rocks: Rock[]
  bolts: Bolt[]
  score: number
  lives: number
  dead: boolean
  cool: number
  wave: number
}

function wrap(n: number, max: number) {
  return ((n % max) + max) % max
}

function waveRocks(wave: number, rand: () => number, ship: { x: number; y: number }): Rock[] {
  return Array.from({ length: 3 + wave }, () => {
    let x = rand() * AST_W
    const y = rand() < 0.5 ? 24 : AST_H - 24
    if (Math.hypot(x - ship.x, y - ship.y) < 90) x = (x + AST_W / 2) % AST_W
    return {
      x,
      y,
      vx: (rand() - 0.5) * 1.6,
      vy: (rand() - 0.5) * 1.6,
      r: 34,
    }
  })
}

export function freshAsteroids(rand: () => number): Asteroids {
  return {
    ship: { x: AST_W / 2, y: AST_H / 2, a: -Math.PI / 2, vx: 0, vy: 0, inv: 80 },
    rocks: waveRocks(0, rand, { x: AST_W / 2, y: AST_H / 2 }),
    bolts: [],
    score: 0,
    lives: 3,
    dead: false,
    cool: 0,
    wave: 0,
  }
}

export function stepAsteroids(state: Asteroids, input: AstInput, rand: () => number): Asteroids {
  if (state.dead) return state
  const ship = { ...state.ship }
  if (input.left) ship.a -= 0.08
  if (input.right) ship.a += 0.08
  if (input.thrust) {
    ship.vx += Math.cos(ship.a) * 0.14
    ship.vy += Math.sin(ship.a) * 0.14
  }
  ship.vx *= 0.992
  ship.vy *= 0.992
  ship.x = wrap(ship.x + ship.vx, AST_W)
  ship.y = wrap(ship.y + ship.vy, AST_H)
  if (ship.inv > 0) ship.inv -= 1

  let cool = Math.max(0, state.cool - 1)
  let bolts = state.bolts
    .map((bolt) => ({
      ...bolt,
      x: wrap(bolt.x + bolt.vx, AST_W),
      y: wrap(bolt.y + bolt.vy, AST_H),
      life: bolt.life - 1,
    }))
    .filter((bolt) => bolt.life > 0)
  if (input.fire && cool === 0) {
    bolts = bolts.concat({
      x: ship.x + Math.cos(ship.a) * 16,
      y: ship.y + Math.sin(ship.a) * 16,
      vx: Math.cos(ship.a) * 6.5,
      vy: Math.sin(ship.a) * 6.5,
      life: 36,
    })
    cool = 12
  }

  let rocks = state.rocks.map((rock) => ({
    ...rock,
    x: wrap(rock.x + rock.vx, AST_W),
    y: wrap(rock.y + rock.vy, AST_H),
  }))
  const spent = new Set<number>()
  const broken = new Set<number>()
  const babies: Rock[] = []
  let score = state.score
  bolts.forEach((bolt, bi) => {
    rocks.forEach((rock, ri) => {
      if (broken.has(ri)) return
      const dx = bolt.x - rock.x
      const dy = bolt.y - rock.y
      if (dx * dx + dy * dy > rock.r * rock.r) return
      broken.add(ri)
      spent.add(bi)
      score += rock.r > 22 ? 20 : rock.r > 12 ? 50 : 100
      if (rock.r > 12) {
        for (let k = 0; k < 2; k += 1) {
          const ang = rand() * Math.PI * 2
          babies.push({ x: rock.x, y: rock.y, vx: Math.cos(ang) * 1.7, vy: Math.sin(ang) * 1.7, r: rock.r * 0.55 })
        }
      }
    })
  })
  rocks = rocks.filter((_, index) => !broken.has(index)).concat(babies)
  bolts = bolts.filter((_, index) => !spent.has(index))

  let lives = state.lives
  let dead = false
  if (ship.inv === 0) {
    for (const rock of rocks) {
      const dx = ship.x - rock.x
      const dy = ship.y - rock.y
      if (dx * dx + dy * dy < (rock.r + 8) * (rock.r + 8)) {
        lives -= 1
        ship.x = AST_W / 2
        ship.y = AST_H / 2
        ship.vx = 0
        ship.vy = 0
        ship.inv = 90
        dead = lives <= 0
        break
      }
    }
  }

  let wave = state.wave
  if (!dead && rocks.length === 0) {
    wave += 1
    rocks = waveRocks(wave, rand, ship)
    ship.inv = Math.max(ship.inv, 50)
  }
  return { ship, rocks, bolts, score, lives, dead, cool, wave }
}
