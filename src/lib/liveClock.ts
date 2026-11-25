import { COMMON_ZONES, zoneLabel } from './meeting'
import { zoneOffset } from './time'

/**
 * A desk clock computed in the browser.
 *
 * The displayed instant is "now" plus a drag offset, formatted in a chosen
 * zone. Nothing is fetched: zones come from Intl, and the offset is only a
 * local shift so someone can glance at a later or earlier hour.
 */

export const CLOCK_FACES = ['digital', 'mono', 'flip', 'analog'] as const
export const CLOCK_THEMES = [
  'ink',
  'paper',
  'amber',
  'phosphor',
  'midnight',
  'sunset',
  'sakura',
  'arctic',
  'vapor',
] as const

export type ClockFace = (typeof CLOCK_FACES)[number]
export type ClockTheme = (typeof CLOCK_THEMES)[number]
export type DragStep = 'minute' | 'quarter' | 'hour'

export const PIXELS_PER_STEP = 8
const STORAGE_KEY = 'bitkit-live-clock'

export const FACE_LABELS: Record<ClockFace, string> = {
  digital: 'Digital',
  mono: 'Mono',
  flip: 'Flip',
  analog: 'Analog',
}

export const THEME_LABELS: Record<ClockTheme, string> = {
  ink: 'Match',
  paper: 'Paper',
  amber: 'Amber',
  phosphor: 'Phosphor',
  midnight: 'Midnight',
  sunset: 'Sunset',
  sakura: 'Sakura',
  arctic: 'Arctic',
  vapor: 'Vapor',
}

export type LivePrefs = {
  face: ClockFace
  theme: ClockTheme
  seconds: boolean
  showDate: boolean
  hour12: boolean
  /** 'auto' follows the device zone. Anything else is an IANA name. */
  zone: string
  awake: boolean
}

export const DEFAULT_PREFS: LivePrefs = {
  face: 'digital',
  theme: 'ink',
  seconds: true,
  showDate: true,
  hour12: false,
  zone: 'auto',
  awake: false,
}

export type ClockParts = {
  hour: number
  minute: number
  second: number
  ms: number
  hourText: string
  minuteText: string
  secondText: string
  ampm: string
  dateLine: string
  offsetLabel: string
  city: string
}

/** Extra words people type that are not in the IANA id. */
const ZONE_ALIASES: Record<string, string> = {
  UTC: 'gmt zulu utc',
  'Asia/Kolkata': 'ist india kolkata calcutta delhi mumbai bangalore chennai',
  'Asia/Calcutta': 'ist india kolkata calcutta delhi mumbai bangalore chennai',
  'Asia/Dubai': 'gst gulf dubai uae',
  'Asia/Singapore': 'sgt singapore',
  'Asia/Tokyo': 'jst tokyo japan',
  'Asia/Shanghai': 'cst beijing shanghai china',
  'Asia/Hong_Kong': 'hkt hong kong',
  'Europe/London': 'gmt bst london uk britain',
  'Europe/Paris': 'cet cest paris france',
  'Europe/Berlin': 'cet cest berlin germany',
  'America/New_York': 'est edt eastern new york nyc',
  'America/Chicago': 'cst cdt central chicago',
  'America/Denver': 'mst mdt mountain denver',
  'America/Los_Angeles': 'pst pdt pacific los angeles la',
  'America/Sao_Paulo': 'brt sao paulo brazil',
  'Australia/Sydney': 'aest aedt sydney',
  'Pacific/Auckland': 'nzst nzdt auckland',
}

export function resolveZone(zone: string): string {
  if (!zone || zone === 'auto') return deviceZone()
  return isZone(zone) ? zone : 'UTC'
}

