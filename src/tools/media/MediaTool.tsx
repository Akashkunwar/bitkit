import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { saveAs, triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { formatBytes, parseByteLimit } from '../../lib/format'
import {
  bitrateForTarget,
  captureFrame,
  extensionFor,
  formatClock,
  probeMedia,
  trimMedia,
  type MediaInfo,
} from '../../lib/media'

const EDGES = [
  { value: 0, label: 'Original' },
  { value: 1920, label: '1080p' },
  { value: 1280, label: '720p' },
  { value: 854, label: '480p' },
  { value: 640, label: '360p' },
]

type Output = { blob: Blob; name: string }

export default function MediaTool() {
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<MediaInfo | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [maxEdge, setMaxEdge] = useState(0)
  const [limit, setLimit] = useState('')
  const [mute, setMute] = useState(false)
  const [audioOnly, setAudioOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<Output | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  const take = async (next: File) => {
    setError(null)
    setOutput(null)
    try {
      const probed = await probeMedia(next)
      setFile(next)
      setInfo(probed)
      setStart(0)
      setEnd(probed.duration)
      setAudioOnly(probed.kind === 'audio')
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(next)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that media file.')
    }
  }

  useHandoff((payload) => {
    const media = payload.files?.find((f) => f.type.startsWith('video/') || f.type.startsWith('audio/'))
    if (media) void take(media)
  })

  const run = async () => {
    if (!file || !info) return
    setBusy(true)
    setError(null)
    setOutput(null)
    setProgress(0)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const seconds = Math.max(0.1, end - start)
      const maxBytes = parseByteLimit(limit)
      const result = await trimMedia(
        file,
        {
          start,
          end,
          maxEdge: maxEdge || undefined,
          mute,
          audioOnly,
          videoBitsPerSecond: maxBytes ? bitrateForTarget(maxBytes, seconds) : undefined,
          audioBitsPerSecond: 96_000,
        },
        setProgress,
        controller.signal,
      )
      const ext = extensionFor(result.mime)
      setOutput({ blob: result.blob, name: `${file.name.replace(/\.[^.]+$/, '')}-clip.${ext}` })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process that clip.')
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const seconds = Math.max(0, end - start)
  const maxBytes = parseByteLimit(limit)

  return (
    <ToolLayout
      title="Video & audio trim"
      lede="Cut a clip, shrink it under an upload limit, or pull the audio out. Re-encoded in this tab — it plays through once while it works."
    >
      <DropZone
        accept="video/*,audio/*"
        label="Drop a video or audio file."
        hint="Processing runs in real time, so a 2-minute clip takes about 2 minutes."
        onFiles={(files) => {
          const media = files.find((f) => f.type.startsWith('video/') || f.type.startsWith('audio/'))
          if (media) void take(media)
          else setError('That is not a video or audio file.')
        }}
      />
      {error ? <p className="status-bad">{error}</p> : null}

      {file && info && url ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <p className="hint">
            {file.name} · {formatBytes(file.size)} · {formatClock(info.duration)}
            {info.width ? ` · ${info.width}×${info.height}` : ''}
          </p>

          {info.kind === 'video' ? (
            <video ref={videoRef} className="media-preview" src={url} controls playsInline preload="metadata" />
          ) : (
            <audio className="media-preview" src={url} controls preload="metadata" />
          )}

          <div className="split">
            <label className="field">
              <span>Start — {formatClock(start)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, info.duration)}
                step={0.1}
                value={start}
                onChange={(e) => {
                  const next = Math.min(Number(e.target.value), end - 0.1)
                  setStart(Math.max(0, next))
                  if (videoRef.current) videoRef.current.currentTime = Math.max(0, next)
                }}
              />
            </label>
            <label className="field">
              <span>End — {formatClock(end)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, info.duration)}
                step={0.1}
                value={end}
                onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 0.1))}
              />
            </label>
          </div>

          <div className="split">
            <label className="field">
              <span>Resolution</span>
              <select
                className="text-input"
                value={maxEdge}
                disabled={audioOnly}
                onChange={(e) => setMaxEdge(Number(e.target.value))}
              >
                {EDGES.map((edge) => (
                  <option key={edge.value} value={edge.value}>
                    {edge.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Target size — blank for automatic</span>
              <input
                className="text-input"
                placeholder="16mb"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </label>
          </div>

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <label className="row">
              <input
                type="checkbox"
                checked={audioOnly}
                disabled={info.kind === 'audio'}
                onChange={(e) => setAudioOnly(e.target.checked)}
              />
              Audio only — extract the soundtrack
            </label>
            <label className="row">
              <input type="checkbox" checked={mute} disabled={audioOnly} onChange={(e) => setMute(e.target.checked)} />
              Drop the audio
            </label>
          </div>

          <p className="hint">
            Clip is {formatClock(seconds)}
            {maxBytes && !audioOnly
              ? ` · aiming for ${formatBytes(maxBytes)} at about ${Math.round(bitrateForTarget(maxBytes, seconds) / 1000)} kbps`
              : ''}
          </p>

          <div className="row" style={{ marginTop: '0.8rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void run()}>
              {busy ? `Encoding… ${Math.round(progress * 100)}%` : 'Export clip'}
            </button>
            {busy ? (
              <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
                Stop
              </button>
            ) : null}
            {info.kind === 'video' && !busy ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const video = videoRef.current
                  if (!video) return
                  void captureFrame(video)
                    .then((blob) => triggerDownload(blob, 'frame.png'))
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Frame export failed.'))
                }}
              >
                Save current frame
              </button>
            ) : null}
            {output ? (
              <button type="button" className="btn" onClick={() => void saveAs(output.blob, output.name)}>
                Save {formatBytes(output.blob.size)}
              </button>
            ) : null}
          </div>

          {busy ? (
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <div className="meter-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          ) : null}

          {output ? (
            <div className="pill-row" style={{ marginTop: '0.8rem' }}>
              <span className="pill">Was {formatBytes(file.size)}</span>
              <span className="pill">Now {formatBytes(output.blob.size)}</span>
              {maxBytes ? (
                <span className="pill">{output.blob.size <= maxBytes ? 'Under target' : 'Over target'}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {output ? <SendTo from="media" files={[new File([output.blob], output.name, { type: output.blob.type })]} /> : null}
    </ToolLayout>
  )
}
