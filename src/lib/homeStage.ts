/**
 * A paste or drop on Home, held until the home page paints the tool list.
 * File bytes stay in memory for this tab only.
 */

export type HomeStage = {
  id: number
  files: File[]
  text: string
}

let staged: HomeStage | null = null
let seq = 0
const listeners = new Set<() => void>()

export function stageHomeInput(files: File[], text = ''): void {
  staged = { id: (seq += 1), files, text }
  for (const listener of listeners) listener()
}

export function peekHomeInput(): HomeStage | null {
  return staged
}

export function clearHomeInput(): void {
  staged = null
}

export function subscribeHomeInput(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Turns a pasted block into a file the existing drop router already understands. */
export function fileFromPastedText(text: string): File {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return new File([text], 'pasted.json', { type: 'application/json' })
  }
  const lines = trimmed.split(/\r?\n/)
  if (lines.length > 1 && lines[0].includes(',') && lines.filter((line) => line.includes(',')).length > 1) {
    return new File([text], 'pasted.csv', { type: 'text/csv' })
  }
  if (/^<!doctype html/i.test(trimmed) || /<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return new File([text], 'pasted.html', { type: 'text/html' })
  }
  return new File([text], 'pasted.md', { type: 'text/markdown' })
}
