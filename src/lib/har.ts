export type HarRow = { url: string; method: string; status: number; timeMs: number }

type Header = { name?: string; value?: string }
type Query = { name?: string; value?: string }
type Entry = {
  request?: { url?: string; method?: string; headers?: Header[]; queryString?: Query[] }
  response?: { status?: number; headers?: Header[] }
  time?: number
}

const SECRET_HEADERS = new Set(['cookie', 'authorization', 'set-cookie'])

function asHar(text: string): { log?: { entries?: Entry[] } } {
  const parsed = JSON.parse(text) as unknown
  if (!parsed || typeof parsed !== 'object') throw new Error('That is not a HAR file.')
  return parsed as { log?: { entries?: Entry[] } }
}

export function parseHar(text: string): HarRow[] {
  const entries = asHar(text).log?.entries ?? []
  return entries.map((entry) => ({
    url: entry.request?.url ?? '',
    method: entry.request?.method ?? '',
    status: entry.response?.status ?? 0,
    timeMs: typeof entry.time === 'number' ? entry.time : 0,
  }))
}

function blankHeader(header: Header) {
  if (SECRET_HEADERS.has(String(header.name ?? '').toLowerCase())) header.value = ''
}

function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url)
    for (const key of [...parsed.searchParams.keys()]) {
      if (/token|key|secret|password/i.test(key)) parsed.searchParams.set(key, '')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

/** Strip cookies, bearer tokens, and password-like query values. The rest of the log stays. */
export function sanitizeHar(text: string): string {
  const har = asHar(text)
  for (const entry of har.log?.entries ?? []) {
    for (const header of entry.request?.headers ?? []) blankHeader(header)
    for (const header of entry.response?.headers ?? []) blankHeader(header)
    for (const query of entry.request?.queryString ?? []) {
      if (/token|key|secret|password/i.test(String(query.name ?? ''))) query.value = ''
    }
    if (entry.request?.url) entry.request.url = scrubUrl(entry.request.url)
  }
  return JSON.stringify(har, null, 2)
}
