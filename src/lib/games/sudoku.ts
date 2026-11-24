function ok(grid: number[], index: number, value: number) {
  const row = Math.floor(index / 9)
  const col = index % 9
  for (let k = 0; k < 9; k += 1) {
    if (grid[row * 9 + k] === value || grid[k * 9 + col] === value) return false
  }
  const br = Math.floor(row / 3) * 3
  const bc = Math.floor(col / 3) * 3
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) if (grid[(br + r) * 9 + bc + c] === value) return false
  }
  return true
}

export function freshSudoku(rand: () => number) {
  const grid = Array(81).fill(0)
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  function fill(index: number): boolean {
    if (index === 81) return true
    if (grid[index]) return fill(index + 1)
    const nums = order.slice()
    for (let i = nums.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      ;[nums[i], nums[j]] = [nums[j], nums[i]]
    }
    for (const value of nums) {
      if (!ok(grid, index, value)) continue
      grid[index] = value
      if (fill(index + 1)) return true
      grid[index] = 0
    }
    return false
  }
  ;[0, 3, 6].forEach((box) => {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (let i = 8; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      ;[nums[i], nums[j]] = [nums[j], nums[i]]
    }
    let n = 0
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) grid[(box + r) * 9 + box + c] = nums[n++]
  })
  fill(0)
  const solution = grid.slice()
  const puzzle = solution.slice()
  const holes = solution.map((_, index) => index)
  for (let i = holes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[holes[i], holes[j]] = [holes[j], holes[i]]
  }
  holes.slice(0, 46).forEach((index) => {
    puzzle[index] = 0
  })
  return { puzzle, solution, given: puzzle.map((cell) => cell !== 0) }
}

export function sudokuSolved(grid: number[]) {
  if (grid.some((cell) => cell < 1 || cell > 9)) return false
  return grid.every((cell, index) => {
    const copy = grid.slice()
    copy[index] = 0
    return ok(copy, index, cell)
  })
}
