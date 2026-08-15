const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const CRON_FIELDS = [
  { key: 'minute', label: 'Minute', min: 0, max: 59 },
  { key: 'hour', label: 'Hour', min: 0, max: 23 },
  { key: 'dom', label: 'Day of month', min: 1, max: 31 },
  { key: 'month', label: 'Month', min: 1, max: 12, names: MONTHS },
  { key: 'dow', label: 'Day of week', min: 0, max: 6, names: DAYS },
] as const

export type CronParts = { minute: string; hour: string; dom: string; month: string; dow: string }

export const PRESETS: { label: string; expr: string }[] = [
  { label: 'Every minute', expr: '* * * * *' },
  { label: 'Every 5 minutes', expr: '*/5 * * * *' },
  { label: 'Every hour', expr: '0 * * * *' },
  { label: 'Every day at 09:00', expr: '0 9 * * *' },
  { label: 'Weekdays at 09:00', expr: '0 9 * * 1-5' },
  { label: 'Every Monday 08:30', expr: '30 8 * * 1' },
  { label: 'First of the month', expr: '0 0 1 * *' },
  { label: 'Every Sunday midnight', expr: '0 0 * * 0' },
]

function nameToNumber(token: string, names?: readonly string[]): string {
  if (!names) return token
  const index = names.indexOf(token.toUpperCase())
  return index >= 0 ? String(index + (names === MONTHS ? 1 : 0)) : token
}

/** Expands one cron field into the concrete values it matches. */
export function expandField(
  expr: string,
  field: { min: number; max: number; names?: readonly string[] },
): number[] {
  const values = new Set<number>()
  for (const rawPart of expr.split(',')) {
    const part = rawPart.trim()
    if (!part) throw new Error('Empty value in a field.')
    const [rangePart, stepPart] = part.split('/')
    const step = stepPart ? Number(stepPart) : 1
    if (!Number.isInteger(step) || step < 1) throw new Error(`Step “${stepPart}” must be a positive whole number.`)

    let from: number
    let to: number
    if (rangePart === '*') {
      from = field.min
      to = field.max
    } else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-').map((t) => Number(nameToNumber(t.trim(), field.names)))
      if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error(`Could not read the range “${rangePart}”.`)
      from = a
      to = b
    } else {
      const n = Number(nameToNumber(rangePart, field.names))
      if (!Number.isInteger(n)) throw new Error(`Could not read the value “${rangePart}”.`)
      from = n
      to = stepPart ? field.max : n
    }
    if (from < field.min || to > field.max || from > to) {
      throw new Error(`“${part}” is outside ${field.min}–${field.max}.`)
    }
    for (let v = from; v <= to; v += step) values.add(v)
  }
  return [...values].sort((a, b) => a - b)
}

export function parseCron(expr: string): CronParts {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error('A cron expression has five fields: minute hour day month weekday.')
  const [minute, hour, dom, month, dow] = parts
  return { minute, hour, dom, month, dow }
}

function list(values: number[], names?: readonly string[], pad = false): string {
  const render = (v: number) => {
    if (names) return names[names === MONTHS ? v - 1 : v] ?? String(v)
    return pad ? String(v).padStart(2, '0') : String(v)
  }
  if (values.length === 1) return render(values[0])
  if (values.length === 2) return `${render(values[0])} and ${render(values[1])}`
  return `${values.slice(0, -1).map(render).join(', ')} and ${render(values[values.length - 1])}`
}

function isEvery(values: number[], field: { min: number; max: number }): boolean {
  return values.length === field.max - field.min + 1
}

function stride(values: number[]): number | null {
  if (values.length < 3) return null
  const gap = values[1] - values[0]
  return values.every((v, i) => i === 0 || v - values[i - 1] === gap) ? gap : null
}

/** Plain-English description of a five-field cron expression. */
export function describeCron(expr: string): string {
  const parts = parseCron(expr)
  const minute = expandField(parts.minute, CRON_FIELDS[0])
  const hour = expandField(parts.hour, CRON_FIELDS[1])
  const dom = expandField(parts.dom, CRON_FIELDS[2])
  const month = expandField(parts.month, CRON_FIELDS[3])
  const dow = expandField(parts.dow, CRON_FIELDS[4])

  const everyMinute = isEvery(minute, CRON_FIELDS[0])
  const everyHour = isEvery(hour, CRON_FIELDS[1])

  let time: string
  if (everyMinute && everyHour) time = 'Every minute'
  else if (everyMinute) time = `Every minute during ${list(hour, undefined, true)}:00`
  else {
    const minuteStride = stride(minute)
    const hourStride = stride(hour)
    const minuteText = minuteStride
      ? `every ${minuteStride} minutes`
      : `minute ${list(minute)}`
    if (everyHour) time = `At ${minuteText} past every hour`
    else if (minute.length === 1 && hour.length <= 4) {
      time = `At ${hour.map((h) => `${String(h).padStart(2, '0')}:${String(minute[0]).padStart(2, '0')}`).join(', ')}`
    } else if (hourStride) {
      time = `At ${minuteText}, every ${hourStride} hours`
    } else {
      time = `At ${minuteText}, hour ${list(hour)}`
    }
  }

  const parts2: string[] = []
  if (!isEvery(dow, CRON_FIELDS[4])) parts2.push(`on ${list(dow, DAYS)}`)
  if (!isEvery(dom, CRON_FIELDS[2])) parts2.push(`on day ${list(dom)} of the month`)
  if (!isEvery(month, CRON_FIELDS[3])) parts2.push(`in ${list(month, MONTHS)}`)

  return parts2.length ? `${time} ${parts2.join(', ')}.` : `${time}.`
}

/** Next run times, walking forward minute by minute from `after`. */
export function nextRuns(expr: string, count = 5, after = new Date()): Date[] {
  const parts = parseCron(expr)
  const minute = new Set(expandField(parts.minute, CRON_FIELDS[0]))
  const hour = new Set(expandField(parts.hour, CRON_FIELDS[1]))
  const dom = expandField(parts.dom, CRON_FIELDS[2])
  const month = new Set(expandField(parts.month, CRON_FIELDS[3]))
  const dow = expandField(parts.dow, CRON_FIELDS[4])

  const domRestricted = dom.length !== 31
  const dowRestricted = dow.length !== 7
  const domSet = new Set(dom)
  const dowSet = new Set(dow)

  const out: Date[] = []
  const cursor = new Date(after.getTime())
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  // Two years of minutes is a generous ceiling for any real schedule.
  const limit = 366 * 2 * 24 * 60
  for (let i = 0; i < limit && out.length < count; i += 1) {
    const matchesDay =
      domRestricted && dowRestricted
        ? // Classic cron quirk: when both are restricted, either one matching wins.
          domSet.has(cursor.getDate()) || dowSet.has(cursor.getDay())
        : (!domRestricted || domSet.has(cursor.getDate())) && (!dowRestricted || dowSet.has(cursor.getDay()))

    if (
      minute.has(cursor.getMinutes()) &&
      hour.has(cursor.getHours()) &&
      month.has(cursor.getMonth() + 1) &&
      matchesDay
    ) {
      out.push(new Date(cursor.getTime()))
    }
    cursor.setMinutes(cursor.getMinutes() + 1)
  }
  return out
}
