const TZ_FALLBACK = 'UTC'

export const COMMON_ZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const

export type Instant = {
  date: Date
  unixSec: number
  unixMs: number
  iso: string
}

export function parseInstant(input: string, now = new Date()): Instant | null {
  const trimmed = input.trim()
  if (!trimmed) return fromDate(now)
  if (/^\d{10}$/.test(trimmed)) return fromDate(new Date(Number(trimmed) * 1000))
  if (/^\d{13}$/.test(trimmed)) return fromDate(new Date(Number(trimmed)))
  if (/^\d{9,12}$/.test(trimmed)) return fromDate(new Date(Number(trimmed) * 1000))
  const ms = Date.parse(trimmed)
  if (!Number.isNaN(ms)) return fromDate(new Date(ms))
  return null
}

export function fromDate(date: Date): Instant {
  return {
    date,
    unixSec: Math.floor(date.getTime() / 1000),
    unixMs: date.getTime(),
    iso: date.toISOString(),
  }
}

export function formatInZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || TZ_FALLBACK,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    }).format(date)
  } catch {
    return formatInZone(date, TZ_FALLBACK)
  }
}

export function zoneOffset(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
    }).formatToParts(date)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  } catch {
    return timeZone
  }
}
