export function freshFifteen(rand: () => number): number[] {
  const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
  let blank = 15
  for (let n = 0; n < 80; n += 1) {
    const row = Math.floor(blank / 4)
    const col = blank % 4
    const options = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ].filter(([r, c]) => r >= 0 && c >= 0 && r < 4 && c < 4)
    const [r, c] = options[Math.floor(rand() * options.length)]
    const next = r * 4 + c
    ;[tiles[blank], tiles[next]] = [tiles[next], tiles[blank]]
    blank = next
  }
  return tiles
}

export function slideFifteen(tiles: number[], index: number): number[] {
  const blank = tiles.indexOf(0)
  const row = Math.floor(index / 4)
  const col = index % 4
  const br = Math.floor(blank / 4)
  const bc = blank % 4
  if (Math.abs(row - br) + Math.abs(col - bc) !== 1) return tiles
  const next = tiles.slice()
  ;[next[blank], next[index]] = [next[index], next[blank]]
  return next
}

export function fifteenSolved(tiles: number[]) {
  return tiles.every((tile, index) => tile === (index === 15 ? 0 : index + 1))
}
