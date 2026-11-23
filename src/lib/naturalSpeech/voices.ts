/** Paradee 1.3 voices, in the order the model numbers them. */
export const NATURAL_VOICES = [
  { id: 'af_heart', label: 'Heart', detail: 'American English · female' },
  { id: 'bf_isabella', label: 'Isabella', detail: 'British English · female' },
  { id: 'am_puck', label: 'Puck', detail: 'American English · male' },
  { id: 'bm_fable', label: 'Fable', detail: 'British English · male' },
  { id: 'hf_alpha', label: 'Alpha', detail: 'Hindi · female' },
  { id: 'hm_omega', label: 'Omega', detail: 'Hindi · male' },
  { id: 'ff_siwis', label: 'Siwis', detail: 'French · female' },
  { id: 'em_alex', label: 'Alex', detail: 'Spanish · male' },
] as const

export type NaturalVoiceId = (typeof NATURAL_VOICES)[number]['id']

export type NaturalLang = 'en-us' | 'en-gb' | 'hi' | 'fr' | 'es'

export function isNaturalVoice(id: string): id is NaturalVoiceId {
  return NATURAL_VOICES.some((voice) => voice.id === id)
}

/** The voice's first letter is its language, the same convention Kokoro uses. */
export function languageForVoice(id: string): NaturalLang {
  if (id.startsWith('b')) return 'en-gb'
  if (id.startsWith('h')) return 'hi'
  if (id.startsWith('f')) return 'fr'
  if (id.startsWith('e')) return 'es'
  return 'en-us'
}
