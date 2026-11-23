/**
 * Helpers for the Text to speech tool, kept out of the component so they
 * can be tested without a speech engine.
 */

/** Speech runs in chunks: some engines stop after ~15 seconds on one long utterance. */
export function chunkText(text: string, max = 220): string[] {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?।。]+[.!?।。]*\s*/g) ?? []
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current) {
      chunks.push(current.trim())
      current = ''
    }
    if (sentence.length > max) {
      for (const piece of sentence.match(new RegExp(`.{1,${max}}(\\s|$)`, 'g')) ?? [sentence]) chunks.push(piece.trim())
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(Boolean)
}

type VoiceLike = { default: boolean; localService: boolean }

/**
 * The voice to use when none is chosen. On-device voices come first: the
 * "online" ones send the text to the browser vendor, which is not what a
 * privacy-first tool should do by default.
 */
/** The word that contains `index`, for follow-along highlighting while audio plays. */
export function wordAt(text: string, index: number): { start: number; end: number } {
  if (!text) return { start: 0, end: 0 }
  let cursor = Math.max(0, Math.min(index, text.length - 1))
  if (/\s/.test(text[cursor])) {
    const next = text.slice(cursor).search(/\S/)
    if (next >= 0) cursor += next
    else {
      const prev = text.slice(0, cursor).search(/\S(?=\s*$)/)
      cursor = prev < 0 ? 0 : prev
    }
  }
  let start = cursor
  while (start > 0 && !/\s/.test(text[start - 1])) start--
  let end = cursor
  while (end < text.length && !/\s/.test(text[end])) end++
  return { start, end }
}

export function pickVoice<T extends VoiceLike>(voices: T[]): T | undefined {
  return (
    voices.find((v) => v.default && v.localService) ??
    voices.find((v) => v.localService) ??
    voices.find((v) => v.default) ??
    voices[0]
  )
}
