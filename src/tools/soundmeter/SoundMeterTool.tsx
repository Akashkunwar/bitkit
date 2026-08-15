import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { estimateSpl, measure, referenceFor, SPL_REFERENCE } from '../../lib/noise'

type Reading = { spl: number; peak: number }

export default function SoundMeterTool() {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState<Reading>({ spl: 0, peak: 0 })
  const [max, setMax] = useState(0)
  const [calibration, setCalibration] = useState(94)
  const [history, setHistory] = useState<number[]>([])

  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number>(0)

  const stop = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void ctxRef.current?.close()
    ctxRef.current = null
    setListening(false)
  }

  useEffect(() => stop, [])

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Processing would fight the measurement, so ask for the raw signal.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      streamRef.current = stream
      const ctx = new AudioContext()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      setListening(true)
      setMax(0)
      setHistory([])

      const tick = () => {
        analyser.getFloatTimeDomainData(buffer)
        const level = measure(buffer)
        const spl = estimateSpl(level.db, calibration)
        const peak = estimateSpl(level.peakDb, calibration)
        setReading({ spl, peak })
        setMax((current) => Math.max(current, spl))
        setHistory((current) => [...current.slice(-119), spl])
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access was declined, so nothing can be measured.'
          : err instanceof Error
            ? err.message
            : 'Could not open the microphone.'
      setError(message)
      stop()
    }
  }

  const percent = Math.min(100, Math.max(0, (reading.spl / 120) * 100))
  const tone = reading.spl >= 85 ? 'high' : reading.spl >= 70 ? 'warn' : 'ok'

  return (
    <ToolLayout
      title="Sound meter"
      lede="Live level from your microphone. Audio is analysed in the tab and never recorded or sent anywhere."
    >
      <div className="row">
        {listening ? (
          <button type="button" className="btn btn-primary" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => void start()}>
            Start listening
          </button>
        )}
        {listening ? (
          <button type="button" className="btn" onClick={() => { setMax(0); setHistory([]) }}>
            Reset peak
          </button>
        ) : null}
      </div>

      {error ? <p className="status-bad">{error}</p> : null}

      <div className="meter-face" data-tone={tone}>
        <span className="meter-number">{listening ? reading.spl.toFixed(0) : '--'}</span>
        <span className="meter-unit">dB approx.</span>
        <div className="meter-track" aria-hidden="true">
          <div className="meter-bar" data-tone={tone} style={{ width: `${percent}%` }} />
        </div>
      </div>

      {listening ? (
        <>
          <div className="pill-row">
            <span className="pill">Peak now {reading.peak.toFixed(0)} dB</span>
            <span className="pill">Session max {max.toFixed(0)} dB</span>
            <span className="pill">{referenceFor(reading.spl)}</span>
          </div>

          <svg className="level-history" viewBox="0 0 120 40" preserveAspectRatio="none" role="img" aria-label="Level over time">
            <polyline
              points={history.map((v, i) => `${i},${40 - Math.min(40, (v / 120) * 40)}`).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </>
      ) : null}

      <p className="field-label" style={{ marginTop: '1.2rem' }}>
        For reference
      </p>
      <div className="result-list">
        {SPL_REFERENCE.map((entry) => (
          <div key={entry.db} className="result-row" data-active={listening && Math.abs(reading.spl - entry.db) < 8}>
            <span className="pill">{entry.db} dB</span>
            <span style={{ flex: 1 }}>{entry.label}</span>
          </div>
        ))}
      </div>

      <label className="field" style={{ marginTop: '1.2rem' }}>
        <span>Calibration offset — {calibration} dB</span>
        <input
          type="range"
          min={70}
          max={110}
          value={calibration}
          onChange={(e) => setCalibration(Number(e.target.value))}
        />
      </label>

      <p className="hint">
        A browser cannot read your microphone's true sensitivity, so this is a relative measurement mapped onto a
        decibel scale — good for comparing “is this louder than that”, not for anything legal, medical, or
        workplace-safety related. If you have a real meter, match this one to it with the slider above.
      </p>
    </ToolLayout>
  )
}
