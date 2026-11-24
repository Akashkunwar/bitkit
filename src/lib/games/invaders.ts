export const INV_W = 480
export const INV_H = 360

export type Alien = { x: number; y: number; alive: boolean }
export type InvShot = { x: number; y: number; vy: number }
export type Invaders = {
  aliens: Alien[]
  dir: 1 | -1
  player: number
  shots: InvShot[]
  score: number
  lives: number
  dead: boolean
  cool: number
  tick: number
  won: boolean
}

export function freshInvaders(): Invaders {
  const aliens: Alien[] = []
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      aliens.push({ x: 48 + col * 46, y: 36 + row * 32, alive: true })
    }
  }
  return { aliens, dir: 1, player: 220, shots: [], score: 0, lives: 3, dead: false, cool: 0, tick: 0, won: false }
}

export function stepInvaders(state: Invaders, move: -1 | 0 | 1, fire: boolean): Invaders {
  if (state.dead || state.won) return state
  const tick = state.tick + 1
  let aliens = state.aliens.map((alien) => ({ ...alien }))
  let dir = state.dir
  if (tick % 18 === 0) {
    const alive = aliens.filter((alien) => alien.alive)
    const minX = Math.min(...alive.map((alien) => alien.x))
    const maxX = Math.max(...alive.map((alien) => alien.x))
    let drop = false
    if ((dir === 1 && maxX > INV_W - 36) || (dir === -1 && minX < 20)) {
      dir = (dir * -1) as 1 | -1
      drop = true
    }
    aliens = aliens.map((alien) =>
      alien.alive ? { ...alien, x: alien.x + (drop ? 0 : dir * 10), y: alien.y + (drop ? 14 : 0) } : alien,
    )
  }

  let cool = Math.max(0, state.cool - 1)
  let shots = state.shots
    .map((shot) => ({ ...shot, y: shot.y + shot.vy }))
    .filter((shot) => shot.y > -10 && shot.y < INV_H)
  if (fire && cool === 0) {
    shots = shots.concat({ x: state.player + 16, y: INV_H - 36, vy: -7 })
    cool = 16
  }
  if (tick % 50 === 0) {
    const columns = new Map<number, Alien>()
    aliens.forEach((alien) => {
      if (!alien.alive) return
      const prev = columns.get(alien.x)
      if (!prev || alien.y > prev.y) columns.set(alien.x, alien)
    })
    const bottoms = [...columns.values()]
    if (bottoms.length) {
      const alien = bottoms[tick % bottoms.length]
      shots = shots.concat({ x: alien.x + 10, y: alien.y + 16, vy: 3.2 })
    }
  }

  let score = state.score
  const spent = new Set<number>()
  aliens.forEach((alien) => {
    if (!alien.alive) return
    shots.forEach((shot, index) => {
      if (shot.vy >= 0 || spent.has(index)) return
      if (Math.abs(shot.x - (alien.x + 12)) < 14 && Math.abs(shot.y - (alien.y + 8)) < 12) {
        alien.alive = false
        spent.add(index)
        score += 10
      }
    })
  })

  let lives = state.lives
  let dead = false
  const player = Math.max(8, Math.min(INV_W - 40, state.player + move * 5))
  shots.forEach((shot, index) => {
    if (shot.vy <= 0 || spent.has(index)) return
    if (shot.y > INV_H - 40 && Math.abs(shot.x - (player + 16)) < 18) {
      spent.add(index)
      lives -= 1
      dead = lives <= 0
    }
  })
  shots = shots.filter((_, index) => !spent.has(index))
  const won = aliens.every((alien) => !alien.alive)
  if (aliens.some((alien) => alien.alive && alien.y > INV_H - 70)) dead = true
  return { aliens, dir, player, shots, score, lives, dead, cool, tick, won }
}
