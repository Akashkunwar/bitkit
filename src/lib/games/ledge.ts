/** Side-view platformer. Run, jump, stomp, and reach the flag. */

export const TILE = 16
export const LEDGE_W = 480
export const LEDGE_H = 240
const PW = 12
const PH = 14
const GRAV = 0.4
const JUMP = -7.4

export type LedgeInput = { left: boolean; right: boolean; jump: boolean }
export type Walker = { x: number; y: number; vx: number; alive: boolean }
export type Ledge = {
  level: number
  rows: string[]
  x: number
  y: number
  vx: number
  vy: number
  face: 1 | -1
  coyote: number
  holding: boolean
  buffer: number
  coins: boolean[]
  enemies: Walker[]
  score: number
  bank: number
  lives: number
  dead: boolean
  won: boolean
  tick: number
}

const H = 15

function level(width: number, paint: (set: (x: number, y: number, ch: string) => void) => void): string[] {
  const rows = Array.from({ length: H }, () => ' '.repeat(width))
  const set = (x: number, y: number, ch: string) => {
    if (x < 0 || y < 0 || y >= H || x >= width) return
    rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1)
  }
  for (let y = 0; y < H; y += 1) {
    set(0, y, '#')
    set(width - 1, y, '#')
  }
  for (let x = 0; x < width; x += 1) set(x, H - 1, '#')
  set(2, H - 2, 'P')
  paint(set)
  return rows
}

function platform(set: (x: number, y: number, ch: string) => void, x: number, y: number, w: number) {
  for (let i = 0; i < w; i += 1) set(x + i, y, '#')
}

export const LEDGE_LEVELS: string[][] = [
  level(46, (set) => {
    set(6, 12, 'o')
    set(7, 12, 'o')
    set(8, 11, 'o')
    platform(set, 12, 12, 4)
    set(13, 11, 'E')
    set(14, 11, 'o')
    for (let x = 20; x <= 21; x += 1) set(x, H - 1, ' ')
    set(26, 12, 'o')
    set(27, 12, 'o')
    for (let x = 34; x <= 35; x += 1) set(x, H - 1, ' ')
    set(39, 13, 'F')
  }),
  level(54, (set) => {
    set(6, 12, 'o')
    for (let x = 11; x <= 12; x += 1) set(x, H - 1, ' ')
    platform(set, 16, 12, 4)
    set(17, 11, 'o')
    set(18, 11, 'E')
    for (let x = 24; x <= 25; x += 1) set(x, H - 1, ' ')
    set(30, 13, '^')
    set(31, 13, '^')
    set(36, 12, 'o')
    for (let x = 42; x <= 43; x += 1) set(x, H - 1, ' ')
    set(47, 13, 'F')
  }),
  level(62, (set) => {
    for (let x = 9; x <= 10; x += 1) set(x, H - 1, ' ')
    platform(set, 14, 12, 5)
    set(15, 11, 'o')
    set(17, 11, 'E')
    for (let x = 23; x <= 24; x += 1) set(x, H - 1, ' ')
    set(31, 13, '^')
    set(32, 12, 'o')
    platform(set, 36, 12, 3)
    platform(set, 39, 11, 3)
    set(40, 10, 'o')
    for (let x = 46; x <= 47; x += 1) set(x, H - 1, ' ')
    for (let x = 54; x <= 55; x += 1) set(x, H - 1, ' ')
    set(58, 13, 'F')
  }),
]

function tileAt(rows: string[], tx: number, ty: number) {
  if (ty < 0) return ' '
  if (ty >= rows.length) return ' '
  if (tx < 0 || tx >= rows[0].length) return '#'
  return rows[ty][tx]
}

function solid(ch: string) {
  return ch === '#'
}

function hitsSolid(rows: string[], x: number, y: number, w: number, h: number) {
  const x0 = Math.floor(x / TILE)
  const x1 = Math.floor((x + w - 0.01) / TILE)
  const y0 = Math.floor(y / TILE)
  const y1 = Math.floor((y + h - 0.01) / TILE)
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (solid(tileAt(rows, tx, ty))) return true
    }
  }
  return false
}

function cellsTouching(x: number, y: number, w: number, h: number) {
  const found: { tx: number; ty: number }[] = []
  const x0 = Math.floor(x / TILE)
  const x1 = Math.floor((x + w - 0.01) / TILE)
  const y0 = Math.floor(y / TILE)
  const y1 = Math.floor((y + h - 0.01) / TILE)
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) found.push({ tx, ty })
  }
  return found
}

function overlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export function makeLedge(rows: string[], level: number, score: number, lives: number): Ledge {
  let x = TILE * 2
  let y = TILE
  const coins = rows.flatMap((row) => [...row].map((ch) => ch === 'o'))
  const enemies: Walker[] = []
  rows.forEach((row, ty) => {
    ;[...row].forEach((ch, tx) => {
      if (ch === 'P') {
        x = tx * TILE + 2
        y = ty * TILE + TILE - PH
      }
      if (ch === 'E') enemies.push({ x: tx * TILE + 2, y: ty * TILE + TILE - PH, vx: -0.7, alive: true })
    })
  })
  return {
    level,
    rows,
    x,
    y,
    vx: 0,
    vy: 0,
    face: 1,
    coyote: 6,
    holding: false,
    buffer: 0,
    coins,
    enemies,
    score,
    bank: score,
    lives,
    dead: false,
    won: false,
    tick: 0,
  }
}

