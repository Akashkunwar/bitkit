import { useEffect, useMemo, useRef, useState } from 'react'
import { Columns3, Download, Grid2x2, Rows3, Trash2, X } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { SortableGrid } from '../../components/SortableGrid'
import { triggerDownload } from '../../lib/download'
import { formatBytes } from '../../lib/format'
import { useHandoff } from '../../lib/useHandoff'
import { usePasteFiles } from '../../lib/usePasteFiles'
import { useToolSettings } from '../../lib/prefs'
import { decodeImage } from '../../lib/image/compress'
import { useImageList } from '../../lib/image/useImageList'
import { layoutCollage, type CellAspect, type CellFit, type CollageLayout } from '../../lib/collage'

const DEFAULTS = {
  layout: 'grid' as CollageLayout,
  columns: 0,
  aspect: 'square' as CellAspect,
  fit: 'cover' as CellFit,
  width: 2000,
  gap: 16,
  padding: 16,
  radius: 12,
  background: '#ffffff',
  format: 'jpeg' as 'jpeg' | 'png',
}

type Settings = typeof DEFAULTS
type Source = { width: number; height: number; image: CanvasImageSource }

function roundedClip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.clip()
}

/** Draws the collage at `scale` of its full size. Used for both preview and export. */
function paint(canvas: HTMLCanvasElement, sources: Source[], settings: Settings, scale: number): void {
  const layout = layoutCollage(sources, settings)
  canvas.width = Math.max(1, Math.round(layout.width * scale))
  canvas.height = Math.max(1, Math.round(layout.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)
  if (settings.format === 'png' && settings.background === 'transparent') {
    ctx.clearRect(0, 0, layout.width, layout.height)
  } else {
    ctx.fillStyle = settings.background === 'transparent' ? '#ffffff' : settings.background
    ctx.fillRect(0, 0, layout.width, layout.height)
  }
  ctx.imageSmoothingQuality = 'high'
  layout.placements.forEach((placement, i) => {
    const { draw, crop } = placement
    ctx.save()
    roundedClip(ctx, draw.x, draw.y, draw.width, draw.height, settings.radius)
    ctx.drawImage(sources[i].image, crop.x, crop.y, crop.width, crop.height, draw.x, draw.y, draw.width, draw.height)
    ctx.restore()
  })
}

export default function CollageTool() {
  const { items, add, remove, clear, move } = useImageList()
  const { settings, update } = useToolSettings('collage', DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [output, setOutput] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Full-resolution decodes, one per list item, released when the item goes.
  const sources = useRef(new Map<string, Source>())
  const pending = useRef(new Set<string>())
  const [decoded, setDecoded] = useState(0)

  useEffect(() => {
    const cache = sources.current
    return () => {
      for (const source of cache.values()) {
        if ('close' in source.image && typeof source.image.close === 'function') source.image.close()
      }
      cache.clear()
    }
  }, [])

  useEffect(() => {
    const ids = new Set(items.map((item) => item.id))
    for (const [id, source] of sources.current) {
      if (ids.has(id)) continue
      if ('close' in source.image && typeof source.image.close === 'function') source.image.close()
      sources.current.delete(id)
    }
    for (const item of items) {
      if (item.error || sources.current.has(item.id) || pending.current.has(item.id)) continue
      pending.current.add(item.id)
      void decodeImage(item.file)
        .then((image) => {
          const width = 'naturalWidth' in image && image.naturalWidth ? image.naturalWidth : image.width
          const height = 'naturalHeight' in image && image.naturalHeight ? image.naturalHeight : image.height
          sources.current.set(item.id, { width, height, image: image as CanvasImageSource })
          setDecoded((n) => n + 1)
        })
        .catch(() => undefined)
        .finally(() => pending.current.delete(item.id))
    }
  }, [items])

  const ordered = useMemo(
    () => items.map((item) => sources.current.get(item.id)).filter((s): s is Source => !!s),
    // `decoded` changes whenever a new source lands in the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, decoded],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !ordered.length) return
    paint(canvas, ordered, settings, Math.min(1, 900 / settings.width))
    setOutput(null)
  }, [ordered, settings])

  const addFiles = (files: File[]) => {
    const count = add(files)
    setError(count ? null : 'Those files are not images.')
  }
  useHandoff((payload) => {
    if (payload.files?.length) addFiles(payload.files)
  })
  usePasteFiles(addFiles)

  const exportCollage = async () => {
    if (!ordered.length) return
    setBusy(true)
    setError(null)
    try {
      const canvas = document.createElement('canvas')
      paint(canvas, ordered, settings, 1)
      const mime = settings.format === 'png' ? 'image/png' : 'image/jpeg'
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed.'))), mime, 0.92),
      )
      const file = new File([blob], `collage.${settings.format === 'png' ? 'png' : 'jpg'}`, { type: mime })
      setOutput(file)
      triggerDownload(file, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the collage.')
    } finally {
      setBusy(false)
    }
  }

  const size = ordered.length ? layoutCollage(ordered, settings) : null

  return (
    <ToolLayout
      title="Image collage"
      lede="Combine photos into a grid, a side-by-side strip, or a vertical stack — with spacing, rounded corners, and a background colour."
    >
      {!items.length ? (
        <DropZone
          multiple
          accept="image/*"
          label="Drop two or more images"
          hint="Screenshots for a before/after, product shots for a grid, or a photo strip."
          buttonLabel="Choose images"
          onFiles={addFiles}
        />
      ) : (
        <div className="split">
          <section className="panel">
            <div className="toolbar">
              <div className="toolbar-group">
                <strong>
                  {items.length} {items.length === 1 ? 'image' : 'images'}
                </strong>
                {size ? (
                  <span className="muted">
                    · {size.width} × {size.height}px
                  </span>
                ) : null}
              </div>
              <button type="button" className="btn btn-sm btn-danger" onClick={clear}>
                <Trash2 size={15} aria-hidden="true" />
                Clear
              </button>
            </div>
            <div className="preview-frame collage-stage">
              {ordered.length ? (
                <canvas ref={canvasRef} role="img" aria-label="Collage preview" />
              ) : (
                <span className="spinner" aria-label="Loading images" />
              )}
            </div>

            <h2 className="collage-order-title">Order</h2>
            <SortableGrid
              ariaLabel="Collage order"
              items={items}
              getKey={(item) => item.id}
              getLabel={(item) => item.name}
              onMove={move}
              renderMedia={(item) => (item.thumbUrl ? <img src={item.thumbUrl} alt="" draggable={false} /> : null)}
              renderActions={(item) => (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(item.id)}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            />
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
            <Segmented
              label="Layout"
              value={settings.layout}
              onChange={(layout) => update({ layout })}
              block
              options={[
                {
                  value: 'grid',
                  label: (
                    <>
                      <Grid2x2 size={15} aria-hidden="true" /> Grid
                    </>
                  ),
                },
                {
                  value: 'row',
                  label: (
                    <>
                      <Columns3 size={15} aria-hidden="true" /> Side by side
                    </>
                  ),
                },
                {
                  value: 'column',
                  label: (
                    <>
                      <Rows3 size={15} aria-hidden="true" /> Stacked
                    </>
                  ),
                },
              ]}
            />
            {settings.layout === 'grid' ? (
              <>
                <div className="grid-2">
                  <label className="field">
                    <span>Columns</span>
                    <select value={settings.columns} onChange={(e) => update({ columns: Number(e.target.value) })}>
                      <option value={0}>Auto</option>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Cell shape</span>
                    <select value={settings.aspect} onChange={(e) => update({ aspect: e.target.value as CellAspect })}>
                      <option value="square">Square</option>
                      <option value="4:3">4 : 3</option>
                      <option value="3:4">3 : 4</option>
                      <option value="16:9">16 : 9</option>
                      <option value="9:16">9 : 16</option>
                      <option value="auto">Match photos</option>
                    </select>
                  </label>
                </div>
                <Segmented
                  label="Photos in cells"
                  value={settings.fit}
                  onChange={(fit) => update({ fit })}
                  block
                  options={[
                    { value: 'cover', label: 'Fill (crop)' },
                    { value: 'contain', label: 'Fit (whole photo)' },
                  ]}
                />
              </>
            ) : null}
            <label className="field">
              <span>Spacing · {settings.gap}px</span>
              <input
                type="range"
                min={0}
                max={80}
                value={settings.gap}
                onChange={(e) => update({ gap: Number(e.target.value), padding: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              <span>Corner radius · {settings.radius}px</span>
              <input
                type="range"
                min={0}
                max={80}
                value={settings.radius}
                onChange={(e) => update({ radius: Number(e.target.value) })}
              />
            </label>
            <div className="grid-2">
              <label className="field">
                <span>Background</span>
                <input
                  type="color"
                  value={settings.background === 'transparent' ? '#ffffff' : settings.background}
                  onChange={(e) => update({ background: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Width (px)</span>
                <select value={settings.width} onChange={(e) => update({ width: Number(e.target.value) })}>
                  {[1080, 1600, 2000, 3000, 4000].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Segmented
              label="Save as"
              value={settings.format}
              onChange={(format) => update({ format })}
              block
              options={[
                { value: 'jpeg', label: 'JPG' },
                { value: 'png', label: 'PNG' },
              ]}
            />
            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={!ordered.length || busy}
              onClick={() => void exportCollage()}
            >
              {busy ? <span className="spinner" aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
              {busy ? 'Rendering…' : 'Download collage'}
            </button>
            {error ? (
              <p className="status-bad" role="alert">
                {error}
              </p>
            ) : null}
            {output ? (
              <p className="hint">
                {output.name} · {formatBytes(output.size)}
              </p>
            ) : null}
            <SendTo from="collage" files={output ? [output] : []} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
