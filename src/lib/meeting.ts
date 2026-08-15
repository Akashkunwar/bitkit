import { COMMON_ZONES } from './time'

export type WorkWindow = { start: number; end: number }

export const DEFAULT_WINDOW: WorkWindow = { start: 9, end: 18 }

export { COMMON_ZONES }

/** Offset in minutes from UTC for a zone at a given instant. */
export function offsetMinutes(date: Date, timeZone: string): number {
  // Formatting the same instant as if it were UTC in the target zone and
  // differencing gives the offset, DST included, with no tz database.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  )
  return Math.round((asUtc - date.getTime()) / 60_000)
}

export type ZoneHour = {
  /** Local hour in that zone, 0–23. */
  hour: number
  /** Day shift relative to the reference zone: -1, 0, or +1. */
  dayShift: number
  withinHours: boolean
}

export type ZoneRow = {
  zone: string
  label: string
  offsetLabel: string
  hours: ZoneHour[]
}

export function zoneLabel(zone: string): string {
  return zone.split('/').pop()?.replaceAll('_', ' ') ?? zone
}

function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

/**
 * Builds a 24-column grid: one row per zone, each column an hour of the
 * reference zone's day, showing that moment's local hour elsewhere.
 */
export function buildGrid(
  zones: string[],
  reference: string,
  day: Date,
  window: WorkWindow = DEFAULT_WINDOW,
): ZoneRow[] {
  // Anchor to midnight in the reference zone on the chosen day.
  const refOffset = offsetMinutes(day, reference)
  const midnightUtc = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0) - refOffset * 60_000

  return zones.map((zone) => {
    const zoneOffsetAt = offsetMinutes(new Date(midnightUtc), zone)
    const hours: ZoneHour[] = []
    for (let i = 0; i < 24; i += 1) {
      const instant = new Date(midnightUtc + i * 3_600_000)
      const local = new Date(instant.getTime() + offsetMinutes(instant, zone) * 60_000)
      const refLocal = new Date(instant.getTime() + offsetMinutes(instant, reference) * 60_000)
      const hour = local.getUTCHours()
      const dayShift = Math.sign(
        Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
          Date.UTC(refLocal.getUTCFullYear(), refLocal.getUTCMonth(), refLocal.getUTCDate()),
      )
      hours.push({ hour, dayShift, withinHours: hour >= window.start && hour < window.end })
    }
    return { zone, label: zoneLabel(zone), offsetLabel: offsetLabel(zoneOffsetAt), hours }
  })
}

export type Overlap = { startHour: number; endHour: number; count: number }

/** Contiguous spans (in reference-zone hours) where every zone is inside work hours. */
export function findOverlaps(rows: ZoneRow[]): Overlap[] {
  if (!rows.length) return []
  const good: boolean[] = []
  for (let i = 0; i < 24; i += 1) good.push(rows.every((row) => row.hours[i].withinHours))

  const spans: Overlap[] = []
  let start = -1
  for (let i = 0; i < 24; i += 1) {
    if (good[i] && start < 0) start = i
    if ((!good[i] || i === 23) && start >= 0) {
      const end = good[i] && i === 23 ? 24 : i
      spans.push({ startHour: start, endHour: end, count: end - start })
      start = -1
    }
  }
  return spans.filter((s) => s.count > 0).sort((a, b) => b.count - a.count)
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
