/**
 * Where labels sit on a printed page. Coordinates are PDF points with the
 * origin at the bottom-left, which is what pdf-lib draws with.
 */

export type PageSize = 'a4' | 'letter'

export const LABEL_PAGE: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
}

export type LabelCell = { x: number; y: number; width: number; height: number }

export function labelGrid(options: {
  page: PageSize
  cols: number
  rows: number
  margin?: number
  gap?: number
}): LabelCell[] {
  const cols = Math.max(1, Math.round(options.cols))
  const rows = Math.max(1, Math.round(options.rows))
  const margin = options.margin ?? 36
  const gap = options.gap ?? 12
  const { width, height } = LABEL_PAGE[options.page]
  const cellW = (width - margin * 2 - gap * (cols - 1)) / cols
  const cellH = (height - margin * 2 - gap * (rows - 1)) / rows
  if (cellW < 24 || cellH < 24) throw new Error('That many labels do not fit. Use fewer columns or rows.')
  const cells: LabelCell[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({
        x: margin + col * (cellW + gap),
        y: height - margin - (row + 1) * cellH - row * gap,
        width: cellW,
        height: cellH,
      })
    }
  }
  return cells
}
