export type SheetKind = '4x6' | 'a4'

export type SheetLayout = {
  pageW: number
  pageH: number
  photo: number
  cells: { x: number; y: number; w: number; h: number }[]
}

export const PASSPORT_PX = 600

const SPECS: Record<SheetKind, { pageW: number; pageH: number; cols: number; rows: number; gap: number; margin: number }> = {
  '4x6': { pageW: 1200, pageH: 1800, cols: 2, rows: 3, gap: 0, margin: 0 },
  a4: { pageW: 2480, pageH: 3508, cols: 3, rows: 4, gap: 40, margin: 80 },
}

export function passportLayout(kind: SheetKind, copies?: number): SheetLayout {
  const spec = SPECS[kind]
  const max = spec.cols * spec.rows
  const count = Math.min(copies ?? max, max)
  const photo = PASSPORT_PX
  const innerW = spec.pageW - spec.margin * 2
  const innerH = spec.pageH - spec.margin * 2
  const cellW = spec.cols === 1 ? photo : (innerW - spec.gap * (spec.cols - 1)) / spec.cols
  const cellH = spec.rows === 1 ? photo : (innerH - spec.gap * (spec.rows - 1)) / spec.rows
  const cells: SheetLayout['cells'] = []
  for (let i = 0; i < count; i += 1) {
    const col = i % spec.cols
    const row = Math.floor(i / spec.cols)
    const cx = spec.margin + col * (cellW + spec.gap) + (cellW - photo) / 2
    const cy = spec.margin + row * (cellH + spec.gap) + (cellH - photo) / 2
    cells.push({ x: cx, y: cy, w: photo, h: photo })
  }
  return { pageW: spec.pageW, pageH: spec.pageH, photo, cells }
}
