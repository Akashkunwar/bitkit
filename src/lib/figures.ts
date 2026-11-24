export const GRADE_POINTS: Record<string, number> = {
  A: 4,
  'A-': 3.7,
  'B+': 3.3,
  B: 3,
  'B-': 2.7,
  'C+': 2.3,
  C: 2,
  'C-': 1.7,
  D: 1,
  F: 0,
}

export function gpa(rows: { credits: number; grade: string }[]): number {
  let points = 0
  let credits = 0
  for (const row of rows) {
    if (!(row.grade in GRADE_POINTS)) throw new Error(`Unknown grade ${row.grade}.`)
    if (!(row.credits > 0)) throw new Error('Credits must be above zero.')
    points += GRADE_POINTS[row.grade] * row.credits
    credits += row.credits
  }
  if (!credits) throw new Error('Add at least one course.')
  return Math.round((points / credits) * 100) / 100
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a
}

const KNOWN: [number, number][] = [
  [16, 9],
  [9, 16],
  [4, 3],
  [3, 2],
  [1, 1],
  [21, 9],
  [5, 4],
]

export function reduceRatio(width: number, height: number): { width: number; height: number; label: string } {
  if (!(width > 0) || !(height > 0)) throw new Error('Width and height must be above zero.')
  const w = Math.round(width)
  const h = Math.round(height)
  const divisor = gcd(w, h) || 1
  const decimal = w / h
  const near = KNOWN.find(([a, b]) => Math.abs(a / b - decimal) < 0.02)
  return {
    width: w / divisor,
    height: h / divisor,
    label: near ? `${near[0]}:${near[1]}` : `${w / divisor}:${h / divisor}`,
  }
}
