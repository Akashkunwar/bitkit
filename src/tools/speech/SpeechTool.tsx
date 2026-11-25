import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Square, Volume2 } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useToolSettings } from '../../lib/prefs'
import { useHandoff } from '../../lib/useHandoff'
import { grantEngineConsent, hasEngineConsent } from '../../lib/cdnConsent'
import { NATURAL_VOICES } from '../../lib/naturalSpeech/voices'
import { encodeWav } from '../../lib/naturalSpeech/wav'
import { triggerDownload } from '../../lib/download'
import { chunkText, pickVoice, wordAt } from '../../lib/speech'

const DEFAULTS = {
  voice: '',
  lang: '',
  rate: 1,
  pitch: 1,
  volume: 1,
  engine: 'natural' as 'natural' | 'device',
  naturalVoice: 'af_heart',
}

/** Unlocks audio playback during the click, before the model download yields. */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

const SAMPLE =
  'BitKit reads this aloud with the voices on your device, so with an on-device voice it even works offline. Paste an article, a draft email, or notes you want to hear back.'

type Status = 'idle' | 'preparing' | 'speaking' | 'paused'

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

export default function SpeechTool() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const { settings, update } = useToolSettings('speech', DEFAULTS)
  const [text, setText] = useState(SAMPLE)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [mode, setMode] = useState<'speak' | 'listen'>('speak')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [listenError, setListenError] = useState<string | null>(null)
  const [listenArmed, setListenArmed] = useState(false)
  const dictation = useRef<{ stop: () => void } | null>(null)
  const [spoken, setSpoken] = useState<{ start: number; end: number } | null>(null)
  const [allowed, setAllowed] = useState(() => hasEngineConsent())
  const [note, setNote] = useState<string | null>(null)
  const queue = useRef<{ chunks: string[]; offsets: number[]; index: number } | null>(null)
  const player = useRef<HTMLAudioElement | null>(null)
  const clipUrl = useRef<string | null>(null)
  const runId = useRef(0)
  const finishClip = useRef<((outcome: 'ended' | 'stopped') => void) | null>(null)
  const spokenPcm = useRef<Float32Array[]>([])
  const [wav, setWav] = useState<Blob | null>(null)

  useHandoff((payload) => {
    if (payload.text) setText(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setText)
  })

  useEffect(() => {
    if (player.current) player.current.volume = settings.volume
  }, [settings.volume])

  useEffect(() => {
    return () => {
      runId.current += 1
      player.current?.pause()
      if (clipUrl.current) URL.revokeObjectURL(clipUrl.current)
    }
  }, [])

  useEffect(() => {
    if (!supported) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      window.speechSynthesis.cancel()
    }
  }, [supported])

  const languages = useMemo(() => {
    const codes = [...new Set(voices.map((v) => v.lang.split('-')[0]))]
    return codes.map((code) => ({ code, name: languageName(code) })).sort((a, b) => a.name.localeCompare(b.name))
  }, [voices])

  const filtered = useMemo(
    () => (settings.lang ? voices.filter((v) => v.lang.split('-')[0] === settings.lang) : voices),
    [voices, settings.lang],
  )
  const voice = voices.find((v) => v.voiceURI === settings.voice) ?? pickVoice(filtered)

  const speakChunk = useCallback(() => {
    const state = queue.current
    if (!state || state.index >= state.chunks.length) {
      queue.current = null
      setStatus('idle')
      setSpoken(null)
      return
    }
    const chunk = state.chunks[state.index]
    const offset = state.offsets[state.index]
    const utterance = new SpeechSynthesisUtterance(chunk)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }
    utterance.rate = settings.rate
    utterance.pitch = settings.pitch
    utterance.volume = settings.volume
    utterance.onboundary = (event) => {
      if (event.name !== 'word') return
      const start = offset + event.charIndex
      const length = event.charLength || (chunk.slice(event.charIndex).match(/^\S+/)?.[0].length ?? 1)
      setSpoken({ start, end: start + length })
    }
    utterance.onend = () => {
      if (queue.current !== state) return
      state.index += 1
      speakChunk()
    }
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return
      queue.current = null
      setStatus('idle')
      setNote('This browser could not speak that.')
    }
    window.speechSynthesis.speak(utterance)
  }, [voice, settings.rate, settings.pitch, settings.volume])

  const audio = () => {
    if (!player.current) player.current = new Audio()
    player.current.volume = settings.volume
    return player.current
  }

  const stopNatural = () => {
    runId.current += 1
    finishClip.current?.('stopped')
    finishClip.current = null
    const element = player.current
    if (!element) return
    element.onended = null
    element.ontimeupdate = null
    element.pause()
    element.removeAttribute('src')
    element.load()
    if (clipUrl.current) URL.revokeObjectURL(clipUrl.current)
    clipUrl.current = null
  }

  const playNatural = async () => {
    if (!text.trim() || !allowed) return
    stopNatural()
    spokenPcm.current = []
    setWav(null)
    window.speechSynthesis.cancel()
    const run = runId.current
    const element = audio()
    element.src = SILENT_WAV
    try {
      await element.play()
      element.pause()
    } catch {
      /* a later play() reports this if the browser still blocks it */
    }
    const normalised = text.replace(/\s+/g, ' ').trim()
    const chunks = chunkText(normalised, 280)
    const offsets: number[] = []
    let cursor = 0
    for (const chunk of chunks) {
      const at = normalised.indexOf(chunk, cursor)
      offsets.push(at < 0 ? cursor : at)
      cursor = (at < 0 ? cursor : at) + chunk.length
    }
    setStatus('preparing')
    setNote('Loading the natural voice…')
    setSpoken(null)
    try {
      const { synthesize } = await import('../../lib/naturalSpeech/engine')
      if (runId.current !== run) return
      let upcoming = synthesize(chunks[0] ?? '', settings.naturalVoice, settings.rate, (message) => {
        if (runId.current === run) setNote(message)
      })
      for (let index = 0; index < chunks.length; index++) {
        const pcm = await upcoming
        if (runId.current !== run) return
        if (index + 1 < chunks.length) {
          upcoming = synthesize(chunks[index + 1], settings.naturalVoice, settings.rate)
        }
        if (!pcm.length) continue
        spokenPcm.current.push(pcm)
        const parts = spokenPcm.current
        const joined = new Float32Array(parts.reduce((count, part) => count + part.length, 0))
        let at = 0
        for (const part of parts) {
          joined.set(part, at)
          at += part.length
        }
        setWav(encodeWav(joined))
        const url = URL.createObjectURL(encodeWav(pcm))
        if (clipUrl.current) URL.revokeObjectURL(clipUrl.current)
        clipUrl.current = url
        element.src = url
        const chunk = chunks[index]
        const offset = offsets[index]
        element.ontimeupdate = () => {
          if (!Number.isFinite(element.duration) || element.duration === 0) return
          const at = Math.min(chunk.length - 1, Math.floor((element.currentTime / element.duration) * chunk.length))
          const word = wordAt(chunk, at)
          setSpoken({ start: offset + word.start, end: offset + word.end })
        }
        setStatus('speaking')
        setNote(null)
        const outcome = await new Promise<'ended' | 'stopped'>((resolve) => {
          finishClip.current = resolve
          element.onended = () => resolve('ended')
          void element.play().catch(() => resolve('stopped'))
        })
        finishClip.current = null
        if (outcome === 'stopped' || runId.current !== run) return
      }
      if (runId.current === run) {
        setStatus('idle')
        setSpoken(null)
        setNote(null)
      }
    } catch (err) {
      if (runId.current !== run) return
      setStatus('idle')
      setSpoken(null)
      setNote(err instanceof Error ? err.message : 'The natural voice could not start.')
    }
  }

  const play = () => {
    if (!text.trim()) return
    if (settings.engine === 'natural') {
      if (status === 'paused') {
        void audio().play()
        setStatus('speaking')
        return
      }
      void playNatural()
      return
    }
    stopNatural()
    if (!supported) return
    if (status === 'paused') {
      window.speechSynthesis.resume()
      setStatus('speaking')
      return
    }
    window.speechSynthesis.cancel()
    const normalised = text.replace(/\s+/g, ' ')
    const chunks = chunkText(normalised)
    const offsets: number[] = []
    let cursor = 0
    for (const chunk of chunks) {
      const at = normalised.indexOf(chunk, cursor)
      offsets.push(at < 0 ? cursor : at)
      cursor = (at < 0 ? cursor : at) + chunk.length
    }
    queue.current = { chunks, offsets, index: 0 }
    setStatus('speaking')
    setNote(null)
    speakChunk()
  }

  const pause = () => {
    if (settings.engine === 'natural') {
      player.current?.pause()
      setStatus('paused')
      return
    }
    window.speechSynthesis.pause()
    setStatus('paused')
  }

  const stop = () => {
    queue.current = null
    stopNatural()
    window.speechSynthesis.cancel()
    setStatus('idle')
    setSpoken(null)
    setNote(null)
  }

  const stopListening = () => {
    dictation.current?.stop()
    dictation.current = null
    setListening(false)
    setInterim('')
  }

  const startListening = async () => {
    if (!listenArmed) {
      setListenArmed(true)
      setListenError('Press Start again. Chrome may send the audio to the browser vendor. BitKit does not receive it.')
      return
    }
    const { canDictate, startDictation } = await import('../../lib/speechListen')
    if (!canDictate()) {
      setListenError('This browser has no speech recognizer.')
      return
    }
    stopListening()
    setListenError(null)
    dictation.current = startDictation({
      lang: settings.lang || navigator.language || 'en',
      onText: (value, final) => {
        if (final) {
          setText((prev) => `${prev.trim()} ${value.trim()}`.trim())
          setInterim('')
        } else setInterim(value)
      },
      onEnd: () => {
        dictation.current = null
        setListening(false)
        setInterim('')
      },
      onError: (message) => {
        setListenError(message)
        setListening(false)
      },
    })
    setListening(true)
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const minutes = words / (170 * settings.rate)
  const normalisedText = text.replace(/\s+/g, ' ')

  return (
    <ToolLayout
      title="Text to speech"
      lede="Hear text in a natural voice that runs in this tab, or with the voices built into your device. Follow along word by word."
    >
      {settings.engine === 'device' && !supported ? (
        <p className="banner warn">
          This browser has no speech synthesis. Try a current Chrome, Edge, Safari, or Firefox.
        </p>
      ) : null}
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'speak', label: 'Speak' },
          { value: 'listen', label: 'Listen' },
        ]}
        onChange={(value) => {
          if (value === 'speak') stopListening()
          setMode(value)
        }}
      />
      {mode === 'listen' ? (
        <section className="panel">
          <p className="banner warn">
            Dictation uses the browser’s recognizer. In Chrome that audio can be sent to the browser vendor. BitKit
            never sees it, and it is not saved here.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void (listening ? stopListening() : startListening())}
            >
              {listening ? 'Stop listening' : 'Start listening'}
            </button>
          </div>
          {interim ? <p className="hint">{interim}</p> : null}
          {listenError ? <p className="status-bad">{listenError}</p> : null}
          <p className="hint">
            Final words are added to the text box. Speak mode can read them back with an on-device voice.
          </p>
        </section>
      ) : null}
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>Text</span>
            <textarea
              className="text-input speech-input"
              rows={12}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (status !== 'idle') stop()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  play()
                }
              }}
            />
          </label>
          <p className="hint">
            {words.toLocaleString()} words · about{' '}
            {minutes < 1 ? `${Math.max(1, Math.round(minutes * 60))} seconds` : `${Math.round(minutes)} min`} at this
            speed. Ctrl + Enter to play.
          </p>
          {status !== 'idle' && spoken ? (
            <div className="speech-follow" aria-hidden="true">
              {normalisedText.slice(Math.max(0, spoken.start - 160), spoken.start)}
              <mark>{normalisedText.slice(spoken.start, spoken.end)}</mark>
              {normalisedText.slice(spoken.end, spoken.end + 200)}
            </div>
          ) : null}
        </section>

        <aside className="panel">
          <Segmented
            label="Voice engine"
            value={settings.engine}
            options={[
              { value: 'natural', label: 'Natural' },
              { value: 'device', label: 'Device' },
            ]}
            onChange={(value) => {
              if (value !== settings.engine) stop()
              update({ engine: value })
            }}
          />
          {settings.engine === 'natural' && !allowed ? (
            <div className="panel" style={{ marginBottom: '1rem' }}>
              <p>
                The natural voice downloads about 30 MB once (a small speech model, an English pronunciation dictionary,
                and its runtime). Your text stays in this tab and is not uploaded. After that it works offline.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  grantEngineConsent()
                  setAllowed(true)
                }}
              >
                Allow voice download
              </button>
            </div>
          ) : null}
          <div className="speech-controls">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={
                !text.trim() || status === 'preparing' || (settings.engine === 'natural' ? !allowed : !supported)
              }
              onClick={status === 'speaking' ? pause : play}
            >
              {status === 'speaking' ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              {status === 'preparing'
                ? 'Preparing…'
                : status === 'speaking'
                  ? 'Pause'
                  : status === 'paused'
                    ? 'Resume'
                    : 'Read aloud'}
            </button>
            <button type="button" className="btn btn-lg" disabled={status === 'idle'} onClick={stop}>
              <Square size={16} aria-hidden="true" />
              Stop
            </button>
            {settings.engine === 'natural' ? (
              <button
                type="button"
                className="btn btn-lg"
                disabled={!wav}
                onClick={() => wav && triggerDownload(wav, 'speech.wav')}
              >
                Download WAV
              </button>
            ) : null}
          </div>
          {note ? <p className={status === 'idle' ? 'status-bad' : 'hint'}>{note}</p> : null}

          {settings.engine === 'natural' ? (
            <label className="field">
              <span>Voice</span>
              <select value={settings.naturalVoice} onChange={(e) => update({ naturalVoice: e.target.value })}>
                {NATURAL_VOICES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.detail}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="field">
                <span>Language</span>
                <select value={settings.lang} onChange={(e) => update({ lang: e.target.value, voice: '' })}>
                  <option value="">All languages ({voices.length} voices)</option>
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Voice</span>
                <select value={voice?.voiceURI ?? ''} onChange={(e) => update({ voice: e.target.value })}>
                  {filtered.length ? null : <option value="">No voices installed</option>}
                  {filtered.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} · {v.lang}
                      {v.localService ? '' : ' (online)'}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="field">
            <span>Speed · {settings.rate.toFixed(1)}×</span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={settings.rate}
              onChange={(e) => update({ rate: Number(e.target.value) })}
            />
          </label>
          {settings.engine === 'device' ? (
            <label className="field">
              <span>Pitch · {settings.pitch.toFixed(1)}</span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.1}
                value={settings.pitch}
                onChange={(e) => update({ pitch: Number(e.target.value) })}
              />
            </label>
          ) : null}
          <label className="field">
            <span>
              <Volume2 size={13} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Volume ·{' '}
              {Math.round(settings.volume * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => update({ volume: Number(e.target.value) })}
            />
          </label>
          <p className="hint">
            {settings.engine === 'natural'
              ? 'Heart, Puck, Isabella, and Fable read English. Alpha and Omega read Hindi, Siwis reads French, and Alex reads Spanish. The voice is Paradee, distilled from Kokoro, and it runs in this tab.'
              : 'Voices marked “online” are provided by your browser vendor and send the text to their service. Every other voice runs on this device. These are the system voices, which are clearer than they are natural.'}
          </p>
        </aside>
      </div>
    </ToolLayout>
  )
}
