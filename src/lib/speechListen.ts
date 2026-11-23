/**
 * Dictation through the browser's speech recogniser.
 *
 * Unlike on-device text-to-speech, Chrome's recogniser sends audio to the
 * browser vendor. Callers have to say that before the microphone starts.
 * Firefox and some locked-down browsers have no recogniser at all.
 */

type SpeechResult = { isFinal: boolean; 0: { transcript: string } }

type RecognitionEvent = { resultIndex: number; results: ArrayLike<SpeechResult> }

type RecognitionError = { error: string }

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionError) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | null {
  const w = window as Window & { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function canDictate(): boolean {
  return typeof window !== 'undefined' && ctor() != null
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'The microphone is blocked. Allow it for this site and try again.',
  'service-not-allowed': 'This browser will not run speech recognition here.',
  'audio-capture': 'No microphone was found.',
  network: 'The browser could not reach its speech service.',
  'no-speech': 'No speech was heard.',
  aborted: 'Listening stopped.',
}

export function startDictation(options: {
  lang: string
  onText: (text: string, final: boolean) => void
  onEnd: () => void
  onError: (message: string) => void
}): { stop: () => void } {
  const Ctor = ctor()
  if (!Ctor) throw new Error('This browser has no speech recognition.')
  const rec = new Ctor()
  rec.lang = options.lang || navigator.language || 'en'
  rec.continuous = true
  rec.interimResults = true
  rec.onresult = (event) => {
    let finalText = ''
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0]?.transcript ?? ''
      if (event.results[i].isFinal) finalText += piece
      else interim += piece
    }
    if (finalText) options.onText(finalText, true)
    else if (interim) options.onText(interim, false)
  }
  rec.onerror = (event) => {
    if (event.error === 'aborted' || event.error === 'no-speech') return
    options.onError(ERRORS[event.error] ?? 'Speech recognition stopped.')
  }
  rec.onend = () => options.onEnd()
  rec.start()
  return {
    stop: () => {
      rec.onend = null
      rec.stop()
    },
  }
}
