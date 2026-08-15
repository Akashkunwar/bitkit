import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { createNoiseEngine, NOISE_COLOURS, type NoiseColour, type NoiseEngine } from '../../lib/noise'

const SLEEP_PRESETS = [0, 15, 30, 45, 60, 90]

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function NoiseTool() {
  const [colour, setColour] = useState<NoiseColour>('pink')
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.4)
  const [tone, setTone] = useState(0)
  const [sleepMinutes, setSleepMinutes] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const engineRef = useRef<NoiseEngine | null>(null)

  const engine = () => {
    if (!engineRef.current) engineRef.current = createNoiseEngine()
    return engineRef.current
  }

  useEffect(() => {
    return () => {
      engineRef.current?.close()
      engineRef.current = null
    }
  }, [])

  // Sleep timer: fade out over the last few seconds rather than cutting hard.
  useEffect(() => {
    if (!playing || !sleepMinutes) {
      setRemaining(0)
      return
    }
    const endsAt = Date.now() + sleepMinutes * 60_000
    setRemaining(sleepMinutes * 60)
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        window.clearInterval(id)
        engineRef.current?.fadeOut(8)
        setPlaying(false)
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [playing, sleepMinutes])

  const toggle = () => {
    const e = engine()
    if (playing) {
      e.stop()
      setPlaying(false)
    } else {
      e.setVolume(volume)
      e.setTone(tone)
      e.start(colour)
      setPlaying(true)
    }
  }

  const active = NOISE_COLOURS.find((c) => c.value === colour)

  return (
    <ToolLayout
      title="Noise generator"
      lede="White, pink, and brown noise for focus or sleep. Generated live in the tab — no audio files, no streaming."
    >
      <div className="field">
        <span>Colour</span>
        <div className="chip-row">
          {NOISE_COLOURS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={colour === c.value ? 'chip chip-on' : 'chip'}
              aria-pressed={colour === c.value}
              onClick={() => {
                setColour(c.value)
                if (playing) engine().setColour(c.value)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {active ? <p className="hint">{active.note}</p> : null}

      <div className="noise-stage" data-playing={playing}>
        <button type="button" className="noise-toggle" onClick={toggle} aria-pressed={playing}>
          {playing ? '❚❚' : '▶'}
          <span>{playing ? 'Pause' : 'Play'}</span>
        </button>
        {playing && remaining > 0 ? <span className="noise-countdown">Stops in {clock(remaining)}</span> : null}
      </div>

      <label className="field">
        <span>Volume — {Math.round(volume * 100)}%</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value)
            setVolume(v)
            engine().setVolume(v)
          }}
        />
      </label>

      <label className="field">
        <span>Tone — {tone ? `soften above ${tone} Hz` : 'full brightness'}</span>
        <input
          type="range"
          min={0}
          max={8000}
          step={100}
          value={tone}
          onChange={(e) => {
            const v = Number(e.target.value)
            setTone(v)
            engine().setTone(v)
          }}
        />
      </label>

      <div className="field">
        <span>Sleep timer</span>
        <div className="chip-row">
          {SLEEP_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              className={sleepMinutes === m ? 'chip chip-on' : 'chip'}
              aria-pressed={sleepMinutes === m}
              onClick={() => setSleepMinutes(m)}
            >
              {m === 0 ? 'Off' : `${m} min`}
            </button>
          ))}
        </div>
      </div>

      <p className="hint" style={{ marginTop: '1rem' }}>
        Keep the volume low. Sustained noise above roughly 70 dB over a long night is not harmless — if it is loud
        enough to mask conversation, it is louder than it needs to be.
      </p>
    </ToolLayout>
  )
}
