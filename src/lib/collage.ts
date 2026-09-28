/**
 * Collage layout: where each image goes on the output canvas.
 *
 * Pure geometry so it can be tested; the tool draws with the result.
 * - `row` puts images side by side at one shared height (no cropping).
 * - `column` stacks them at one shared width (no cropping).
 * - `grid` uses equal cells; images fill (crop) or fit (letterbox) a cell.
 */

export type CollageLayout = 'grid' | 'row' | 'column'
export type CellAspect = 'square' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto'
export type CellFit = 'cover' | 'contain'

export type CollageOptions = {
  layout: CollageLayout
  /** Grid columns; 0 picks a near-square grid. */
  columns: number
  aspect: CellAspect
  fit: CellFit
  /** Output width in pixels; height follows from the layout. */
  width: number
  gap: number
  padding: number
}

export type Placement = {
  /** The cell on the canvas. */
  cell: { x: number; y: number; width: number; height: number }
  /** Where the image is drawn — equal to the cell except when fitted. */
  draw: { x: number; y: number; width: number; height: number }
  /** Source crop in pixels (whole image unless covering). */
  crop: { x: number; y: number; width: number; height: number }
}

const ASPECTS: Record<Exclude<CellAspect, 'auto'>, number> = {
  square: 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
}

export function autoColumns(count: number): number {
  return Math.max(1, Math.ceil(Math.sqrt(count)))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function fitInto(
  image: { width: number; height: number },
  cell: Placement['cell'],
  fit: CellFit,
): Pick<Placement, 'draw' | 'crop'> {
  const full = { x: 0, y: 0, width: image.width, height: image.height }
  const imageRatio = image.width / image.height
  const cellRatio = cell.width / cell.height
  if (fit === 'cover') {
    let width = image.width
    let height = image.height
    if (imageRatio > cellRatio) width = image.height * cellRatio
    else height = image.width / cellRatio
    return { draw: cell, crop: { x: (image.width - width) / 2, y: (image.height - height) / 2, width, height } }
  }
  const scale = Math.min(cell.width / image.width, cell.height / image.height)
  const width = image.width * scale
  const height = image.height * scale
  return {
    draw: { x: cell.x + (cell.width - width) / 2, y: cell.y + (cell.height - height) / 2, width, height },
    crop: full,
  }
}

export function layoutCollage(
  images: { width: number; height: number }[],
  opts: CollageOptions,
): { width: number; height: number; placements: Placement[] } {
  const n = images.length
  const width = Math.max(1, Math.round(opts.width))
  if (!n) return { width, height: width, placements: [] }
  const pad = Math.max(0, opts.padding)
  const gap = Math.max(0, opts.gap)
  const inner = Math.max(1, width - pad * 2)

  if (opts.layout === 'row') {
    const ratios = images.map((img) => img.width / img.height)
    const rowHeight = (inner - gap * (n - 1)) / ratios.reduce((a, b) => a + b, 0)
    let x = pad
    const placements = images.map((img, i) => {
      const cell = { x, y: pad, width: rowHeight * ratios[i], height: rowHeight }
      x += cell.width + gap
      return { cell, draw: cell, crop: { x: 0, y: 0, width: img.width, height: img.height } }
    })
    return { width, height: Math.round(rowHeight + pad * 2), placements }
  }

  if (opts.layout === 'column') {
    let y = pad
    const placements = images.map((img) => {
      const cell = { x: pad, y, width: inner, height: (inner * img.height) / img.width }
      y += cell.height + gap
      return { cell, draw: cell, crop: { x: 0, y: 0, width: img.width, height: img.height } }
    })
    return { width, height: Math.round(y - gap + pad), placements }
  }

  const columns = Math.min(n, opts.columns > 0 ? opts.columns : autoColumns(n))
  const rows = Math.ceil(n / columns)
  const cellWidth = (inner - gap * (columns - 1)) / columns
  const aspect = opts.aspect === 'auto' ? median(images.map((img) => img.width / img.height)) : ASPECTS[opts.aspect]
  const cellHeight = cellWidth / aspect
  const placements = images.map((img, i) => {
    const col = i % columns
    const row = Math.floor(i / columns)
    // Centre a short last row instead of leaving a ragged gap on the right.
    const inRow = row === rows - 1 ? n - row * columns : columns
    const offset = ((columns - inRow) * (cellWidth + gap)) / 2
    const cell = {
      x: pad + offset + col * (cellWidth + gap),
      y: pad + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    }
    return { cell, ...fitInto(img, cell, opts.fit) }
  })
  return { width, height: Math.round(pad * 2 + rows * cellHeight + gap * (rows - 1)), placements }
}
