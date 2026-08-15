export function digitsPhone(input: string): string {
  return input.replaceAll(/[^\d]/g, '')
}

export function whatsappLink(phone: string, text: string): string {
  const num = digitsPhone(phone)
  if (!num) throw new Error('Add a phone number with country code, for example 9198XXXXXXXX.')
  const q = text.trim() ? `?text=${encodeURIComponent(text.trim())}` : ''
  return `https://wa.me/${num}${q}`
}

export type UtmParts = {
  url: string
  source: string
  medium: string
  campaign: string
  term?: string
  content?: string
}

export function utmLink(parts: UtmParts): string {
  const raw = parts.url.trim()
  if (!raw) throw new Error('Add a destination URL.')
  const href = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  const url = new URL(href)
  url.searchParams.set('utm_source', parts.source.trim())
  url.searchParams.set('utm_medium', parts.medium.trim())
  url.searchParams.set('utm_campaign', parts.campaign.trim())
  if (parts.term?.trim()) url.searchParams.set('utm_term', parts.term.trim())
  if (parts.content?.trim()) url.searchParams.set('utm_content', parts.content.trim())
  return url.toString()
}

export type VCard = {
  name: string
  org?: string
  title?: string
  phone?: string
  email?: string
  url?: string
}

/**
 * Escapes a TEXT value per RFC 5545 3.3.11 / RFC 2426 2.4.2.
 * Backslash goes first so the escapes we add below are not re-escaped.
 */
function esc(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/g, '\\n')
}

/** Folds content lines to 75 octets per RFC 5545 3.1, continuing with a leading space. */
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const out: string[] = []
  let start = 0
  let limit = 75
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length)
    // Never split a multi-byte character: back up off continuation bytes.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1
    out.push(new TextDecoder().decode(bytes.subarray(start, end)))
    start = end
    limit = 74 // continuation lines carry a leading space
  }
  return out.join('\r\n ')
}

function serialize(lines: string[]): string {
  return `${lines.filter(Boolean).map(foldLine).join('\r\n')}\r\n`
}

/** Splits a display name into the five vCard N components (family;given;middle;prefix;suffix). */
function nameParts(name: string): string {
  const trimmed = name.trim()
  // "Kumar, Akash" is the family-first convention; without this it reads backwards.
  const comma = trimmed.indexOf(',')
  if (comma > 0) {
    const family = trimmed.slice(0, comma).trim()
    const rest = trimmed.slice(comma + 1).trim().split(/\s+/).filter(Boolean)
    return `${esc(family)};${esc(rest[0] ?? '')};${esc(rest.slice(1).join(' '))};;`
  }
  const words = trimmed.split(/\s+/)
  if (words.length === 1) return `${esc(words[0])};;;;`
  return `${esc(words[words.length - 1])};${esc(words[0])};${esc(words.slice(1, -1).join(' '))};;`
}

export function vcard(card: VCard): string {
  if (!card.name.trim()) throw new Error('A name is required.')
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    // N is mandatory in vCard 3.0; iOS and Android Contacts drop cards without it.
    `N:${nameParts(card.name)}`,
    `FN:${esc(card.name.trim())}`,
    card.org?.trim() ? `ORG:${esc(card.org.trim())}` : '',
    card.title?.trim() ? `TITLE:${esc(card.title.trim())}` : '',
    card.phone?.trim() ? `TEL;TYPE=CELL:${digitsPhone(card.phone)}` : '',
    card.email?.trim() ? `EMAIL;TYPE=INTERNET:${esc(card.email.trim())}` : '',
    card.url?.trim() ? `URL:${esc(card.url.trim())}` : '',
    'END:VCARD',
  ]
  return serialize(lines)
}

export type EventCard = {
  title: string
  start: string
  end?: string
  location?: string
  description?: string
}

function icsStamp(input: string): string {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) throw new Error('Use a valid start date and time.')
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function icsEvent(event: EventCard): string {
  if (!event.title.trim()) throw new Error('An event title is required.')
  const dtStart = icsStamp(event.start)
  const dtEnd = event.end ? icsStamp(event.end) : icsStamp(new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BitKit//Local//EN',
    'BEGIN:VEVENT',
    `UID:${dtStart}-${event.title.slice(0, 12).replace(/\W/g, '')}@bitkit.local`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${esc(event.title.trim())}`,
    event.location?.trim() ? `LOCATION:${esc(event.location.trim())}` : '',
    event.description?.trim() ? `DESCRIPTION:${esc(event.description.trim())}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return serialize(lines)
}
