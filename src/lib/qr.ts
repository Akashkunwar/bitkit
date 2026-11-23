export type QrMode =
  | 'text'
  | 'url'
  | 'wifi'
  | 'email'
  | 'phone'
  | 'sms'
  | 'vcard'
  | 'mecard'
  | 'location'
  | 'event'
  | 'bitcoin'
  | 'facebook'
  | 'twitter'
  | 'youtube'

export type WifiConfig = {
  ssid: string
  password: string
  encryption: 'WPA' | 'WEP' | 'nopass'
  hidden: boolean
}

export type EmailConfig = {
  to: string
  subject: string
  body: string
}

/** Escape special characters per the WIFI: URI de-facto standard. */
function escapeWifi(value: string): string {
  return value.replaceAll(/([\\;,:"])/g, '\\$1')
}

export function wifiPayload(config: WifiConfig): string {
  const parts = [
    `WIFI:T:${config.encryption};`,
    `S:${escapeWifi(config.ssid)};`,
    config.encryption === 'nopass' ? '' : `P:${escapeWifi(config.password)};`,
    config.hidden ? 'H:true;' : '',
    ';',
  ]
  return parts.join('')
}

export function emailPayload(config: EmailConfig): string {
  const params = new URLSearchParams()
  if (config.subject) params.set('subject', config.subject)
  if (config.body) params.set('body', config.body)
  const query = params.toString()
  return `mailto:${config.to}${query ? `?${query}` : ''}`
}

export function phonePayload(number: string): string {
  return `tel:${number.replaceAll(/[^\d+]/g, '')}`
}

export function smsPayload(number: string, message: string): string {
  const cleaned = number.replaceAll(/[^\d+]/g, '')
  return message ? `sms:${cleaned}?body=${encodeURIComponent(message)}` : `sms:${cleaned}`
}

export function urlPayload(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export type ContactFields = {
  first: string
  last: string
  org: string
  title: string
  mobile: string
  work: string
  email: string
  url: string
  street: string
  city: string
  zip: string
  country: string
}

function tidy(value: string): string {
  return value.replace(/\r?\n/g, ' ').trim()
}

function vcardEscape(value: string): string {
  return tidy(value).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function mecardEscape(value: string): string {
  return tidy(value).replace(/\\/g, '\\\\').replace(/[;:,]/g, '\\$&')
}

function contactHasIdentity(contact: ContactFields): boolean {
  return [contact.first, contact.last, contact.org, contact.mobile, contact.work, contact.email].some((part) =>
    tidy(part),
  )
}

export function vcardPayload(contact: ContactFields): string {
  if (!contactHasIdentity(contact)) return ''
  const first = tidy(contact.first)
  const last = tidy(contact.last)
  const org = tidy(contact.org)
  const name = [first, last].filter(Boolean).join(' ') || org
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vcardEscape(last)};${vcardEscape(first)};;;`,
    `FN:${vcardEscape(name)}`,
  ]
  if (org) lines.push(`ORG:${vcardEscape(org)}`)
  if (tidy(contact.title)) lines.push(`TITLE:${vcardEscape(contact.title)}`)
  if (tidy(contact.mobile)) lines.push(`TEL;TYPE=CELL:${vcardEscape(contact.mobile)}`)
  if (tidy(contact.work)) lines.push(`TEL;TYPE=WORK:${vcardEscape(contact.work)}`)
  if (tidy(contact.email)) lines.push(`EMAIL:${vcardEscape(contact.email)}`)
  if (tidy(contact.url)) lines.push(`URL:${vcardEscape(urlPayload(contact.url))}`)
  if ([contact.street, contact.city, contact.zip, contact.country].some((part) => tidy(part))) {
    lines.push(
      `ADR:;;${vcardEscape(contact.street)};${vcardEscape(contact.city)};;${vcardEscape(contact.zip)};${vcardEscape(contact.country)}`,
    )
  }
  lines.push('END:VCARD')
  return lines.join('\n')
}

export function mecardPayload(contact: ContactFields): string {
  if (!contactHasIdentity(contact) && ![contact.url, contact.street, contact.title].some((part) => tidy(part)))
    return ''
  const parts = ['MECARD:']
  if (tidy(contact.last) || tidy(contact.first))
    parts.push(`N:${mecardEscape(contact.last)},${mecardEscape(contact.first)};`)
  const tel = tidy(contact.mobile) || tidy(contact.work)
  if (tel) parts.push(`TEL:${mecardEscape(tel)};`)
  if (tidy(contact.email)) parts.push(`EMAIL:${mecardEscape(contact.email)};`)
  if (tidy(contact.url)) parts.push(`URL:${mecardEscape(urlPayload(contact.url))};`)
  if (tidy(contact.org)) parts.push(`ORG:${mecardEscape(contact.org)};`)
  const address = [contact.street, contact.city, contact.zip, contact.country].map(tidy).filter(Boolean).join(' ')
  if (address) parts.push(`ADR:${mecardEscape(address)};`)
  if (tidy(contact.title)) parts.push(`NOTE:${mecardEscape(contact.title)};`)
  if (parts.length === 1) return ''
  parts.push(';')
  return parts.join('')
}

export function locationPayload(place: { query: string; lat: string; lng: string }): string {
  const lat = place.lat.trim()
  const lng = place.lng.trim()
  if (lat && lng && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return `geo:${lat},${lng}`
  const query = place.query.trim()
  if (!query) return ''
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`
}

function icsStamp(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8) return ''
  const time = digits.slice(8, 12)
  return time ? `${digits.slice(0, 8)}T${time}00` : digits.slice(0, 8)
}

export function eventPayload(event: { title: string; start: string; end: string; location: string }): string {
  const title = tidy(event.title)
  const start = icsStamp(event.start)
  if (!title || !start) return ''
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `SUMMARY:${title}`, `DTSTART:${start}`]
  const end = icsStamp(event.end)
  if (end) lines.push(`DTEND:${end}`)
  if (tidy(event.location)) lines.push(`LOCATION:${tidy(event.location)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\n')
}

export function bitcoinPayload(coin: { address: string; amount: string; label: string }): string {
  const address = coin.address.trim()
  if (!address) return ''
  const params = new URLSearchParams()
  if (coin.amount.trim()) params.set('amount', coin.amount.trim())
  if (coin.label.trim()) params.set('label', coin.label.trim())
  const query = params.toString()
  return `bitcoin:${address}${query ? `?${query}` : ''}`
}

export function socialPayload(kind: 'facebook' | 'twitter' | 'youtube', value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw
  const handle = raw.replace(/^@/, '').replace(/^\/+/, '')
  if (kind === 'facebook') return `https://www.facebook.com/${handle}`
  if (kind === 'twitter') return `https://x.com/${handle}`
  if (handle.startsWith('channel/') || handle.includes('/')) return `https://www.youtube.com/${handle}`
  return `https://www.youtube.com/@${handle}`
}
