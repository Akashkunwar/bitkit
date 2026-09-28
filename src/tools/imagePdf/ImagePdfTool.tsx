import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Download, FileDown, ImagePlus, Move, RotateCcw, RotateCw, Trash2, X } from 'lucide-react'
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
import { imagesToPdf } from '../../lib/imagePdf'
import { useImageList, type ImageItem, type SortMode } from '../../lib/image/useImageList'
import {
  MARGINS,
  PAGE_SIZE_LABELS,
  pageFor,
  placeImage,
  rotatedSize,
  type ImageFit,
  type Margin,
  type Orientation,
  type PageSize,
} from '../../lib/pageLayout'

type Quality = 'small' | 'balanced' | 'best' | 'original'

const QUALITY: Record<Quality, { dpi: number | null; jpeg: number; label: string }> = {
  small: { dpi: 150, jpeg: 0.75, label: 'Smaller' },
  balanced: { dpi: 220, jpeg: 0.85, label: 'Balanced' },
  best: { dpi: 300, jpeg: 0.92, label: 'High' },
  original: { dpi: null, jpeg: 0.95, label: 'Original' },
}

const DEFAULTS = {
  pageSize: 'a4' as PageSize,
  orientation: 'auto' as Orientation,
  fit: 'contain' as ImageFit,
  margin: 'small' as Margin,
  background: '#ffffff',
  quality: 'balanced' as Quality,
}

type Result = { file: File; url: string }

/** A to-scale sketch of the first page with the current settings applied. */
function PagePreview({ item, settings }: { item: ImageItem; settings: typeof DEFAULTS }) {
  if (!item.width || !item.thumbUrl) return null
  const rotated = rotatedSize(item.width, item.height, item.rotation)
  const margin = MARGINS[settings.margin]
  const page = pageFor(rotated.width, rotated.height, settings.pageSize, settings.orientation, margin)
  const { dest } = placeImage(rotated.width, rotated.height, page.width, page.height, margin, settings.fit)
  const pct = (value: number, total: number) => `${(value / total) * 100}%`
  return (
    <figure className="page-preview">
      <div
        className="page-preview-sheet"
        style={{ aspectRatio: `${page.width} / ${page.height}`, background: settings.background }}
      >
        <img
          src={item.thumbUrl}
          alt=""
          style={{
            left: pct(dest.x, page.width),
            // PDF y runs up from the bottom; CSS top runs down.
            top: pct(page.height - dest.y - dest.height, page.height),
            width: pct(dest.width, page.width),
            height: pct(dest.height, page.height),
            objectFit: settings.fit === 'cover' ? 'cover' : 'fill',
          }}
        />
      </div>
      <figcaption>
        Page 1 · {Math.round((page.width / 72) * 25.4)} × {Math.round((page.height / 72) * 25.4)} mm
      </figcaption>
    </figure>
  )
}

