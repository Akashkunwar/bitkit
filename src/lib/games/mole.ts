export type Mole = { up: number; age: number; score: number; misses: number; dead: boolean; tick: number }

export function freshMole(): Mole {
  return { up: 0, age: 0, score: 0, misses: 0, dead: false, tick: 0 }
}

export function stepMole(state: Mole): Mole {
  if (state.dead) return state
  const tick = state.tick + 1
  const age = state.age + 1
  if (age < 42) return { ...state, age, tick }
  const misses = state.misses + (state.up >= 0 ? 1 : 0)
  return { up: tick % 9, age: 0, score: state.score, misses, dead: misses >= 5, tick }
}

export function whack(state: Mole, hole: number): Mole {
  if (state.dead || state.up < 0) return state
  if (hole !== state.up) return { ...state, misses: state.misses + 1, dead: state.misses + 1 >= 5 }
  return { ...state, up: -1, age: 30, score: state.score + 1 }
}
