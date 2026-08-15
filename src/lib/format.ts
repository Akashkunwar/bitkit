export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function parseByteLimit(input: string): number | undefined {
  const trimmed = input.trim().toLowerCase().replace(/\s+/g, '')
  if (!trimmed) return undefined
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/)
  if (!match) return undefined
  const value = Number(match[1])
  const unit = match[2] ?? 'b'
  const factor =
    unit === 'gb' ? 1024 ** 3 : unit === 'mb' ? 1024 ** 2 : unit === 'kb' ? 1024 : 1
  return Math.round(value * factor)
}

export function stamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export function applyFilenamePattern(
  pattern: string,
  extras: { original?: string; ext: string; index?: number },
): string {
  const original = extras.original?.replace(/\.[^.]+$/, '') || 'image'
  const raw = pattern
    .replaceAll('{date}', stamp())
    .replaceAll('{original}', original)
    .replaceAll('{n}', String(extras.index ?? 1))
  const base = raw.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'image'
  const ext = extras.ext.replace(/^\./, '')
  return `${base}.${ext}`
}

export function mimeToExt(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('png')) return 'png'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('icon') || mime.includes('ico')) return 'ico'
  if (mime.includes('zip')) return 'zip'
  if (mime.includes('json')) return 'json'
  if (mime.includes('svg')) return 'svg'
  return 'img'
}
