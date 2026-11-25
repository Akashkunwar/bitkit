export type Master = { secret: number[]; guesses: { pegs: number[]; exact: number; color: number }[]; solved: boolean }

export function feedback(secret: number[], guess: number[]) {
  const left = secret.slice()
  const pegs = guess.slice()
  let exact = 0
  for (let i = 0; i < 4; i += 1) {
    if (pegs[i] === left[i]) {
      exact += 1
      left[i] = -1
      pegs[i] = -2
    }
  }
  let color = 0
  pegs.forEach((peg) => {
    const at = left.indexOf(peg)
    if (peg >= 0 && at >= 0) {
      color += 1
      left[at] = -1
    }
  })
  return { exact, color }
}

export function freshMaster(rand: () => number): Master {
  return { secret: [0, 1, 2, 3].map(() => Math.floor(rand() * 6)), guesses: [], solved: false }
}

export function guessMaster(state: Master, pegs: number[]): Master {
  if (state.solved || state.guesses.length >= 8 || pegs.length !== 4) return state
  const last = state.guesses[state.guesses.length - 1]
  if (last && last.pegs.every((peg, index) => peg === pegs[index])) return state
  const mark = feedback(state.secret, pegs)
  return { ...state, guesses: state.guesses.concat({ pegs, ...mark }), solved: mark.exact === 4 }
}
