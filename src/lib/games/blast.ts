/** Drop a bomb, step out of the cross, and clear the floor. */

import { mulberry32 } from './random'

export const BLAST_W = 13
export const BLAST_H = 11
export const BLAST_CELL = 28

export type BlastInput = { dc: number; dr: number; bomb: boolean }
export type Fuse = { c: number; r: number; fuse: number; range: number; armed: boolean }
export type Flame = { c: number; r: number; life: number }
export type Crawler = { c: number; r: number; alive: boolean }
export type Blast = {
  rows: string[]
  c: number
  r: number
  bombs: Fuse[]
  flames: Flame[]
  enemies: Crawler[]
  score: number
  lives: number
  move: number
  seed: number
  hurt: number
  dead: boolean
  won: boolean
  tick: number
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

function grid(): { rows: string[]; c: number; r: number; enemies: Crawler[] } {
  const rows = Array.from({ length: BLAST_H }, (_, r) =>
    Array.from({ length: BLAST_W }, (_, c) => {
      if (r === 0 || c === 0 || r === BLAST_H - 1 || c === BLAST_W - 1) return '#'
      if (r % 2 === 0 && c % 2 === 0) return '#'
      return ' '
    }).join(''),
  )
  const set = (c: number, r: number, ch: string) => {
    rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1)
  }
  const soft = [
    [3, 1],
    [5, 1],
    [7, 1],
    [9, 1],
    [2, 3],
    [4, 3],
    [6, 3],
    [8, 3],
    [10, 3],
    [1, 5],
    [3, 5],
    [5, 5],
    [7, 5],
    [9, 5],
    [2, 7],
    [4, 7],
    [6, 7],
    [8, 7],
    [10, 7],
    [3, 9],
    [5, 9],
    [7, 9],
  ]
  soft.forEach(([c, r]) => set(c, r, '+'))
  const enemies = [
    { c: 11, r: 9, alive: true },
    { c: 9, r: 9, alive: true },
    { c: 11, r: 5, alive: true },
  ]
  return { rows, c: 1, r: 1, enemies }
}

export function freshBlast(): Blast {
  const start = grid()
  return {
    rows: start.rows,
    c: start.c,
    r: start.r,
    bombs: [],
    flames: [],
    enemies: start.enemies,
    score: 0,
    lives: 3,
    move: 0,
    seed: 7,
    hurt: 0,
    dead: false,
    won: false,
    tick: 0,
  }
}

function cell(rows: string[], c: number, r: number) {
  return rows[r]?.[c] ?? '#'
}

function setCell(rows: string[], c: number, r: number, ch: string) {
  const next = rows.slice()
  next[r] = next[r].slice(0, c) + ch + next[r].slice(c + 1)
  return next
}

function open(rows: string[], bombs: Fuse[], c: number, r: number) {
  if (cell(rows, c, r) !== ' ') return false
  return !bombs.some((bomb) => bomb.armed && bomb.c === c && bomb.r === r)
}

export function blastRays(rows: string[], c: number, r: number, range: number) {
  const hit: { c: number; r: number; stop: boolean }[] = [{ c, r, stop: false }]
  DIRS.forEach(([dc, dr]) => {
    for (let i = 1; i <= range; i += 1) {
      const nc = c + dc * i
      const nr = r + dr * i
      const ch = cell(rows, nc, nr)
      if (ch === '#') break
      hit.push({ c: nc, r: nr, stop: ch === '+' })
      if (ch === '+') break
    }
  })
  return hit
}

export function stepBlast(state: Blast, input: BlastInput): Blast {
  if (state.dead || state.won) return state
  let { c, r, move, seed, score, lives, hurt } = state
  let rows = state.rows
  let bombs = state.bombs.map((bomb) => ({ ...bomb }))
  let enemies = state.enemies.map((enemy) => ({ ...enemy }))
  move = Math.max(0, move - 1)
  if (move === 0 && (input.dc || input.dr)) {
    const nc = c + Math.sign(input.dc)
    const nr = r + Math.sign(input.dr)
    const blockedByEnemy = enemies.some((enemy) => enemy.alive && enemy.c === nc && enemy.r === nr)
    if (open(rows, bombs, nc, nr) && !blockedByEnemy) {
      c = nc
      r = nr
      move = 7
    }
  }
  bombs.forEach((bomb) => {
    if (bomb.c !== c || bomb.r !== r) bomb.armed = true
  })
  if (input.bomb && bombs.length < 1 && !bombs.some((bomb) => bomb.c === c && bomb.r === r)) {
    bombs = bombs.concat({ c, r, fuse: 45, range: 2, armed: false })
  }

  let flames = state.flames.map((flame) => ({ ...flame, life: flame.life - 1 })).filter((flame) => flame.life > 0)
  bombs.forEach((bomb) => {
    bomb.fuse -= 1
  })
  const due = bombs.filter((bomb) => bomb.fuse <= 0)
  bombs = bombs.filter((bomb) => bomb.fuse > 0)
  due.forEach((bomb) => {
    const rays = blastRays(rows, bomb.c, bomb.r, bomb.range)
    rays.forEach((spot) => {
      if (cell(rows, spot.c, spot.r) === '+') {
        rows = setCell(rows, spot.c, spot.r, ' ')
        score += 20
      }
      flames = flames.concat({ c: spot.c, r: spot.r, life: 16 })
      bombs.forEach((other) => {
        if (other.c === spot.c && other.r === spot.r) other.fuse = Math.min(other.fuse, 1)
      })
    })
  })

  const hot = (col: number, row: number) => flames.some((flame) => flame.c === col && flame.r === row)
  enemies.forEach((enemy) => {
    if (enemy.alive && hot(enemy.c, enemy.r)) {
      enemy.alive = false
      score += 100
    }
  })
  enemies = enemies.filter((enemy) => enemy.alive)

  if (hot(c, r) && hurt === 0) {
    lives -= 1
    hurt = 40
    if (lives <= 0) {
      return {
        ...state,
        rows,
        c,
        r,
        bombs,
        flames,
        enemies,
        score,
        lives: 0,
        move,
        seed,
        hurt,
        dead: true,
        tick: state.tick + 1,
      }
    }
    c = 1
    r = 1
  } else hurt = Math.max(0, hurt - 1)

  if (state.tick % 16 === 0) {
    const roll = mulberry32(seed + state.tick)
    enemies = enemies.map((enemy) => {
      const options = DIRS.map(([dc, dr]) => ({ c: enemy.c + dc, r: enemy.r + dr }))
        .filter((spot) => open(rows, bombs, spot.c, spot.r))
        .filter((spot) => spot.c !== c || spot.r !== r)
      if (!options.length) return enemy
      options.sort((a, b) => Math.abs(a.c - c) + Math.abs(a.r - r) - (Math.abs(b.c - c) + Math.abs(b.r - r)))
      const pick = roll() < 0.7 ? options[0] : options[Math.floor(roll() * options.length)]
      return { ...enemy, c: pick.c, r: pick.r }
    })
    seed = (seed + 1) >>> 0
  }

  const won = enemies.length === 0
  return {
    ...state,
    rows,
    c,
    r,
    bombs,
    flames,
    enemies,
    score,
    lives,
    move,
    seed,
    hurt,
    won,
    tick: state.tick + 1,
  }
}
