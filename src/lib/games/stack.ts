export type StackGame = {
  blocks: { x: number; w: number }[]
  x: number
  dir: number
  w: number
  score: number
  dead: boolean
  speed: number
}

export function freshStack(): StackGame {
  return { blocks: [{ x: 80, w: 140 }], x: 0, dir: 1, w: 140, score: 0, dead: false, speed: 3 }
}

export function stepStack(state: StackGame): StackGame {
  if (state.dead) return state
  let x = state.x + state.dir * state.speed
  let dir = state.dir
  if (x <= 0 || x + state.w >= 320) {
    dir *= -1
    x = Math.max(0, Math.min(320 - state.w, x))
  }
  return { ...state, x, dir }
}

export function dropStack(state: StackGame): StackGame {
  if (state.dead) return state
  const prev = state.blocks[state.blocks.length - 1]
  const left = Math.max(state.x, prev.x)
  const right = Math.min(state.x + state.w, prev.x + prev.w)
  const w = right - left
  if (w < 8) return { ...state, dead: true }
  return {
    ...state,
    blocks: state.blocks.concat({ x: left, w }),
    x: dirStart(left),
    dir: 1,
    w,
    score: state.score + 1,
    speed: Math.min(9, state.speed + 0.25),
  }
}

function dirStart(x: number) {
  return x > 160 ? 0 : 0
}
