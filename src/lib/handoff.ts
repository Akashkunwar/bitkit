export type HandoffKind = 'image' | 'pdf' | 'text'

export type HandoffPayload = {
  files?: File[]
  text?: string
  from?: string
}

const KEY = 'bitkit-handoff-meta'
let memory: HandoffPayload | null = null

export function fileKind(file: File): HandoffKind | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  if (
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    /\.(md|txt|json|csv)$/i.test(file.name)
  ) {
    return 'text'
  }
  return null
}

export function setHandoff(payload: HandoffPayload): void {
  memory = payload
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ from: payload.from, text: payload.text, fileCount: payload.files?.length ?? 0 }),
    )
  } catch {
    /* private mode */
  }
}

export function takeHandoff(): HandoffPayload | null {
  const payload = memory
  memory = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  return payload
}

export function filesFromBlobs(items: { blob: Blob; name: string }[]): File[] {
  return items.map(
    (item) => new File([item.blob], item.name, { type: item.blob.type || 'application/octet-stream' }),
  )
}

export function suggestPath(files: File[], text?: string): string {
  if (!files.length && text) {
    const trimmed = text.trim()
    if (trimmed.split('.').length === 3 && trimmed.length > 40 && !trimmed.includes(' ')) return '/encode'
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return '/json'
    return '/markdown'
  }
  const kinds = files.map(fileKind)
  const images = kinds.length > 0 && kinds.every((k) => k === 'image')
  const pdfs = kinds.length > 0 && kinds.every((k) => k === 'pdf')
  const texts = kinds.length > 0 && kinds.every((k) => k === 'text')
  if (images) {
    if (files.every((f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'))) return '/svg'
    return '/compress'
  }
  if (pdfs) return files.length > 1 ? '/pages' : '/pdf'
  if (texts) {
    const first = files[0]
    if (first && (first.type.includes('json') || first.name.endsWith('.json'))) return '/json'
    if (first && (first.type.includes('csv') || first.name.endsWith('.csv'))) return '/text'
    return '/markdown'
  }
  if (kinds.some((k) => k === 'image') && kinds.some((k) => k === 'pdf')) return '/image-pdf'
  return '/share'
}

export const SEND_TARGETS: { id: string; path: string; title: string; accepts: HandoffKind[] }[] = [
  { id: 'clipboard', path: '/clipboard', title: 'Clipboard download', accepts: ['image'] },
  { id: 'compress', path: '/compress', title: 'Resize & compress', accepts: ['image'] },
  { id: 'finish', path: '/finish', title: 'Image finishing', accepts: ['image'] },
  { id: 'exif', path: '/exif', title: 'Image metadata', accepts: ['image'] },
  { id: 'favicon', path: '/favicon', title: 'Favicon set', accepts: ['image'] },
  { id: 'passport', path: '/passport', title: 'Passport sheet', accepts: ['image'] },
  { id: 'contrast', path: '/contrast', title: 'Contrast checker', accepts: ['image'] },
  { id: 'picker', path: '/picker', title: 'Color picker', accepts: ['image'] },
  { id: 'cutout', path: '/cutout', title: 'Background cutout', accepts: ['image'] },
  { id: 'svg', path: '/svg', title: 'SVG convert', accepts: ['image'] },
  { id: 'ocr', path: '/ocr', title: 'OCR', accepts: ['image'] },
  { id: 'qr', path: '/qr', title: 'QR code', accepts: ['image', 'text'] },
  { id: 'image-pdf', path: '/image-pdf', title: 'Image ↔ PDF', accepts: ['image', 'pdf'] },
  { id: 'pdf', path: '/pdf', title: 'PDF editor', accepts: ['pdf'] },
  { id: 'pages', path: '/pages', title: 'PDF merge & split', accepts: ['pdf'] },
  { id: 'forms', path: '/forms', title: 'PDF form fill', accepts: ['pdf'] },
  { id: 'shrink', path: '/shrink', title: 'PDF shrink', accepts: ['pdf'] },
  { id: 'table', path: '/table', title: 'Data table', accepts: ['text'] },
  { id: 'chart', path: '/chart', title: 'Chart maker', accepts: ['text'] },
  { id: 'config', path: '/config', title: 'JSON / YAML / TOML', accepts: ['text'] },
  { id: 'diagram', path: '/diagram', title: 'Diagram', accepts: ['text'] },
  { id: 'mdtable', path: '/mdtable', title: 'Markdown table', accepts: ['text'] },
  { id: 'cron', path: '/cron', title: 'Cron builder', accepts: ['text'] },
  { id: 'base', path: '/base', title: 'Number base', accepts: ['text'] },
  { id: 'vision', path: '/vision', title: 'Colour vision', accepts: ['image'] },
  { id: 'markdown', path: '/markdown', title: 'Markdown to PDF', accepts: ['text'] },
  { id: 'notes', path: '/notes', title: 'Local notes', accepts: ['text'] },
  { id: 'json', path: '/json', title: 'JSON formatter', accepts: ['text'] },
  { id: 'diff', path: '/diff', title: 'Text diff', accepts: ['text'] },
  { id: 'encode', path: '/encode', title: 'Encode', accepts: ['text'] },
  { id: 'text', path: '/text', title: 'Text bench', accepts: ['text'] },
  { id: 'regex', path: '/regex', title: 'Regex tester', accepts: ['text'] },
  { id: 'convert', path: '/convert', title: 'Convert', accepts: ['text'] },
  { id: 'links', path: '/links', title: 'Links & cards', accepts: ['text'] },
]
