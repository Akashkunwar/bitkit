import { mulberry32 } from './random'

export type Ships = {
  you: number[]
  them: number[]
  yourShots: number[]
  theirShots: number[]
  turn: 'you' | 'them'
  over: 0 | 1 | 2
}

function place(rand: () => number, lengths: number[]) {
  const cells = Array(64).fill(0)
  lengths.forEach((len) => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const horiz = rand() < 0.5
      const row = Math.floor(rand() * (horiz ? 8 : 8 - len + 1))
      const col = Math.floor(rand() * (horiz ? 8 - len + 1 : 8))
      const spots: number[] = []
      let ok = true
      for (let i = 0; i < len; i += 1) {
        const r = row + (horiz ? 0 : i)
        const c = col + (horiz ? i : 0)
        const at = r * 8 + c
        if (cells[at]) ok = false
        spots.push(at)
      }
      if (ok) {
        spots.forEach((spot) => {
          cells[spot] = len
        })
        return
      }
    }
  })
  return cells
}

export function freshShips(seed = 1): Ships {
  const rand = mulberry32(seed)
  return {
    you: place(rand, [4, 3, 3, 2, 2]),
    them: place(rand, [4, 3, 3, 2, 2]),
    yourShots: Array(64).fill(0),
    theirShots: Array(64).fill(0),
    turn: 'you',
    over: 0,
  }
}

function sunk(fleet: number[], shots: number[]) {
  return fleet.every((cell, index) => cell === 0 || shots[index] === 2)
}

export function shootThem(state: Ships, index: number): Ships {
  if (state.over || state.turn !== 'you' || state.yourShots[index]) return state
  const yourShots = state.yourShots.slice()
  yourShots[index] = state.them[index] ? 2 : 1
  if (sunk(state.them, yourShots)) return { ...state, yourShots, over: 1 }
  return cpuShoot({ ...state, yourShots, turn: 'them' })
}

function cpuShoot(state: Ships): Ships {
  const open = state.theirShots.map((shot, index) => (shot ? -1 : index)).filter((index) => index >= 0)
  const hits = open.filter((index) => {
    const row = Math.floor(index / 8)
    const col = index % 8
    return [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ].some(
      ([r, c]) => r >= 0 && c >= 0 && r < 8 && c < 8 && state.theirShots[r * 8 + c] === 2 && state.you[r * 8 + c] > 0,
    )
  })
  const index = (hits[0] ?? open[0]) as number
  const theirShots = state.theirShots.slice()
  theirShots[index] = state.you[index] ? 2 : 1
  return { ...state, theirShots, turn: 'you', over: sunk(state.you, theirShots) ? 2 : 0 }
}
