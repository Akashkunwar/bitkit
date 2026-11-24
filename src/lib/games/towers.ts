export type Towers = { pegs: number[][]; selected: number }

export function freshTowers(disks = 5): Towers {
  return { pegs: [Array.from({ length: disks }, (_, index) => disks - index), [], []], selected: -1 }
}

export function moveTower(state: Towers, peg: number): Towers {
  if (state.selected < 0) {
    if (!state.pegs[peg].length) return state
    return { ...state, selected: peg }
  }
  if (state.selected === peg) return { ...state, selected: -1 }
  const from = state.pegs[state.selected]
  const disk = from[from.length - 1]
  const onto = state.pegs[peg]
  if (onto.length && onto[onto.length - 1] < disk) return { ...state, selected: -1 }
  const pegs = state.pegs.map((pile) => pile.slice())
  pegs[peg].push(pegs[state.selected].pop() as number)
  return { pegs, selected: -1 }
}

export function towersWon(state: Towers) {
  return state.pegs[2].length === 5 && state.pegs[0].length === 0 && state.pegs[1].length === 0
}
