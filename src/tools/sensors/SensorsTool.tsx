import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'

type Mode = 'camera' | 'stick'

export default function SensorsTool() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mode, setMode] = useState<Mode>('camera')
  const [hear, setHear] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (mode !== 'camera') return
    let stream: MediaStream | null = null
    let audio: AudioContext | null = null
    let stopped = false
    setError(null)
    void navigator.mediaDevices
      .getUserMedia({ video: true, audio: hear })
      .then((next) => {
        if (stopped) {
          next.getTracks().forEach((track) => track.stop())
          return
        }
        stream = next
        if (videoRef.current) videoRef.current.srcObject = next
        if (hear) {
          audio = new AudioContext()
          audio.createMediaStreamSource(next).connect(audio.destination)
        }
      })
      .catch(() => setError('The camera or microphone was not allowed.'))
    return () => {
      stopped = true
      stream?.getTracks().forEach((track) => track.stop())
      void audio?.close()
    }
  }, [mode, hear])

  useEffect(() => {
    if (mode !== 'stick') return
    let frame = 0
    const tick = () => {
      const pad = [...(navigator.getGamepads?.() ?? [])].find((item) => item)
      if (pad) setStick({ x: pad.axes[0] ?? 0, y: pad.axes[1] ?? 0 })
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [mode])

  const drift = stick ? Math.hypot(stick.x, stick.y) : 0

  return (
    <ToolLayout
      title="Sensors"
      lede="See the camera, hear the microphone, or watch how far a stick rests from the center. Nothing is recorded."
    >
      <Segmented
        label="Check"
        value={mode}
        options={[
          { value: 'camera', label: 'Camera' },
          { value: 'stick', label: 'Stick drift' },
        ]}
        onChange={setMode}
      />
      {mode === 'camera' ? (
        <div className="panel">
          <video ref={videoRef} autoPlay playsInline muted className="paper-preview" />
          <label className="field">
            <span>
              <input type="checkbox" checked={hear} onChange={(e) => setHear(e.target.checked)} /> Play the microphone
            </span>
          </label>
          <p className="hint">
            Playback can howl if the speakers face the microphone. Leave it off unless you want to hear yourself.
          </p>
          {error ? <p className="status-bad">{error}</p> : null}
        </div>
      ) : (
        <div className="panel">
          <p className="lede">
            {stick
              ? `x ${stick.x.toFixed(3)} · y ${stick.y.toFixed(3)} · distance ${drift.toFixed(3)}`
              : 'Press a button on the controller.'}
          </p>
          <p className="hint">A stick at rest should sit near zero. A distance that stays above about 0.15 is drift.</p>
        </div>
      )}
    </ToolLayout>
  )
}
