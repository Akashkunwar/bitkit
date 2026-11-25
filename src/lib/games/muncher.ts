const ROWS = [
  '###############',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '#.#.#######.#.#',
  '#.............#',
  '#.###.###.###.#',
  '#.....#.#.....#',
  '#.###.#.#.###.#',
  '#.............#',
  '###############',
]

export type Muncher = {
  rows: string[]
  dots: boolean[]
  px: number
  py: number
  gx: number
  gy: number
  score: number
  lives: number
  dead: boolean
  won: boolean
}

function index(x: number, y: number) {
  return y * ROWS[0].length + x
}

function open(x: number, y: number) {
  return ROWS[y]?.[x] === '.'
}

export function freshMuncher(): Muncher {
  const dots = ROWS.join('')
    .split('')
    .map((cell, i) => cell === '.' && i !== index(1, 1))
  return { rows: ROWS, dots, px: 1, py: 1, gx: 13, gy: 9, score: 0, lives: 3, dead: false, won: false }
}

function chase(state: Muncher) {
  const options = [
    { x: state.gx + 1, y: state.gy },
    { x: state.gx - 1, y: state.gy },
    { x: state.gx, y: state.gy + 1 },
    { x: state.gx, y: state.gy - 1 },
  ].filter((cell) => open(cell.x, cell.y))
  options.sort(
    (a, b) =>
      Math.abs(a.x - state.px) + Math.abs(a.y - state.py) - (Math.abs(b.x - state.px) + Math.abs(b.y - state.py)),
  )
  return options[0] ?? { x: state.gx, y: state.gy }
}

export function stepMuncher(state: Muncher, dir: { x: number; y: number } | null, moveGhost: boolean): Muncher {
  if (state.dead || state.won) return state
  let { px, py, score, lives } = state
  const dots = state.dots.slice()
  if (dir && open(px + dir.x, py + dir.y)) {
    px += dir.x
    py += dir.y
    const at = index(px, py)
    if (dots[at]) {
      dots[at] = false
      score += 1
    }
  }
  const ghost = moveGhost ? chase({ ...state, px, py }) : { x: state.gx, y: state.gy }
  const won = dots.every((dot) => !dot)
  const crossed =
    (px === state.gx && py === state.gy) ||
    (px === ghost.x && py === ghost.y) ||
    (px === state.gx && py === state.gy && ghost.x === state.px && ghost.y === state.py)
  if (crossed) {
    lives -= 1
    if (lives <= 0) return { ...state, dots, px, py, gx: ghost.x, gy: ghost.y, score, lives, dead: true }
    return { ...state, dots, px: 1, py: 1, gx: 13, gy: 9, score, lives }
  }
  return { ...state, dots, px, py, gx: ghost.x, gy: ghost.y, score, lives, won }
}
