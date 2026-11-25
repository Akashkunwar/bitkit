/** Grid tank battle. Bricks break, steel holds, and the base must survive. */

import { mulberry32 } from './random'

export const TANK_CELL = 24
export const TANK_N = 13

export type TankDir = 'up' | 'down' | 'left' | 'right'
export type TankInput = { dir: TankDir | null; fire: boolean }
export type TankUnit = { x: number; y: number; dir: TankDir; cool: number; foe: boolean; alive: boolean; id: number }
export type Shell = { x: number; y: number; dir: TankDir; foe: boolean; owner: number }
export type Tanks = {
  rows: string[]
  tanks: TankUnit[]
  shells: Shell[]
  score: number
  lives: number
  stage: number
  seed: number
  hurt: number
  dead: boolean
  won: boolean
  lost: '' | 'base' | 'tank'
  tick: number
}

const STEP: Record<TankDir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

export const TANK_MAPS = [
  [
    '#############',
    '#P....#....E#',
    '#.##.#.#.##.#',
    '#....#.#....#',
    '#.##.#.#.##.#',
    '#.#.......#.#',
    '#.#.##B##.#.#',
    '#.#.......#.#',
    '#.##.#.#.##.#',
    '#....#.#....#',
    '#.##.#.#.##.#',
    '#E........E.#',
    '#############',
  ],
  [
    '#############',
    '#P..S...S..E#',
    '#.#.#.#.#.#.#',
    '#...#...#...#',
    '#S#.#.#.#.#S#',
    '#...........#',
    '####..B..####',
    '#...........#',
    '#S#.#.#.#.#S#',
    '#...#...#...#',
    '#.#.#.#.#.#.#',
    '#E........E.#',
    '#############',
  ],
]

function blocked(ch: string) {
  return ch === '#' || ch === 'S' || ch === 'W' || ch === 'B' || ch === undefined
}

function tile(rows: string[], c: number, r: number) {
  if (r < 0 || c < 0 || r >= rows.length || c >= rows[0].length) return '#'
  return rows[r][c]
}

function hitsMap(rows: string[], x: number, y: number, size: number) {
  const corners = [
    [x, y],
    [x + size - 0.1, y],
    [x, y + size - 0.1],
    [x + size - 0.1, y + size - 0.1],
  ]
  return corners.some(([cx, cy]) => blocked(tile(rows, Math.floor(cx / TANK_CELL), Math.floor(cy / TANK_CELL))))
}

function load(stage: number, score: number, lives: number): Tanks {
  const rows = TANK_MAPS[stage].slice()
  const tanks: TankUnit[] = []
  rows.forEach((row, r) => {
    ;[...row].forEach((ch, c) => {
      if (ch === 'P' || ch === 'E') {
        tanks.push({
          x: c * TANK_CELL + 3,
          y: r * TANK_CELL + 3,
          dir: ch === 'P' ? 'up' : 'down',
          cool: ch === 'P' ? 0 : 20,
          foe: ch === 'E',
          alive: true,
          id: tanks.length,
        })
      }
    })
  })
  const cleared = rows.map((row) => row.replaceAll('P', '.').replaceAll('E', '.'))
  return {
    rows: cleared,
    tanks,
    shells: [],
    score,
    lives,
    stage,
    seed: 1000 + stage * 17,
    hurt: 40,
    dead: false,
    won: false,
    lost: '',
    tick: 0,
  }
}

export function freshTanks(): Tanks {
  return load(0, 0, 3)
}

function setTile(rows: string[], c: number, r: number, ch: string) {
  const next = rows.slice()
  next[r] = next[r].slice(0, c) + ch + next[r].slice(c + 1)
  return next
}

function lineClear(rows: string[], fromC: number, fromR: number, toC: number, toR: number) {
  const dc = Math.sign(toC - fromC)
  const dr = Math.sign(toR - fromR)
  let c = fromC + dc
  let r = fromR + dr
  while (c !== toC || r !== toR) {
    const ch = tile(rows, c, r)
    if (ch === '#' || ch === 'S') return false
    c += dc
    r += dr
  }
  return true
}