export function freshLedge(): Ledge {
  return makeLedge(LEDGE_LEVELS[0], 0, 0, 3)
}

function loseLife(state: Ledge): Ledge {
  const lives = state.lives - 1
  if (lives <= 0) return { ...state, lives: 0, dead: true, vx: 0, vy: 0 }
  return makeLedge(state.rows, state.level, state.bank, lives)
}

function stepWalker(rows: string[], enemy: Walker): Walker {
  if (!enemy.alive) return enemy
  let { x, y, vx } = enemy
  x += vx
  if (hitsSolid(rows, x, y, PW, PH)) {
    x = vx > 0 ? Math.floor((x + PW - 0.01) / TILE) * TILE - PW : (Math.floor(x / TILE) + 1) * TILE
    vx *= -1
  }
  y += 3.2
  if (hitsSolid(rows, x, y, PW, PH)) {
    y = Math.floor((y + PH - 0.01) / TILE) * TILE - PH
    const front = vx > 0 ? x + PW + 1 : x - 1
    const below = tileAt(rows, Math.floor(front / TILE), Math.floor((y + PH + 1) / TILE))
    if (!solid(below)) vx *= -1
  }
  if (y > rows.length * TILE) return { ...enemy, alive: false }
  return { ...enemy, x, y, vx }
}

export function stepLedge(state: Ledge, input: LedgeInput): Ledge {
  if (state.dead || state.won) return state
  const rows = state.rows
  let { x, y, vx, vy, face, coyote, buffer } = state
  const pressed = input.jump && !state.holding
  if (pressed) buffer = 7
  if (input.left) {
    vx -= 0.42
    face = -1
  }
  if (input.right) {
    vx += 0.42
    face = 1
  }
  if (!input.left && !input.right) vx *= 0.78
  vx = Math.max(-2.5, Math.min(2.5, vx))
  vy = Math.min(8, vy + GRAV)

  const prevBottom = y + PH
  x += vx
  if (hitsSolid(rows, x, y, PW, PH)) {
    x = vx > 0 ? Math.floor((x + PW - 0.01) / TILE) * TILE - PW : (Math.floor(x / TILE) + 1) * TILE
    vx = 0
  }
  y += vy
  let grounded = false
  if (hitsSolid(rows, x, y, PW, PH)) {
    if (vy >= 0) {
      y = Math.floor((y + PH - 0.01) / TILE) * TILE - PH
      grounded = true
    } else y = Math.ceil(y / TILE) * TILE
    vy = 0
  }
  coyote = grounded ? 6 : Math.max(0, coyote - 1)
  if (buffer > 0 && coyote > 0) {
    vy = JUMP
    buffer = 0
    coyote = 0
    grounded = false
  } else if (!input.jump && vy < 0) vy *= 0.55
  buffer = Math.max(0, buffer - 1)

  if (y > rows.length * TILE) return loseLife({ ...state, x, y, vx, vy })

  const coins = state.coins.slice()
  let score = state.score
  cellsTouching(x, y, PW, PH).forEach(({ tx, ty }) => {
    const ch = tileAt(rows, tx, ty)
    const index = ty * rows[0].length + tx
    if (ch === 'o' && coins[index]) {
      coins[index] = false
      score += 10
    }
  })

  if (cellsTouching(x, y, PW, PH).some(({ tx, ty }) => tileAt(rows, tx, ty) === '^')) {
    return loseLife({ ...state, x, y, vx, vy, coins, score })
  }

  let enemies = state.enemies.map((enemy) => stepWalker(rows, enemy))
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i]
    if (!enemy.alive || !overlap(x, y, PW, PH, enemy.x, enemy.y, PW, PH)) continue
    if (vy > 0 && prevBottom <= enemy.y + 8) {
      enemies = enemies.map((item, index) => (index === i ? { ...item, alive: false } : item))
      vy = -4.2
      score += 100
    } else return loseLife({ ...state, x, y, vx, vy, coins, score, enemies })
  }

  const flagged = cellsTouching(x, y, PW, PH).some(({ tx, ty }) => tileAt(rows, tx, ty) === 'F')
  if (flagged) {
    const next = state.level + 1
    if (next >= LEDGE_LEVELS.length) {
      return {
        ...state,
        x,
        y,
        vx,
        vy,
        face,
        coyote,
        buffer,
        holding: input.jump,
        coins,
        enemies,
        score,
        won: true,
        tick: state.tick + 1,
      }
    }
    return makeLedge(LEDGE_LEVELS[next], next, score, state.lives)
  }

  return {
    ...state,
    x,
    y,
    vx,
    vy,
    face,
    coyote,
    buffer,
    holding: input.jump,
    coins,
    enemies,
    score,
    tick: state.tick + 1,
  }
}

export function ledgeCamera(state: Ledge) {
  const world = state.rows[0].length * TILE
  return Math.max(0, Math.min(state.x - LEDGE_W * 0.35, world - LEDGE_W))
}

export const LEDGE_BODY = { w: PW, h: PH }