export function isZone(zone: string): boolean {
  if (!zone || zone === 'auto') return zone === 'auto'
  try {
    Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

export function listZones(): string[] {
  try {
    const zones = Intl.supportedValuesOf('timeZone')
    return zones.length ? zones : [...COMMON_ZONES]
  } catch {
    return [...COMMON_ZONES]
  }
}

export function cityName(zone: string): string {
  if (zone === 'UTC' || zone === 'auto') return zone === 'UTC' ? 'UTC' : 'Auto'
  const city = zoneLabel(zone)
  return city === 'Calcutta' ? 'Kolkata' : city
}

export function filterZones(query: string, zones: string[], limit = 40): string[] {
  const q = query.trim().toLowerCase().replaceAll('_', ' ')
  if (!q) return []
  const ranked: { zone: string; score: number }[] = []
  for (const zone of zones) {
    const city = cityName(zone).toLowerCase()
    const words = `${zone} ${ZONE_ALIASES[zone] ?? ''}`.toLowerCase().replaceAll('_', ' ').replaceAll('/', ' ')
    if (!`${city} ${words}`.includes(q)) continue
    const tokens = words.split(/\s+/)
    let score = 10
    if (city === q) score = 100
    else if (tokens.includes(q)) score = 90
    else if (city.startsWith(q)) score = 80
    else if (city.includes(q)) score = 50
    ranked.push({ zone, score })
  }
  ranked.sort((a, b) => b.score - a.score || cityName(a.zone).localeCompare(cityName(b.zone)))
  return ranked.slice(0, limit).map((row) => row.zone)
}

export function clockParts(date: Date, timeZone: string, hour12: boolean, locale?: string): ClockParts {
  const zone = resolveZone(timeZone)
  const civil = partsOf(date, zone, false)
  const shown = hour12 ? partsOf(date, zone, true, locale) : civil
  const hour = hour24(part(civil, 'hour'))
  const minute = clampUnit(part(civil, 'minute'), 59)
  const second = clampUnit(part(civil, 'second'), 59)
  return {
    hour,
    minute,
    second,
    ms: date.getMilliseconds(),
    hourText: hour12 ? pad2(clampUnit(part(shown, 'hour'), 12) || 12) : pad2(hour),
    minuteText: pad2(minute),
    secondText: pad2(second),
    ampm: hour12 ? (hour < 12 ? 'AM' : 'PM') : '',
    dateLine: new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date),
    offsetLabel: zoneOffset(date, zone),
    city: cityName(zone),
  }
}

/** Degrees clockwise from 12, including the sweep of the finer hands. */
export function handAngles(parts: Pick<ClockParts, 'hour' | 'minute' | 'second' | 'ms'>): {
  hour: number
  minute: number
  second: number
} {
  const second = parts.second + parts.ms / 1000
  const minute = parts.minute + second / 60
  const hour = (parts.hour % 12) + minute / 60
  return { hour: hour * 30, minute: minute * 6, second: second * 6 }
}

/**
 * Horizontal drag. Eight pixels is one step: a minute, fifteen minutes with
 * Shift, or an hour with Option/Alt. Positive x moves the clock forward.
 */
export function dragOffsetMs(originMs: number, deltaX: number, step: DragStep): number {
  const unit = step === 'hour' ? 60 : step === 'quarter' ? 15 : 1
  const notches = Math.round(deltaX / PIXELS_PER_STEP)
  return originMs + notches * unit * 60_000
}

export function formatOffset(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes === 0) return ''
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const rest = abs % 60
  const body = hours && rest ? `${hours}h ${rest}m` : hours ? `${hours}h` : `${rest}m`
  return `${body} ${minutes > 0 ? 'ahead' : 'behind'}`
}

export function sanitizePrefs(value: unknown): Partial<LivePrefs> {
  if (!value || typeof value !== 'object') return {}
  const raw = value as Record<string, unknown>
  const next: Partial<LivePrefs> = {}
  if (isFace(raw.face)) next.face = raw.face
  if (isTheme(raw.theme)) next.theme = raw.theme
  if (typeof raw.seconds === 'boolean') next.seconds = raw.seconds
  if (typeof raw.showDate === 'boolean') next.showDate = raw.showDate
  if (typeof raw.hour12 === 'boolean') next.hour12 = raw.hour12
  if (typeof raw.awake === 'boolean') next.awake = raw.awake
  if (typeof raw.zone === 'string' && (raw.zone === 'auto' || isZone(raw.zone))) next.zone = raw.zone
  return next
}

export function mergePrefs(stored: unknown, params: URLSearchParams): LivePrefs {
  const next: LivePrefs = { ...DEFAULT_PREFS, ...sanitizePrefs(stored) }
  const face = params.get('face')
  const theme = params.get('theme')
  if (isFace(face)) next.face = face
  if (isTheme(theme)) next.theme = theme
  if (params.has('seconds')) next.seconds = params.get('seconds') !== '0'
  if (params.has('date')) next.showDate = params.get('date') !== '0'
  if (params.has('hour')) next.hour12 = params.get('hour') === '12'
  const tz = params.get('tz')
  if (tz && (tz === 'auto' || isZone(tz))) next.zone = tz
  return next
}

/** Only the choices that differ from the default, so a shared link stays short. */
export function prefsToParams(prefs: LivePrefs): URLSearchParams {
  const params = new URLSearchParams()
  if (prefs.face !== DEFAULT_PREFS.face) params.set('face', prefs.face)
  if (prefs.theme !== DEFAULT_PREFS.theme) params.set('theme', prefs.theme)
  if (!prefs.seconds) params.set('seconds', '0')
  if (!prefs.showDate) params.set('date', '0')
  if (prefs.hour12) params.set('hour', '12')
  if (prefs.zone !== 'auto') params.set('tz', prefs.zone)
  return params
}

export function samePrefs(a: LivePrefs, b: LivePrefs): boolean {
  return (
    a.face === b.face &&
    a.theme === b.theme &&
    a.seconds === b.seconds &&
    a.showDate === b.showDate &&
    a.hour12 === b.hour12 &&
    a.zone === b.zone &&
    a.awake === b.awake
  )
}

export function readLivePrefs(): Partial<LivePrefs> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return sanitizePrefs(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function writeLivePrefs(prefs: LivePrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* private mode */
  }
}

function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function isFace(value: unknown): value is ClockFace {
  return typeof value === 'string' && (CLOCK_FACES as readonly string[]).includes(value)
}

function isTheme(value: unknown): value is ClockTheme {
  return typeof value === 'string' && (CLOCK_THEMES as readonly string[]).includes(value)
}

function partsOf(date: Date, timeZone: string, hour12: boolean, locale?: string): Intl.DateTimeFormatPart[] {
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: hour12 ? 'h12' : 'h23',
  }
  if (hour12) options.dayPeriod = 'short'
  return new Intl.DateTimeFormat(locale ?? 'en-US', options).formatToParts(date)
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? ''
}

function hour24(value: string): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return ((n % 24) + 24) % 24
}

function clampUnit(value: string, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(max, Math.max(0, n))
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}
