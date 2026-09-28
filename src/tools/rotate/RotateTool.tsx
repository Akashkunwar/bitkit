import { useEffect, useRef, useState } from 'react'
import { Download, FlipHorizontal2, FlipVertical2, RefreshCcw, RotateCcw, RotateCw, Trash2, X } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { formatBytes } from '../../lib/format'
import { useHandoff } from '../../lib/useHandoff'
import { usePasteFiles } from '../../lib/usePasteFiles'
import { useToolSettings } from '../../lib/prefs'
import { zipStore } from '../../lib/zip'
import { decodeImage } from '../../lib/image/compress'
import { useImageList, type ImageItem } from '../../lib/image/useImageList'
import {
  FORMATS,
  canEncode,
  drawTransformed,
  formatForMime,
  outputSize,
  renameFor,
  transformImage,
  type OutputFormat,
} from '../../lib/image/transform'

type Target = 'one' | 'all'
type Format = 'original' | OutputFormat

const DEFAULTS = {
  target: 'all' as Target,
  format: 'original' as Format,
  quality: 0.92,
  angleMode: 'expand' as 'expand' | 'crop',
}

function resolveFormat(item: ImageItem, format: Format): OutputFormat {
  if (format !== 'original') return format
  return formatForMime(item.file.type) ?? 'png'
}

/** Live, full-resolution-sourced preview of the active image with its transform. */
function Preview({ item, angle, angleMode }: { item: ImageItem; angle: number; angleMode: 'expand' | 'crop' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [source, setSource] = useState<{ id: string; bitmap: ImageBitmap | HTMLImageElement } | null>(null)

  useEffect(() => {
    let live = true
    let decoded: ImageBitmap | HTMLImageElement | null = null
    void decodeImage(item.file)
      .then((bitmap) => {
        decoded = bitmap
        if (live) setSource({ id: item.id, bitmap })
        else if ('close' in bitmap) bitmap.close()
      })
      .catch(() => undefined)
    return () => {
      live = false
      if (decoded && 'close' in decoded) decoded.close()
    }
  }, [item.id, item.file])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !source || source.id !== item.id) return
    const bitmap = source.bitmap
    const natural =
      'naturalWidth' in bitmap && bitmap.naturalWidth
        ? { width: bitmap.naturalWidth, height: bitmap.naturalHeight }
        : { width: bitmap.width, height: bitmap.height }
    const opts = { rotation: item.rotation, flipX: item.flipX, flipY: item.flipY, angle, angleMode }
    const out = outputSize(natural.width, natural.height, { ...opts, maxSide: 1100 })
    canvas.width = out.width
    canvas.height = out.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, out.width, out.height)
    drawTransformed(ctx, bitmap as CanvasImageSource, natural, out, opts)
  }, [source, item.id, item.rotation, item.flipX, item.flipY, angle, angleMode])

  return (
    <div className="preview-frame rotate-stage">
      <canvas ref={canvasRef} aria-label={`Preview of ${item.name}`} role="img" />
    </div>
  )
}

