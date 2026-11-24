export function freshLights(rand: () => number): boolean[] {
  const board = Array(25).fill(false)
  let next = board
  for (let n = 0; n < 10; n += 1) next = toggleLight(next, Math.floor(rand() * 25))
  return next
}

export function toggleLight(board: boolean[], index: number): boolean[] {
  const next = board.slice()
  const row = Math.floor(index / 5)
  const col = index % 5
  ;[
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].forEach(([dr, dc]) => {
    const r = row + dr
    const c = col + dc
    if (r >= 0 && c >= 0 && r < 5 && c < 5) next[r * 5 + c] = !next[r * 5 + c]
  })
  return next
}

export function lightsOut(board: boolean[]) {
  return board.every((cell) => !cell)
}