export function stepTanks(state: Tanks, input: TankInput): Tanks {
  if (state.dead || state.won) return state
  let rows = state.rows
  const tanks = state.tanks.map((tank) => ({ ...tank }))
  let shells = state.shells.map((shell) => ({ ...shell }))
  let { score, lives, seed, hurt } = state
  const player = tanks.find((tank) => !tank.foe && tank.alive)
  if (player && input.dir) {
    player.dir = input.dir
    const [dx, dy] = STEP[input.dir]
    const nx = player.x + dx * 1.35
    const ny = player.y + dy * 1.35
    const size = 18
    if (!hitsMap(rows, nx, player.y, size)) player.x = nx
    if (!hitsMap(rows, player.x, ny, size)) player.y = ny
    player.x = Math.max(0, Math.min(TANK_CELL * TANK_N - size, player.x))
    player.y = Math.max(0, Math.min(TANK_CELL * TANK_N - size, player.y))
  }
  if (player) player.cool = Math.max(0, player.cool - 1)
  if (player && input.fire && player.cool === 0 && !shells.some((shell) => shell.owner === player.id)) {
    const [dx, dy] = STEP[player.dir]
    shells = shells.concat({
      x: player.x + 9 + dx * 12,
      y: player.y + 9 + dy * 12,
      dir: player.dir,
      foe: false,
      owner: player.id,
    })
    player.cool = 18
  }

  const roll = mulberry32(seed)
  seed = (seed + 1) >>> 0
  tanks.forEach((tank) => {
    if (!tank.foe || !tank.alive || !player) return
    tank.cool = Math.max(0, tank.cool - 1)
    if (state.tick % 18 === tank.id % 18) {
      const pc = Math.floor((player.x + 9) / TANK_CELL)
      const pr = Math.floor((player.y + 9) / TANK_CELL)
      const tc = Math.floor((tank.x + 9) / TANK_CELL)
      const tr = Math.floor((tank.y + 9) / TANK_CELL)
      if (pc === tc && lineClear(rows, tc, tr, pc, pr)) tank.dir = pr > tr ? 'down' : 'up'
      else if (pr === tr && lineClear(rows, tc, tr, pc, pr)) tank.dir = pc > tc ? 'right' : 'left'
      else if (roll() < 0.35) {
        const dirs: TankDir[] = ['up', 'down', 'left', 'right']
        tank.dir = dirs[Math.floor(roll() * 4)]
      }
    }
    const [dx, dy] = STEP[tank.dir]
    const nx = tank.x + dx * 0.85
    const ny = tank.y + dy * 0.85
    if (!hitsMap(rows, nx, tank.y, 18)) tank.x = nx
    else tank.dir = dx !== 0 ? (roll() < 0.5 ? 'up' : 'down') : roll() < 0.5 ? 'left' : 'right'
    if (!hitsMap(rows, tank.x, ny, 18)) tank.y = ny
    const aligned =
      player &&
      (Math.abs(player.x - tank.x) < 10 || Math.abs(player.y - tank.y) < 10) &&
      lineClear(
        rows,
        Math.floor((tank.x + 9) / TANK_CELL),
        Math.floor((tank.y + 9) / TANK_CELL),
        Math.floor((player.x + 9) / TANK_CELL),
        Math.floor((player.y + 9) / TANK_CELL),
      )
    if (aligned && tank.cool === 0 && !shells.some((shell) => shell.owner === tank.id)) {
      const [sx, sy] = STEP[tank.dir]
      shells = shells.concat({
        x: tank.x + 9 + sx * 12,
        y: tank.y + 9 + sy * 12,
        dir: tank.dir,
        foe: true,
        owner: tank.id,
      })
      tank.cool = 36
    }
  })

  const keep = new Set<number>()
  shells.forEach((shell, index) => {
    const [dx, dy] = STEP[shell.dir]
    shell.x += dx * 3.4
    shell.y += dy * 3.4
    const c = Math.floor(shell.x / TANK_CELL)
    const r = Math.floor(shell.y / TANK_CELL)
    const ch = tile(rows, c, r)
    const rim = c <= 0 || r <= 0 || c >= TANK_N - 1 || r >= TANK_N - 1
    if (ch === 'B') {
      if (shell.foe) lives = 0
      return
    }
    if (ch === '#' && !rim) {
      rows = setTile(rows, c, r, '.')
      score += 10
      return
    }
    if (ch === '#' || ch === 'S' || rim) return
    keep.add(index)
  })
  if (lives <= 0) {
    return { ...state, rows, tanks, shells: [], score, lives: 0, seed, dead: true, lost: 'base', tick: state.tick + 1 }
  }
  shells = shells.filter((_, index) => keep.has(index))

  tanks.forEach((tank) => {
    if (!tank.alive) return
    shells.forEach((shell) => {
      if (shell.foe === tank.foe) return
      if (!tank.foe && hurt > 0) return
      if (Math.abs(shell.x - (tank.x + 9)) < 12 && Math.abs(shell.y - (tank.y + 9)) < 12) {
        tank.alive = false
        shell.x = -999
        if (tank.foe) score += 100
      }
    })
  })
  shells = shells.filter(
    (shell) => shell.x > -10 && shell.y > -10 && shell.x < TANK_CELL * TANK_N && shell.y < TANK_CELL * TANK_N,
  )

  const hero = tanks.find((tank) => !tank.foe)
  if (hero && !hero.alive) {
    lives -= 1
    if (lives <= 0)
      return { ...state, rows, tanks, shells, score, lives: 0, seed, dead: true, lost: 'tank', tick: state.tick + 1 }
    const respawn = load(state.stage, score, lives)
    const kept = respawn.tanks.map((tank) => {
      if (!tank.foe) return { ...tank, cool: 0 }
      const prev = tanks.find((item) => item.id === tank.id)
      return prev ? { ...tank, alive: prev.alive, x: prev.x, y: prev.y, dir: prev.dir } : tank
    })
    return { ...respawn, rows, tanks: kept, shells: [], score, lives, seed, hurt: 45, tick: state.tick + 1 }
  }

  hurt = Math.max(0, hurt - 1)
  const foesLeft = tanks.some((tank) => tank.foe && tank.alive)
  if (!foesLeft) {
    const next = state.stage + 1
    if (next >= TANK_MAPS.length) {
      return { ...state, rows, tanks, shells, score, lives, seed, hurt, won: true, tick: state.tick + 1 }
    }
    return { ...load(next, score, lives), tick: state.tick + 1 }
  }
  return { ...state, rows, tanks, shells, score, lives, seed, hurt, tick: state.tick + 1 }
}
