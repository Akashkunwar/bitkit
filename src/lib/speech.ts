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
export function pickVoice<T extends VoiceLike>(voices: T[]): T | undefined {
  return (
    voices.find((v) => v.default && v.localService) ??
    voices.find((v) => v.localService) ??
    voices.find((v) => v.default) ??
    voices[0]
  )
}
