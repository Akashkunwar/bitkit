import { type Formula } from './formula'

export function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) throw new Error('Choose a date.')
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1) {
    throw new Error('That date is not valid.')
  }
  return date
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

/** Calendar days from `start` to `end`, using local dates and ignoring clock time and DST. */
export function calendarDaysBetween(start: Date, end: Date): number {
  const from = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const to = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((to - from) / 86_400_000)
}

export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  return calendarDaysBetween(start, date) + 1
}

/** ISO-8601 week: weeks start on Monday, and week 1 contains the first Thursday. */
export function isoWeek(date: Date): { year: number; week: number } {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { year: utc.getUTCFullYear(), week }
}

export function addCalendar(date: Date, years: number, months: number, days: number): Date {
  const next = new Date(date.getFullYear() + years, date.getMonth(), 1)
  next.setMonth(next.getMonth() + months)
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(date.getDate(), last))
  next.setDate(next.getDate() + days)
  return next
}

export function spanBetween(start: Date, end: Date): { days: number; years: number; months: number; rest: number } {
  const sign = end >= start ? 1 : -1
  const [from, to] = end >= start ? [start, end] : [end, start]
  let years = to.getFullYear() - from.getFullYear()
  let months = to.getMonth() - from.getMonth()
  let rest = to.getDate() - from.getDate()
  if (rest < 0) {
    months -= 1
    const previous = new Date(to.getFullYear(), to.getMonth(), 0).getDate()
    rest += previous
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  const days = calendarDaysBetween(from, to)
  return { days: sign * days, years: sign * years, months: sign * months, rest: sign * rest }
}

function readInt(raw: string | undefined, label: string): number {
  const text = String(raw ?? '').trim()
  if (!/^-?\d+$/.test(text)) throw new Error(`Enter a whole number for ${label}.`)
  return Number(text)
}

export const DATE_FORMULAS: Formula[] = [
  {
    id: 'inspect',
    label: 'Week and day of year',
    hint: 'ISO week number, weekday, and how far the date sits into its year.',
    fields: [{ id: 'date', label: 'Date', date: true, sample: '2026-01-01' }],
    run: (raw) => {
      const date = parseDate(raw.date ?? '')
      const week = isoWeek(date)
      const day = dayOfYear(date)
      const length = isLeapYear(date.getFullYear()) ? 366 : 365
      return [
        { label: 'Weekday', value: formatLongDate(date).split(',')[0] },
        { label: 'ISO week', value: `${week.year}-W${String(week.week).padStart(2, '0')}` },
        { label: 'Day of year', value: `${day} of ${length}` },
        { label: 'Leap year', value: isLeapYear(date.getFullYear()) ? 'Yes' : 'No' },
      ]
    },
  },
  {
    id: 'add',
    label: 'Add or subtract',
    hint: 'Moves a calendar date by years, months, and days. Month ends clamp, so 31 January plus one month is 28 or 29 February.',
    fields: [
      { id: 'date', label: 'Start', date: true, sample: '2026-01-31' },
      { id: 'years', label: 'Years', sample: '0' },
      { id: 'months', label: 'Months', sample: '1' },
      { id: 'days', label: 'Days', sample: '0' },
    ],
    run: (raw) => {
      const next = addCalendar(
        parseDate(raw.date ?? ''),
        readInt(raw.years, 'years'),
        readInt(raw.months, 'months'),
        readInt(raw.days, 'days'),
      )
      return [{ label: 'Result', value: formatLongDate(next) }]
    },
  },
  {
    id: 'between',
    label: 'Between two dates',
    hint: 'Total days, and the same span in calendar years, months, and days.',
    fields: [
      { id: 'from', label: 'From', date: true, sample: '2024-02-29' },
      { id: 'to', label: 'To', date: true, sample: '2026-03-01' },
    ],
    run: (raw) => {
      const span = spanBetween(parseDate(raw.from ?? ''), parseDate(raw.to ?? ''))
      const sign = span.days < 0 ? '−' : ''
      return [
        { label: 'Days', value: String(span.days) },
        {
          label: 'Calendar',
          value: `${sign}${Math.abs(span.years)}y ${Math.abs(span.months)}m ${Math.abs(span.rest)}d`,
        },
      ]
    },
  },
  {
    id: 'leap',
    label: 'Leap year',
    hint: 'A year is a leap year when it is divisible by 4, except century years, which must be divisible by 400.',
    fields: [{ id: 'year', label: 'Year', sample: '2028' }],
    run: (raw) => {
      const year = readInt(raw.year, 'year')
      return [
        { label: 'Leap year', value: isLeapYear(year) ? 'Yes' : 'No' },
        { label: 'Days', value: isLeapYear(year) ? '366' : '365' },
      ]
    },
  },
]