export default function RotateTool() {
  const { items, add, remove, clear, rotate, rotateAll, update, flipAll } = useImageList()
  const { settings, update: setSettings } = useToolSettings('rotate-flip', DEFAULTS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [angles, setAngles] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<File[]>([])
  const [supported, setSupported] = useState<Record<string, boolean>>({})

  useEffect(() => {
    void Promise.all((['webp', 'avif'] as OutputFormat[]).map(async (f) => [f, await canEncode(f)] as const)).then(
      (pairs) => setSupported(Object.fromEntries(pairs)),
    )
  }, [])

  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null
  const all = settings.target === 'all' || items.length === 1
  const angle = active ? (angles[active.id] ?? 0) : 0

  const addFiles = (files: File[]) => {
    const count = add(files)
    setError(count ? null : 'Those files are not images.')
    setOutputs([])
  }
  useHandoff((payload) => {
    if (payload.files?.length) addFiles(payload.files)
  })
  usePasteFiles(addFiles)

  const turn = (delta: 90 | -90 | 180) => {
    if (!active) return
    if (all) rotateAll(delta)
    else rotate(active.id, delta)
    setOutputs([])
  }

  const flip = (axis: 'x' | 'y') => {
    if (!active) return
    if (all) flipAll(axis)
    else update(active.id, axis === 'x' ? { flipX: !active.flipX } : { flipY: !active.flipY })
    setOutputs([])
  }

  const setAngle = (value: number) => {
    if (!active) return
    const clamped = Math.max(-45, Math.min(45, value))
    setAngles((current) => {
      if (!all) return { ...current, [active.id]: clamped }
      return Object.fromEntries(items.map((item) => [item.id, clamped]))
    })
    setOutputs([])
  }

  const resetAll = () => {
    for (const item of items) update(item.id, { rotation: 0, flipX: false, flipY: false })
    setAngles({})
    setOutputs([])
  }

  const exportImages = async (targets: ImageItem[]) => {
    const list = targets.filter((item) => !item.error)
    if (!list.length) return
    setBusy(true)
    setError(null)
    try {
      const files: File[] = []
      for (const item of list) {
        const format = resolveFormat(item, settings.format)
        const blob = await transformImage(item.file, {
          rotation: item.rotation,
          flipX: item.flipX,
          flipY: item.flipY,
          angle: angles[item.id] ?? 0,
          angleMode: settings.angleMode,
          format,
          quality: settings.quality,
        })
        files.push(new File([blob], renameFor(item.name, format, '-edited'), { type: blob.type }))
      }
      setOutputs(files)
      if (files.length === 1) triggerDownload(files[0], files[0].name)
      else {
        const entries = await Promise.all(
          files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) })),
        )
        const zip = zipStore(entries)
        triggerDownload(
          new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
          'rotated-images.zip',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the image.')
    } finally {
      setBusy(false)
    }
  }

  const formatOptions: { value: Format; label: string }[] = [
    { value: 'original', label: 'Same' },
    { value: 'png', label: 'PNG' },
    { value: 'jpeg', label: 'JPG' },
    ...(supported.webp ? [{ value: 'webp' as Format, label: 'WebP' }] : []),
  ]

  return (
    <ToolLayout
      title="Rotate & flip"
      lede="Turn images 90°, mirror them left-to-right or top-to-bottom, or straighten a tilted horizon — one image or a whole batch."
    >
      {!items.length || !active ? (
        <DropZone
          multiple
          accept="image/*"
          label="Drop images to rotate or flip"
          hint="One photo or a whole folder's worth. Everything stays on this device."
          buttonLabel="Choose images"
          onFiles={addFiles}
        />
      ) : (
        <div className="split">
          <section className="panel">
            <div className="toolbar">
              <div className="toolbar-group" style={{ minWidth: 0 }}>
                <strong className="thumb-name" style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>
                  {active.name}
                </strong>
                {active.width ? (
                  <span className="muted">
                    · {active.width} × {active.height}
                  </span>
                ) : null}
              </div>
              <div className="toolbar-group">
                <button type="button" className="btn btn-sm" onClick={resetAll}>
                  <RefreshCcw size={15} aria-hidden="true" />
                  Reset
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={clear}>
                  <Trash2 size={15} aria-hidden="true" />
                  Clear
                </button>
              </div>
            </div>

            <Preview item={active} angle={angle} angleMode={settings.angleMode} />

            {items.length > 1 ? (
              <ul className="thumb-strip" aria-label="Images">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="thumb-strip-item"
                      aria-pressed={item.id === active.id}
                      aria-label={`Edit ${item.name}`}
                      onClick={() => setActiveId(item.id)}
                    >
                      {item.thumbUrl ? <img src={item.thumbUrl} alt="" /> : <span className="spinner" />}
                    </button>
                    <button
                      type="button"
                      className="thumb-strip-remove"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => remove(item.id)}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div style={{ marginTop: '1rem' }}>
              <DropZone
                compact
                multiple
                accept="image/*"
                label="Add more images"
                buttonLabel="Add"
                onFiles={addFiles}
              />
            </div>
          </section>

          <aside className="panel">
            {items.length > 1 ? (
              <Segmented
                label="Apply changes to"
                value={settings.target}
                onChange={(target) => setSettings({ target })}
                block
                options={[
                  { value: 'all', label: `All ${items.length} images` },
                  { value: 'one', label: 'This image' },
                ]}
              />
            ) : null}

            <div className="field">
              <span>Rotate</span>
              <div className="grid-3">
                <button type="button" className="btn" onClick={() => turn(-90)}>
                  <RotateCcw size={16} aria-hidden="true" />
                  Left
                </button>
                <button type="button" className="btn" onClick={() => turn(90)}>
                  <RotateCw size={16} aria-hidden="true" />
                  Right
                </button>
                <button type="button" className="btn" onClick={() => turn(180)}>
                  180°
                </button>
              </div>
            </div>

            <div className="field">
              <span>Flip</span>
              <div className="grid-2">
                <button type="button" className="btn" aria-pressed={active.flipX} onClick={() => flip('x')}>
                  <FlipHorizontal2 size={16} aria-hidden="true" />
                  Mirror
                </button>
                <button type="button" className="btn" aria-pressed={active.flipY} onClick={() => flip('y')}>
                  <FlipVertical2 size={16} aria-hidden="true" />
                  Upside down
                </button>
              </div>
              <span className="hint">Mirror swaps left and right; upside down swaps top and bottom.</span>
            </div>

            <label className="field">
              <span>
                Straighten · {angle > 0 ? '+' : ''}
                {angle.toFixed(1)}°
              </span>
              <input
                type="range"
                min={-45}
                max={45}
                step={0.5}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                onDoubleClick={() => setAngle(0)}
              />
            </label>
            {angle ? (
              <Segmented
                label="Corners"
                value={settings.angleMode}
                onChange={(angleMode) => setSettings({ angleMode })}
                block
                options={[
                  { value: 'expand', label: 'Keep whole image', title: 'Grow the canvas; corners are transparent' },
                  { value: 'crop', label: 'Crop to fill', title: 'Trim so no empty corners show' },
                ]}
              />
            ) : null}

            <Segmented
              label="Save as"
              value={settings.format}
              onChange={(format) => setSettings({ format })}
              block
              options={formatOptions}
            />
            {settings.format === 'jpeg' ||
            settings.format === 'webp' ||
            (settings.format === 'original' && FORMATS[resolveFormat(active, 'original')].lossy) ? (
              <label className="field">
                <span>Quality · {Math.round(settings.quality * 100)}%</span>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={settings.quality}
                  onChange={(e) => setSettings({ quality: Number(e.target.value) })}
                />
              </label>
            ) : null}

            <div className="stack">
              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                disabled={busy}
                onClick={() => void exportImages(items.length > 1 && all ? items : [active])}
              >
                {busy ? <span className="spinner" aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
                {busy ? 'Saving…' : items.length > 1 && all ? `Download all ${items.length} (ZIP)` : 'Download image'}
              </button>
              {items.length > 1 && all ? (
                <button
                  type="button"
                  className="btn btn-block"
                  disabled={busy}
                  onClick={() => void exportImages([active])}
                >
                  Download only this image
                </button>
              ) : null}
            </div>
            {error ? (
              <p className="status-bad" role="alert">
                {error}
              </p>
            ) : null}
            {outputs.length ? (
              <p className="hint">
                Saved {outputs.length} {outputs.length === 1 ? 'image' : 'images'} ·{' '}
                {formatBytes(outputs.reduce((sum, f) => sum + f.size, 0))}. Metadata such as GPS is not copied.
              </p>
            ) : null}
            <SendTo from="rotate-flip" files={outputs} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
