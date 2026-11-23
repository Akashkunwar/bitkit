export type DownloadNameRequest = {
  suggested: string
  resolve: (value: string | null) => void
}

const ILLEGAL = new Set(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])
const KNOWN_EXT = new Set(['pdf', 'docx', 'doc', 'md', 'txt', 'zip', 'rtf', 'html'])

function replaceIllegal(value: string, replacement: string): string {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    out += code <= 0x1f || ILLEGAL.has(char) ? replacement : char
  }
  return out
}

let listener: ((request: DownloadNameRequest | null) => void) | null = null
let current: DownloadNameRequest | null = null

/** Keeps the real file type and drops characters browsers reject in a download name. */
export function resolveDownloadName(input: string, suggested: string): string {
  const ext = suggested.match(/(\.[A-Za-z0-9]{1,8})$/)?.[1] ?? ''
  const fallback = replaceIllegal(suggested, '').trim() || `document${ext}`
  let name = replaceIllegal(input, ' ').replace(/\s+/g, ' ').replace(/\s+\./g, '.').trim().replace(/^\.+/, '')
  if (!name) return fallback
  if (!ext) return name
  if (name.toLowerCase().endsWith(ext.toLowerCase())) return name
  const extra = name.match(/\.([A-Za-z0-9]{1,8})$/)
  if (extra && KNOWN_EXT.has(extra[1].toLowerCase())) name = name.slice(0, -extra[0].length).trim()
  if (!name) return fallback
  return `${name}${ext}`
}

export function bindDownloadNamePrompt(fn: (request: DownloadNameRequest | null) => void): () => void {
  listener = fn
  if (current) fn(current)
  return () => {
    if (listener === fn) listener = null
  }
}

/**
 * Asks for a download name. Resolves to the cleaned name, or null if cancelled.
 * Without a mounted prompt, the suggested name is used so downloads still work.
 */
export function askDownloadName(suggested: string): Promise<string | null> {
  if (!listener) return Promise.resolve(resolveDownloadName(suggested, suggested))
  current?.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    const request: DownloadNameRequest = {
      suggested,
      resolve: (raw) => {
        if (settled) return
        settled = true
        if (current === request) {
          current = null
          listener?.(null)
        }
        resolve(raw == null ? null : resolveDownloadName(raw, suggested))
      },
    }
    current = request
    listener?.(request)
  })
}
