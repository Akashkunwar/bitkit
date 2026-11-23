export const LIFE_YEARS = 90
export const WEEKS_PER_YEAR = 52

export function weeksLived(birth: Date, now: Date): number {
  const ms = now.getTime() - birth.getTime()
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return Math.min(LIFE_YEARS * WEEKS_PER_YEAR, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)))
}

export function lifeGrid(lived: number): { year: number; week: number; lived: boolean }[] {
  const cells: { year: number; week: number; lived: boolean }[] = []
  for (let year = 0; year < LIFE_YEARS; year += 1) {
    for (let week = 0; week < WEEKS_PER_YEAR; week += 1) {
      cells.push({ year, week, lived: year * WEEKS_PER_YEAR + week < lived })
    }
  }
  return cells
}
