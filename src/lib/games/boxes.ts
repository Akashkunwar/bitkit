export type Boxes = { h: boolean[]; v: boolean[]; owner: number[]; turn: 1 | 2; score: [number, number]; over: boolean }

const H = 5 * 4
const V = 4 * 5

export function freshBoxes(): Boxes {
  return {
    h: Array(H).fill(false),
    v: Array(V).fill(false),
    owner: Array(16).fill(0),
    turn: 1,
    score: [0, 0],
    over: false,
  }
}

function completes(state: Boxes, kind: 'h' | 'v', index: number) {
  const boxes: number[] = []
  if (kind === 'h') {
    const row = Math.floor(index / 4)
    const col = index % 4
    ;[row - 1, row].forEach((r) => {
      if (r < 0 || r > 3) return
      const top = r * 4 + col
      const bottom = (r + 1) * 4 + col
      const left = r * 5 + col
      const right = r * 5 + col + 1
      const h = state.h.slice()
      h[index] = true
      if (h[top] && h[bottom] && state.v[left] && state.v[right]) boxes.push(r * 4 + col)
    })
  } else {
    const row = Math.floor(index / 5)
    const col = index % 5
    ;[col - 1, col].forEach((c) => {
      if (c < 0 || c > 3) return
      const left = row * 5 + c
      const right = row * 5 + c + 1
      const top = row * 4 + c
      const bottom = (row + 1) * 4 + c
      const v = state.v.slice()
      v[index] = true
      if (state.h[top] && state.h[bottom] && v[left] && v[right]) boxes.push(row * 4 + c)
    })
  }
  return boxes
}

export function playBoxes(state: Boxes, kind: 'h' | 'v', index: number): Boxes {
  if (state.over || (kind === 'h' ? state.h[index] : state.v[index])) return state
  const h = state.h.slice()
  const v = state.v.slice()
  if (kind === 'h') h[index] = true
  else v[index] = true
  const owner = state.owner.slice()
  const made = completes({ ...state, h, v }, kind, index)
  const score: [number, number] = [state.score[0], state.score[1]]
  made.forEach((box) => {
    if (!owner[box]) {
      owner[box] = state.turn
      score[state.turn - 1] += 1
    }
  })
  const over = owner.every((cell) => cell !== 0)
  return { h, v, owner, turn: made.length && !over ? state.turn : state.turn === 1 ? 2 : 1, score, over }
}

export function cpuBoxes(state: Boxes): Boxes {
  if (state.over || state.turn !== 2) return state
  const edges: { kind: 'h' | 'v'; index: number; boxes: number }[] = []
  state.h.forEach((taken, index) => {
    if (!taken) edges.push({ kind: 'h', index, boxes: completes(state, 'h', index).length })
  })
  state.v.forEach((taken, index) => {
    if (!taken) edges.push({ kind: 'v', index, boxes: completes(state, 'v', index).length })
  })
  const scoring = edges.find((edge) => edge.boxes > 0)
  const safe = edges.find((edge) => edge.boxes === 0)
  const pick = scoring ?? safe ?? edges[0]
  return pick ? playBoxes(state, pick.kind, pick.index) : state
}