export default function ImagePdfTool() {
  const list = useImageList()
  const { items, add, remove, clear, move, sort, reverse, rotate, rotateAll } = list
  const { settings, update } = useToolSettings('image-pdf', DEFAULTS)
  const [name, setName] = useState('images')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const ready = items.filter((item) => !item.error)
  const totalSize = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items])

  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url)
    },
    [result],
  )

  const addFiles = (files: File[]) => {
    const added = add(files)
    if (!added) setError('Those files are not images. Drop JPG, PNG, WebP, GIF, BMP, or AVIF.')
    else setError(null)
    setResult(null)
    if (items.length === 0 && files[0]?.name) setName(files[0].name.replace(/\.[^.]+$/, '') || 'images')
  }

  useHandoff((payload) => {
    if (payload.files?.length) addFiles(payload.files)
  })
  usePasteFiles(addFiles)

  const build = async () => {
    if (!ready.length) return
    setBusy(true)
    setError(null)
    setProgress(0)
    try {
      const quality = QUALITY[settings.quality]
      const bytes = await imagesToPdf(
        ready.map((item) => ({ file: item.file, rotation: item.rotation })),
        {
          pageSize: settings.pageSize,
          orientation: settings.orientation,
          fit: settings.fit,
          margin: settings.margin,
          background: settings.background,
          dpi: quality.dpi,
          quality: quality.jpeg,
          title: name,
          onProgress: (done, total) => setProgress(done / total),
        },
      )
      const filename = `${name.trim() || 'images'}.pdf`
      const file = new File([bytes.slice().buffer as ArrayBuffer], filename, { type: 'application/pdf' })
      setResult({ file, url: URL.createObjectURL(file) })
      triggerDownload(file, filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the PDF.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Images to PDF"
      lede="Turn photos, scans, and screenshots into one PDF. Drag to reorder, rotate any page, then pick the page size and margins. Nothing is uploaded."
    >
      {!items.length ? (
        <DropZone
          multiple
          accept="image/*,.heic,.heif,.avif"
          label="Drop images here, or paste from the clipboard"
          hint="JPG, PNG, WebP, GIF, BMP, or AVIF — add as many as you like. You can reorder them next."
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
                <span className="muted">· {formatBytes(totalSize)}</span>
              </div>
              <div className="toolbar-group">
                <label className="visually-hidden" htmlFor="img-pdf-sort">
                  Sort images
                </label>
                <select
                  id="img-pdf-sort"
                  className="select-inline"
                  value=""
                  onChange={(event) => {
                    if (event.target.value) sort(event.target.value as SortMode)
                  }}
                >
                  <option value="">Sort…</option>
                  <option value="name-asc">Name A → Z</option>
                  <option value="name-desc">Name Z → A</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="date-desc">Newest first</option>
                </select>
                <button type="button" className="btn btn-sm" onClick={reverse} title="Reverse the order">
                  <ArrowUpDown size={15} aria-hidden="true" />
                  Reverse
                </button>
                <button type="button" className="btn btn-sm" onClick={() => rotateAll(90)} title="Rotate every image">
                  <RotateCw size={15} aria-hidden="true" />
                  Rotate all
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={clear}>
                  <Trash2 size={15} aria-hidden="true" />
                  Clear
                </button>
              </div>
            </div>

            <SortableGrid
              ariaLabel="Pages, in order"
              items={items}
              getKey={(item) => item.id}
              getLabel={(item) => item.name}
              onMove={(from, to) => {
                move(from, to)
                setResult(null)
              }}
              cardProps={(item) => ({ 'data-excluded': Boolean(item.error) })}
              renderMedia={(item) =>
                item.error ? (
                  <p className="hint" style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                    {item.error}
                  </p>
                ) : item.thumbUrl ? (
                  <img src={item.thumbUrl} alt="" draggable={false} />
                ) : (
                  <span className="spinner" aria-label="Loading preview" />
                )
              }
              renderActions={(item) => (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Rotate ${item.name} left`}
                    title="Rotate left"
                    onClick={() => rotate(item.id, -90)}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Rotate ${item.name} right`}
                    title="Rotate right"
                    onClick={() => rotate(item.id, 90)}
                  >
                    <RotateCw size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove ${item.name}`}
                    title="Remove"
                    onClick={() => remove(item.id)}
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </>
              )}
            />

            <p className="hint" style={{ marginTop: '0.9rem' }}>
              Drag a picture to move it, pick a new number from its badge, or focus a card and press Alt + arrow keys.
            </p>

            <div style={{ marginTop: '1rem' }}>
              <DropZone
                compact
                multiple
                accept="image/*,.heic,.heif,.avif"
                label="Add more images"
                buttonLabel="Add images"
                onFiles={addFiles}
              />
            </div>
          </section>

          <aside className="panel">
            <div className="panel-title">
              <h2>Page setup</h2>
            </div>

            {ready[0] ? <PagePreview item={ready[0]} settings={settings} /> : null}

            <label className="field">
              <span>Page size</span>
              <select value={settings.pageSize} onChange={(e) => update({ pageSize: e.target.value as PageSize })}>
                {(Object.keys(PAGE_SIZE_LABELS) as PageSize[]).map((size) => (
                  <option key={size} value={size}>
                    {PAGE_SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
            </label>

            {settings.pageSize !== 'fit' ? (
              <>
                <Segmented
                  label="Orientation"
                  value={settings.orientation}
                  onChange={(orientation) => update({ orientation })}
                  block
                  options={[
                    { value: 'auto', label: 'Auto', title: 'Landscape pages for wide images' },
                    { value: 'portrait', label: 'Portrait' },
                    { value: 'landscape', label: 'Landscape' },
                  ]}
                />
                <Segmented
                  label="Image on page"
                  value={settings.fit}
                  onChange={(fit) => update({ fit })}
                  block
                  options={[
                    { value: 'contain', label: 'Fit', title: 'Whole image, letterboxed' },
                    { value: 'cover', label: 'Fill', title: 'Fill the page, cropping edges' },
                    { value: 'stretch', label: 'Stretch', title: 'Fill the page, distorting' },
                  ]}
                />
              </>
            ) : null}

            <Segmented
              label="Margin"
              value={settings.margin}
              onChange={(margin) => update({ margin })}
              block
              options={[
                { value: 'none', label: 'None' },
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ]}
            />

            <Segmented
              label="Quality"
              value={settings.quality}
              onChange={(quality) => update({ quality })}
              block
              options={(Object.keys(QUALITY) as Quality[]).map((q) => ({
                value: q,
                label: QUALITY[q].label,
                title: QUALITY[q].dpi ? `${QUALITY[q].dpi} dpi` : 'Every source pixel',
              }))}
            />

            <div className="grid-2">
              <label className="field">
                <span>Page colour</span>
                <input
                  type="color"
                  value={settings.background}
                  onChange={(e) => update({ background: e.target.value })}
                />
              </label>
              <label className="field">
                <span>File name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="images" />
              </label>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={!ready.length || busy}
              onClick={() => void build()}
            >
              {busy ? <span className="spinner" aria-hidden="true" /> : <FileDown size={18} aria-hidden="true" />}
              {busy ? `Building… ${Math.round(progress * 100)}%` : `Create PDF (${ready.length} pages)`}
            </button>
            {busy ? (
              <div className="progress" style={{ marginTop: '0.6rem' }}>
                <span style={{ width: `${progress * 100}%` }} />
              </div>
            ) : null}
            {error ? (
              <p className="status-bad" role="alert">
                {error}
              </p>
            ) : null}

            {result ? (
              <div className="result-card">
                <div>
                  <strong>{result.file.name}</strong>
                  <span>{formatBytes(result.file.size)}</span>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => triggerDownload(result.file, result.file.name)}
                  >
                    <Download size={15} aria-hidden="true" />
                    Download again
                  </button>
                  <a className="btn btn-sm" href={result.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              </div>
            ) : null}

            <SendTo from="image-pdf" files={result ? [result.file] : []} />
          </aside>
        </div>
      )}

      {!items.length ? (
        <div className="feature-strip">
          <div>
            <ImagePlus size={18} aria-hidden="true" />
            <span>Any number of images, in any format your browser can open.</span>
          </div>
          <div>
            <Move size={18} aria-hidden="true" />
            <span>Reorder by dragging, or pick a new position from the number badge.</span>
          </div>
          <div>
            <RotateCw size={18} aria-hidden="true" />
            <span>Rotate pages; phone photos are straightened automatically.</span>
          </div>
        </div>
      ) : null}
    </ToolLayout>
  )
}
