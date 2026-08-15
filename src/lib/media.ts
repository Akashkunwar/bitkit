/**
 * Video work here is re-encode-by-playback: draw the source into a canvas,
 * capture that canvas as a stream, and record it. It costs real time (roughly
 * the clip's duration) but needs no multi-megabyte ffmpeg build, runs on every
 * modern browser, and never sends a frame anywhere.
 */

export type MediaKind = 'video' | 'audio'

export type MediaInfo = {
  kind: MediaKind
  duration: number
  width: number
  height: number
  hasAudio: boolean
}

/** Container/codec combinations, best first. Safari only does mp4. */
const VIDEO_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

const AUDIO_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']

export function pickMimeType(kind: MediaKind, prefer?: string): string {
  const list = kind === 'audio' ? AUDIO_TYPES : VIDEO_TYPES
  const ordered = prefer ? [prefer, ...list] : list
  for (const type of ordered) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export function extensionFor(mime: string): string {
  if (mime.includes('mp4')) return mime.startsWith('audio') ? 'm4a' : 'mp4'
  if (mime.includes('ogg')) return 'ogg'
  return mime.startsWith('audio') ? 'weba' : 'webm'
}

export function probeMedia(file: File): Promise<MediaInfo> {
  const kind: MediaKind = file.type.startsWith('audio/') ? 'audio' : 'video'
  const url = URL.createObjectURL(file)
  const el = document.createElement(kind === 'audio' ? 'audio' : 'video')
  el.preload = 'metadata'

  return new Promise<MediaInfo>((resolve, reject) => {
    const done = (info: MediaInfo) => {
      URL.revokeObjectURL(url)
      resolve(info)
    }
    el.onloadedmetadata = () => {
      const video = el as HTMLVideoElement
      done({
        kind,
        duration: Number.isFinite(el.duration) ? el.duration : 0,
        width: kind === 'video' ? video.videoWidth : 0,
        height: kind === 'video' ? video.videoHeight : 0,
        // No portable metadata flag exists, so assume audio unless proven otherwise.
        hasAudio: true,
      })
    }
    el.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This browser cannot decode that file.'))
    }
    el.src = url
  })
}

export type TrimOptions = {
  start: number
  end: number
  /** Longest edge of the output. 0 keeps the source size. */
  maxEdge?: number
  videoBitsPerSecond?: number
  audioBitsPerSecond?: number
  mute?: boolean
  audioOnly?: boolean
  mimeType?: string
}

export type TrimResult = { blob: Blob; mime: string; durationSec: number }

function scaledSize(width: number, height: number, maxEdge?: number): { width: number; height: number } {
  if (!maxEdge || Math.max(width, height) <= maxEdge) {
    // Encoders reject odd dimensions in several H.264 profiles.
    return { width: width - (width % 2), height: height - (height % 2) }
  }
  const scale = maxEdge / Math.max(width, height)
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  return { width: w - (w % 2), height: h - (h % 2) }
}

export async function trimMedia(
  file: File,
  options: TrimOptions,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<TrimResult> {
  const url = URL.createObjectURL(file)
  const isAudioSource = file.type.startsWith('audio/')
  const wantAudioOnly = options.audioOnly || isAudioSource
  const media = document.createElement(isAudioSource ? 'audio' : 'video') as HTMLVideoElement
  media.src = url
  media.muted = true
  media.playsInline = true

  const cleanup: (() => void)[] = [() => URL.revokeObjectURL(url)]

  try {
    await new Promise<void>((resolve, reject) => {
      media.onloadedmetadata = () => resolve()
      media.onerror = () => reject(new Error('This browser cannot decode that file.'))
    })

    const start = Math.max(0, options.start)
    const end = Math.min(options.end || media.duration, media.duration)
    if (!(end > start)) throw new Error('The end point must come after the start point.')

    const tracks: MediaStreamTrack[] = []

    let draw: (() => void) | null = null
    let canvas: HTMLCanvasElement | null = null

    if (!wantAudioOnly) {
      const size = scaledSize(media.videoWidth, media.videoHeight, options.maxEdge)
      canvas = document.createElement('canvas')
      canvas.width = Math.max(2, size.width)
      canvas.height = Math.max(2, size.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is unavailable in this browser.')
      draw = () => ctx.drawImage(media, 0, 0, canvas!.width, canvas!.height)
      const canvasStream = canvas.captureStream(30)
      tracks.push(...canvasStream.getVideoTracks())
    }

    if (!options.mute) {
      // Route audio through Web Audio rather than the element's own output:
      // a muted element captures silence, and an unmuted one would blast the
      // clip through the speakers while it re-encodes. This does neither.
      const audioCtx = new AudioContext()
      cleanup.push(() => void audioCtx.close())
      const sourceNode = audioCtx.createMediaElementSource(media)
      const destination = audioCtx.createMediaStreamDestination()
      sourceNode.connect(destination)
      tracks.push(...destination.stream.getAudioTracks())
    }
    if (!tracks.length) throw new Error('Nothing to record — the clip has no usable track.')

    const mime = options.mimeType || pickMimeType(wantAudioOnly ? 'audio' : 'video')
    const stream = new MediaStream(tracks)
    const recorder = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      ...(options.videoBitsPerSecond ? { videoBitsPerSecond: options.videoBitsPerSecond } : {}),
      ...(options.audioBitsPerSecond ? { audioBitsPerSecond: options.audioBitsPerSecond } : {}),
    })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }

    // Web Audio owns the sound now, so the element itself stays silent-by-routing
    // rather than muted, which would starve the recorder.
    media.muted = false
    media.currentTime = start
    await new Promise<void>((resolve) => {
      const onSeek = () => resolve()
      media.addEventListener('seeked', onSeek, { once: true })
    })

    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mime || 'video/webm' }))
    })

    let raf = 0
    const step = () => {
      draw?.()
      const done = media.currentTime >= end || media.ended
      onProgress?.(Math.min(1, (media.currentTime - start) / (end - start)))
      if (done || signal?.aborted) {
        if (recorder.state !== 'inactive') recorder.stop()
        media.pause()
        return
      }
      raf = requestAnimationFrame(step)
    }
    cleanup.push(() => cancelAnimationFrame(raf))

    recorder.start(250)
    await media.play()
    raf = requestAnimationFrame(step)

    const blob = await finished
    if (signal?.aborted) throw new Error('Cancelled.')
    onProgress?.(1)
    return { blob, mime: recorder.mimeType || mime, durationSec: end - start }
  } finally {
    media.pause()
    media.removeAttribute('src')
    media.load()
    for (const fn of cleanup) fn()
  }
}

/** Bitrate that lands a clip of this length near a byte budget, with headroom. */
export function bitrateForTarget(maxBytes: number, seconds: number, audioBps = 96_000): number {
  if (!seconds) return 1_000_000
  const totalBits = maxBytes * 8 * 0.92
  const videoBits = totalBits - audioBps * seconds
  return Math.max(120_000, Math.round(videoBits / seconds))
}

export function captureFrame(video: HTMLVideoElement, maxEdge = 0): Promise<Blob> {
  const size = scaledSize(video.videoWidth, video.videoHeight, maxEdge || undefined)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, size.width)
  canvas.height = Math.max(1, size.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas is unavailable.'))
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Frame export failed.'))), 'image/png')
  })
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
