export type DateParts = { years: number; months: number; days: number }

export type DateSpan = {
  /** Calendar-aware breakdown, the way people say an age out loud. */
  parts: DateParts
  totalDays: number
  totalWeeks: number
  totalMonths: number
  totalHours: number
  totalMinutes: number
  weekdays: number
  weekendDays: number
}

/** Midnight local time, so day arithmetic never trips over DST or a stray clock. */
export function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseDate(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  // Rejects impossible dates like 2026-02-31, which Date would roll forward.
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null
}

export function toInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Years/months/days between two dates, borrowing from the *previous* month the
 * way a person counts. "1 Jan to 1 Mar" is two months, not 59 days rounded.
 */
/** Adds whole months, clamping the day so 31 Jan + 1 month is 28 Feb, not 3 Mar. */
export function addMonthsClamped(date: Date, months: number): Date {
  const anchor = new Date(date.getFullYear(), date.getMonth() + months, 1)
  anchor.setDate(Math.min(date.getDate(), daysInMonth(anchor.getFullYear(), anchor.getMonth())))
  return anchor
}

export function breakdown(from: Date, to: Date): DateParts {
  let start = atMidnight(from)
  let end = atMidnight(to)
  if (start > end) [start, end] = [end, start]

  // Count whole months by advancing the start date rather than subtracting
  // day-of-month fields: a single "borrow" from the previous month is not
  // always enough (31 Jan to 1 Mar borrows 28 and is still short).
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (addMonthsClamped(start, months) > end) months -= 1

  const anchor = addMonthsClamped(start, months)
  const days = Math.round((end.getTime() - anchor.getTime()) / 86_400_000)

  return { years: Math.floor(months / 12), months: months % 12, days }
}

export function countWeekdays(from: Date, to: Date): { weekdays: number; weekendDays: number } {
  let start = atMidnight(from)
  let end = atMidnight(to)
  if (start > end) [start, end] = [end, start]
  let weekdays = 0
  let weekendDays = 0
  const cursor = new Date(start)
  while (cursor < end) {
    const day = cursor.getDay()
    if (day === 0 || day === 6) weekendDays += 1
    else weekdays += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return { weekdays, weekendDays }
}

export function span(from: Date, to: Date): DateSpan {
  const start = atMidnight(from)
  const end = atMidnight(to)
  const ms = Math.abs(end.getTime() - start.getTime())
  const totalDays = Math.round(ms / 86_400_000)
  const parts = breakdown(start, end)
  const { weekdays, weekendDays } = countWeekdays(start, end)
  return {
    parts,
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    totalMonths: parts.years * 12 + parts.months,
    totalHours: totalDays * 24,
    totalMinutes: totalDays * 24 * 60,
    weekdays,
    weekendDays,
  }
}

/** The next time this month/day comes around, and how far off it is. */
export function nextAnniversary(birth: Date, from = new Date()): { date: Date; daysAway: number; turning: number } {
  const today = atMidnight(from)
  const month = birth.getMonth()
  const day = birth.getDate()
  let next = new Date(today.getFullYear(), month, day)
  // 29 February in a common year rolls to 1 March; land it on the 28th instead.
  if (next.getMonth() !== month) next = new Date(today.getFullYear(), month, day - 1)
  if (next < today) {
    next = new Date(today.getFullYear() + 1, month, day)
    if (next.getMonth() !== month) next = new Date(today.getFullYear() + 1, month, day - 1)
  }
  const daysAway = Math.round((next.getTime() - today.getTime()) / 86_400_000)
  return { date: next, daysAway, turning: next.getFullYear() - birth.getFullYear() }
}

// --- working-day maths ---

export type WorkWeek = boolean[]

/** Monday–Friday, indexed by Date#getDay so Sunday is 0. */
export const MON_TO_FRI: WorkWeek = [false, true, true, true, true, true, false]

export function isWorkingDay(date: Date, week: WorkWeek, holidays: Set<string>): boolean {
  if (!week[date.getDay()]) return false
  return !holidays.has(toInput(date))
}

export function parseHolidays(input: string): Set<string> {
  const out = new Set<string>()
  for (const line of input.split(/[\n,]/)) {
    const value = line.trim()
    if (!value) continue
    const date = parseDate(value)
    if (date) out.add(toInput(date))
  }
  return out
}

/**
 * Adds (or subtracts) working days. Day zero is the start date itself, so
 * "2 working days from Friday" lands on Tuesday, matching how deadlines are quoted.
 */
export function addWorkingDays(
  start: Date,
  count: number,
  week: WorkWeek = MON_TO_FRI,
  holidays: Set<string> = new Set(),
): Date {
  const cursor = atMidnight(start)
  if (count === 0) return cursor
  const step = count > 0 ? 1 : -1
  let remaining = Math.abs(count)
  // A week with no working days at all would loop forever.
  if (!week.some(Boolean)) return cursor
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + step)
    if (isWorkingDay(cursor, week, holidays)) remaining -= 1
  }
  return cursor
}

export function countWorkingDays(
  from: Date,
  to: Date,
  week: WorkWeek = MON_TO_FRI,
  holidays: Set<string> = new Set(),
): { working: number; off: number; holidaysHit: number } {
  let start = atMidnight(from)
  let end = atMidnight(to)
  if (start > end) [start, end] = [end, start]
  let working = 0
  let off = 0
  let holidaysHit = 0
  const cursor = new Date(start)
  // Inclusive of both ends, which is how "how many working days do I have" reads.
  while (cursor <= end) {
    if (week[cursor.getDay()] && holidays.has(toInput(cursor))) holidaysHit += 1
    if (isWorkingDay(cursor, week, holidays)) working += 1
    else off += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return { working, off, holidaysHit }
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatLong(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
