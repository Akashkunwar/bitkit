import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { saveAs } from '../../lib/download'
import { formatBytes } from '../../lib/format'
import { extensionFor, formatClock, pickMimeType } from '../../lib/media'

type Source = 'screen' | 'camera' | 'audio'

const SOURCES: { value: Source; label: string }[] = [
  { value: 'screen', label: 'Screen' },
  { value: 'camera', label: 'Camera' },
  { value: 'audio', label: 'Microphone' },
]

const QUALITY = [
  { value: 4_000_000, label: 'High' },
  { value: 2_000_000, label: 'Balanced' },
  { value: 900_000, label: 'Small file' },
]

type Output = { blob: Blob; name: string; url: string }

export default function RecordTool() {
  const [source, setSource] = useState<Source>('screen')
  const [withMic, setWithMic] = useState(true)
  const [bitrate, setBitrate] = useState(2_000_000)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<Output | null>(null)

  const previewRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamsRef = useRef<MediaStream[]>([])
  const contextRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const supported =
    typeof navigator !== 'undefined' && typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices)

  const stopTracks = () => {
    for (const stream of streamsRef.current) {
      for (const track of stream.getTracks()) track.stop()
    }
    streamsRef.current = []
    void contextRef.current?.close()
    contextRef.current = null
    window.clearInterval(timerRef.current)
    if (previewRef.current) previewRef.current.srcObject = null
  }

  useEffect(() => {
    return () => {
      recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop()
      stopTracks()
      if (output) URL.revokeObjectURL(output.url)
    }
    // Cleanup only on unmount; the output URL is revoked when replaced too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = async () => {
    setError(null)
    if (output) URL.revokeObjectURL(output.url)
    setOutput(null)
    try {
      const streams: MediaStream[] = []
      const tracks: MediaStreamTrack[] = []
      const audioSources: MediaStream[] = []

      if (source === 'screen') {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        streams.push(display)
        tracks.push(...display.getVideoTracks())
        if (display.getAudioTracks().length) audioSources.push(display)
      } else if (source === 'camera') {
        const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        streams.push(camera)
        tracks.push(...camera.getVideoTracks())
      }

      if (withMic || source === 'audio') {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
        streams.push(mic)
        audioSources.push(mic)
      }

      // Two audio sources (system + mic) need mixing into one track.
      if (audioSources.length === 1) {
        tracks.push(...audioSources[0].getAudioTracks())
      } else if (audioSources.length > 1) {
        const ctx = new AudioContext()
        contextRef.current = ctx
        const destination = ctx.createMediaStreamDestination()
        for (const stream of audioSources) ctx.createMediaStreamSource(stream).connect(destination)
        tracks.push(...destination.stream.getAudioTracks())
      }

      if (!tracks.length) throw new Error('No track was captured. Grant access and try again.')

      streamsRef.current = streams
      const combined = new MediaStream(tracks)
      const kind = source === 'audio' ? 'audio' : 'video'
      const mime = pickMimeType(kind)
      const recorder = new MediaRecorder(combined, {
        ...(mime ? { mimeType: mime } : {}),
        ...(kind === 'video' ? { videoBitsPerSecond: bitrate } : { audioBitsPerSecond: 128_000 }),
      })
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || 'video/webm'
        const blob = new Blob(chunks, { type })
        const url = URL.createObjectURL(blob)
        setOutput({ blob, name: `${source}-recording.${extensionFor(type)}`, url })
        setRecording(false)
        stopTracks()
      }

      // Ending the share from the browser's own bar must stop us too.
      for (const track of tracks) {
        track.addEventListener('ended', () => {
          if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
        })
      }

      if (previewRef.current && kind === 'video') {
        previewRef.current.srcObject = combined
        previewRef.current.muted = true
        await previewRef.current.play().catch(() => undefined)
      }

      recorderRef.current = recorder
      recorder.start(1000)
      setRecording(true)
      setElapsed(0)
      const startedAt = Date.now()
      timerRef.current = window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250)
    } catch (err) {
      stopTracks()
      const message =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')
          ? 'Permission was declined, so nothing was recorded.'
          : err instanceof Error
            ? err.message
            : 'Could not start recording.'
      setError(message)
      setRecording(false)
    }
  }

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  return (
    <ToolLayout
      title="Screen & camera recorder"
      lede="Record your screen, camera, or microphone and save the file. The capture never leaves this tab."
    >
      {!supported ? (
        <p className="status-bad">This browser does not support MediaRecorder capture.</p>
      ) : (
        <>
          <Segmented label="Source" value={source} options={SOURCES} onChange={setSource} />

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <label className="row">
              <input
                type="checkbox"
                checked={withMic || source === 'audio'}
                disabled={source === 'audio' || recording}
                onChange={(e) => setWithMic(e.target.checked)}
              />
              Include microphone
            </label>
            {source !== 'audio' ? (
              <label className="field" style={{ minWidth: '10rem' }}>
                <span>Quality</span>
                <select
                  className="text-input"
                  value={bitrate}
                  disabled={recording}
                  onChange={(e) => setBitrate(Number(e.target.value))}
                >
                  {QUALITY.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="row" style={{ marginTop: '0.8rem' }}>
            {recording ? (
              <button type="button" className="btn btn-primary" onClick={stop}>
                Stop · {formatClock(elapsed)}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => void start()}>
                Start recording
              </button>
            )}
            {output ? (
              <button type="button" className="btn" onClick={() => void saveAs(output.blob, output.name)}>
                Save {formatBytes(output.blob.size)}
              </button>
            ) : null}
          </div>

          {recording ? <p className="hint">Recording… stop from here or from the browser's sharing bar.</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}

          <video
            ref={previewRef}
            className="media-preview"
            style={{ display: recording && source !== 'audio' ? 'block' : 'none' }}
            playsInline
            muted
          />

          {output && !recording ? (
            <div style={{ marginTop: '1rem' }}>
              <p className="field-label">Result</p>
              {source === 'audio' ? (
                <audio className="media-preview" src={output.url} controls />
              ) : (
                <video className="media-preview" src={output.url} controls playsInline />
              )}
              <SendTo from="record" files={[new File([output.blob], output.name, { type: output.blob.type })]} />
            </div>
          ) : null}
        </>
      )}
    </ToolLayout>
  )
}
