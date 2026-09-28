import { tools } from '../registry'

export type HandoffKind = 'image' | 'pdf' | 'text'

export type HandoffPayload = {
  files?: File[]
  text?: string
  from?: string
}

const KEY = 'bitkit-handoff-meta'
let memory: HandoffPayload | null = null
let generation = 0
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeHandoff(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function handoffGeneration(): number {
  return generation
}

export function fileKind(file: File): HandoffKind | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  if (file.type.startsWith('text/') || file.type === 'application/json' || /\.(md|txt|json|csv)$/i.test(file.name)) {
    return 'text'
  }
  return null
}

function persistMeta(payload: HandoffPayload | null): void {
  try {
    if (!payload) {
      sessionStorage.removeItem(KEY)
      return
    }
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ from: payload.from, text: payload.text, fileCount: payload.files?.length ?? 0 }),
    )
  } catch {
    /* private mode */
  }
}

export function setHandoff(payload: HandoffPayload): void {
  memory = payload
  generation += 1
  persistMeta(payload)
  notify()
}

export function takeHandoff(): HandoffPayload | null {
  const payload = memory
  memory = null
  persistMeta(null)
  return payload
}

/** Put a payload back only if nothing newer has been set (StrictMode remount). */
export function restoreHandoff(payload: HandoffPayload, gen: number): void {
  if (generation !== gen || memory) return
  memory = payload
  persistMeta(payload)
}

export function filesFromBlobs(items: { blob: Blob; name: string }[]): File[] {
  return items.map((item) => new File([item.blob], item.name, { type: item.blob.type || 'application/octet-stream' }))
}

/** Office formats have no HandoffKind of their own, but they have one home. */
const OFFICE_EXT = /\.(docx|pptx|xlsx|rtf|odt)$/i

export function suggestPath(files: File[], text?: string): string {
  if (files.length && files.every((file) => OFFICE_EXT.test(file.name))) return '/office'
  if (files.length && files.every((file) => /\.zip$/i.test(file.name))) return '/archive'

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

export type SendTarget = { id: string; path: string; title: string; accepts: HandoffKind[] }

/**
 * Every tool that can receive a handoff, derived from the registry's
 * `accepts` so a new tool shows up in Send-to without a second list to edit.
 */
export const SEND_TARGETS: SendTarget[] = tools
  .filter((tool) => tool.accepts?.length)
  .map((tool) => ({ id: tool.id, path: tool.path, title: tool.title, accepts: tool.accepts! }))
