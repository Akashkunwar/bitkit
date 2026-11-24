export const YACHT_CATS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '3k',
  '4k',
  'full',
  'small',
  'large',
  'chance',
  'yacht',
] as const
export type YachtCat = (typeof YACHT_CATS)[number]
export type Yacht = {
  dice: number[]
  held: boolean[]
  rolls: number
  taken: Partial<Record<YachtCat, number>>
  done: boolean
}

export function freshYacht(rand: () => number): Yacht {
  return {
    dice: [0, 1, 2, 3, 4].map(() => 1 + Math.floor(rand() * 6)),
    held: [false, false, false, false, false],
    rolls: 2,
    taken: {},
    done: false,
  }
}

export function rollYacht(state: Yacht, rand: () => number): Yacht {
  if (state.rolls <= 0 || state.done) return state
  return {
    ...state,
    dice: state.dice.map((die, index) => (state.held[index] ? die : 1 + Math.floor(rand() * 6))),
    rolls: state.rolls - 1,
  }
}

function counts(dice: number[]) {
  const tally = [0, 0, 0, 0, 0, 0, 0]
  dice.forEach((die) => {
    tally[die] += 1
  })
  return tally
}

export function yachtScore(dice: number[], cat: YachtCat) {
  const tally = counts(dice)
  const sum = dice.reduce((total, die) => total + die, 0)
  const face = Number(cat)
  if (face >= 1 && face <= 6) return tally[face] * face
  if (cat === '3k') return tally.some((n) => n >= 3) ? sum : 0
  if (cat === '4k') return tally.some((n) => n >= 4) ? sum : 0
  if (cat === 'full') return tally.includes(3) && tally.includes(2) ? 25 : 0
  const straight = (need: number) => {
    let run = 0
    for (let faceNo = 1; faceNo <= 6; faceNo += 1) {
      run = tally[faceNo] ? run + 1 : 0
      if (run >= need) return true
    }
    return false
  }
  if (cat === 'small') return straight(4) ? 30 : 0
  if (cat === 'large') return straight(5) ? 40 : 0
  if (cat === 'chance') return sum
  return tally.some((n) => n === 5) ? 50 : 0
}

export function takeYacht(state: Yacht, cat: YachtCat, rand: () => number): Yacht {
  if (state.done || state.taken[cat] !== undefined) return state
  const taken = { ...state.taken, [cat]: yachtScore(state.dice, cat) }
  const done = YACHT_CATS.every((name) => taken[name] !== undefined)
  return {
    dice: done ? state.dice : [0, 1, 2, 3, 4].map(() => 1 + Math.floor(rand() * 6)),
    held: [false, false, false, false, false],
    rolls: 2,
    taken,
    done,
  }
}

export function yachtTotal(taken: Yacht['taken']) {
  const upper = [1, 2, 3, 4, 5, 6].reduce((total, face) => total + (taken[String(face) as YachtCat] ?? 0), 0)
  const lower = YACHT_CATS.slice(6).reduce((total, cat) => total + (taken[cat] ?? 0), 0)
  return upper + lower + (upper >= 63 ? 35 : 0)
}
