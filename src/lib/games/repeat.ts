export type Repeat = { sequence: number[]; pos: number; failed: boolean; seed: number }

export function freshRepeat(rand: () => number): Repeat {
  return { sequence: [Math.floor(rand() * 4)], pos: 0, failed: false, seed: 1 }
}

export function pressRepeat(state: Repeat, color: number, rand: () => number): Repeat {
  if (state.failed) return state
  if (state.sequence[state.pos] !== color) return { ...state, failed: true }
  if (state.pos + 1 < state.sequence.length) return { ...state, pos: state.pos + 1 }
  return { sequence: state.sequence.concat(Math.floor(rand() * 4)), pos: 0, failed: false, seed: state.seed }
}
