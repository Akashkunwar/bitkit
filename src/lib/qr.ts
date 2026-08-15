export type QrMode = 'text' | 'url' | 'wifi' | 'email' | 'phone' | 'sms'

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
