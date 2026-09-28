import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Square, Volume2 } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { useToolSettings } from '../../lib/prefs'
import { useHandoff } from '../../lib/useHandoff'
import { chunkText, pickVoice } from '../../lib/speech'

const DEFAULTS = { voice: '', lang: '', rate: 1, pitch: 1, volume: 1 }

const SAMPLE =
  'BitKit reads this aloud with the voices on your device, so with an on-device voice it even works offline. Paste an article, a draft email, or notes you want to hear back.'

type Status = 'idle' | 'speaking' | 'paused'

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
  const [spoken, setSpoken] = useState<{ start: number; end: number } | null>(null)
  const queue = useRef<{ chunks: string[]; offsets: number[]; index: number } | null>(null)

  useHandoff((payload) => {
    if (payload.text) setText(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setText)
  })

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
    }
    window.speechSynthesis.speak(utterance)
  }, [voice, settings.rate, settings.pitch, settings.volume])

  const play = () => {
    if (!supported || !text.trim()) return
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
    speakChunk()
  }

  const pause = () => {
    window.speechSynthesis.pause()
    setStatus('paused')
  }

  const stop = () => {
    queue.current = null
    window.speechSynthesis.cancel()
    setStatus('idle')
    setSpoken(null)
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const minutes = words / (170 * settings.rate)
  const normalisedText = text.replace(/\s+/g, ' ')

  return (
    <ToolLayout
      title="Text to speech"
      lede="Hear any text read aloud with the voices built into your device — pick a voice, set the speed, and follow along word by word."
    >
      {!supported ? (
        <p className="banner warn">
          This browser has no speech synthesis. Try a current Chrome, Edge, Safari, or Firefox.
        </p>
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
          <div className="speech-controls">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!supported || !text.trim()}
              onClick={status === 'speaking' ? pause : play}
            >
              {status === 'speaking' ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              {status === 'speaking' ? 'Pause' : status === 'paused' ? 'Resume' : 'Read aloud'}
            </button>
            <button type="button" className="btn btn-lg" disabled={status === 'idle'} onClick={stop}>
              <Square size={16} aria-hidden="true" />
              Stop
            </button>
          </div>

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
            <select
              value={voice?.voiceURI ?? ''}
              onChange={(e) => update({ voice: e.target.value })}
              disabled={!filtered.length}
            >
              {filtered.length ? null : <option value="">No voices installed</option>}
              {filtered.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} · {v.lang}
                  {v.localService ? '' : ' (online)'}
                </option>
              ))}
            </select>
          </label>
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
            Voices marked “online” are provided by your browser vendor and send the text to their service. Every other
            voice runs on this device. Browsers do not let a page record speech, so there is no audio download.
          </p>
        </aside>
      </div>
    </ToolLayout>
  )
}
