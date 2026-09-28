import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Download, FileArchive, Trash2, X } from 'lucide-react'
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
import { useImageList, type ImageItem } from '../../lib/image/useImageList'
import { FORMATS, canEncode, renameFor, transformImage, type OutputFormat } from '../../lib/image/transform'

type Resize = 'keep' | '75' | '50' | '25' | 'max'

const DEFAULTS = {
  format: 'jpeg' as OutputFormat,
  quality: 0.88,
  resize: 'keep' as Resize,
  maxSide: 1920,
  background: '#ffffff',
}

type Converted = { id: string; file: File }

function sourceLabel(item: ImageItem): string {
  const ext = item.name.split('.').pop()?.toUpperCase()
  const fromType = item.file.type.replace('image/', '').replace('svg+xml', 'svg').toUpperCase()
  return fromType || ext || 'Image'
}

export default function ImageConvertTool() {
  const { items, add, remove, clear } = useImageList()
  const { settings, update } = useToolSettings('image-convert', DEFAULTS)
  const [supported, setSupported] = useState<Record<OutputFormat, boolean>>({
    png: true,
    jpeg: true,
    webp: true,
    avif: false,
    bmp: true,
  })
  const [converted, setConverted] = useState<Converted[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([canEncode('webp'), canEncode('avif')]).then(([webp, avif]) =>
      setSupported((current) => ({ ...current, webp, avif })),
    )
  }, [])

  const addFiles = (files: File[]) => {
    const count = add(files)
    setError(count ? null : 'Those files are not images.')
  }
  useHandoff((payload) => {
    if (payload.files?.length) addFiles(payload.files)
  })
  usePasteFiles(addFiles)

  // Any change to the settings makes earlier results stale.
  useEffect(() => {
    setConverted([])
  }, [settings.format, settings.quality, settings.resize, settings.maxSide, settings.background])

  const byId = useMemo(() => new Map(converted.map((c) => [c.id, c.file])), [converted])
  const info = FORMATS[settings.format]
  const ready = items.filter((item) => !item.error)

  const convertAll = async () => {
    if (!ready.length) return
    setBusy(true)
    setError(null)
    setProgress(0)
    const out: Converted[] = []
    try {
      for (let i = 0; i < ready.length; i += 1) {
        const item = ready[i]
        const blob = await transformImage(item.file, {
          format: settings.format,
          quality: settings.quality,
          scale: settings.resize === 'keep' || settings.resize === 'max' ? 1 : Number(settings.resize) / 100,
          maxSide: settings.resize === 'max' ? settings.maxSide : null,
          background: info.alpha ? null : settings.background,
        })
        out.push({ id: item.id, file: new File([blob], renameFor(item.name, settings.format), { type: blob.type }) })
        setProgress((i + 1) / ready.length)
      }
      setConverted(out)
      if (out.length === 1) triggerDownload(out[0].file, out[0].file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.')
    } finally {
      setBusy(false)
    }
  }

  const downloadZip = async () => {
    const entries = await Promise.all(
      converted.map(async ({ file }) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) })),
    )
    const zip = zipStore(entries)
    triggerDownload(
      new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
      `converted-${info.ext}.zip`,
    )
  }

  const before = ready.reduce((sum, item) => sum + item.size, 0)
  const after = converted.reduce((sum, c) => sum + c.file.size, 0)

  const formatOptions = (Object.keys(FORMATS) as OutputFormat[])
    .filter((f) => supported[f])
    .map((f) => ({ value: f, label: FORMATS[f].label }))

  return (
    <ToolLayout
      title="Image converter"
      lede="Convert between JPG, PNG, WebP, AVIF, and BMP in bulk — optionally resizing on the way. Conversion happens on this device."
    >
      {!items.length ? (
        <DropZone
          multiple
          accept="image/*"
          label="Drop images to convert"
          hint="PNG, JPG, WebP, GIF, BMP, SVG, AVIF, ICO — anything this browser can open. HEIC opens in Safari."
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
                <span className="muted">· {formatBytes(before)}</span>
              </div>
              <div className="toolbar-group">
                {converted.length > 1 ? (
                  <button type="button" className="btn btn-sm" onClick={() => void downloadZip()}>
                    <FileArchive size={15} aria-hidden="true" />
                    Download ZIP
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    clear()
                    setConverted([])
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Clear
                </button>
              </div>
            </div>

            <ul className="file-list">
              {items.map((item) => {
                const result = byId.get(item.id)
                return (
                  <li key={item.id} className="file-row">
                    <span className="file-thumb">{item.thumbUrl ? <img src={item.thumbUrl} alt="" /> : null}</span>
                    <span className="file-row-name" title={item.name}>
                      {item.name}
                      <span className="file-row-meta">
                        {sourceLabel(item)} · {formatBytes(item.size)}
                        {item.width ? ` · ${item.width}×${item.height}` : ''}
                      </span>
                    </span>
                    {item.error ? (
                      <span className="status-bad file-row-meta">{item.error}</span>
                    ) : result ? (
                      <>
                        <span className="file-row-meta">
                          <ArrowRight size={13} aria-hidden="true" /> {FORMATS[settings.format].label} ·{' '}
                          {formatBytes(result.size)}
                        </span>
                        <button
                          type="button"
                          className="icon-btn icon-btn-sm"
                          aria-label={`Download ${result.name}`}
                          title="Download"
                          onClick={() => triggerDownload(result, result.name)}
                        >
                          <Download size={15} aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm btn-ghost"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => remove(item.id)}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>

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
              label="Convert to"
              value={settings.format}
              onChange={(format) => update({ format })}
              block
              options={formatOptions}
            />
            {info.lossy ? (
              <label className="field">
                <span>Quality · {Math.round(settings.quality * 100)}%</span>
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.01}
                  value={settings.quality}
                  onChange={(e) => update({ quality: Number(e.target.value) })}
                />
              </label>
            ) : null}
            {!info.alpha ? (
              <label className="field">
                <span>Fill transparent areas with</span>
                <input
                  type="color"
                  value={settings.background}
                  onChange={(e) => update({ background: e.target.value })}
                />
              </label>
            ) : null}
            <label className="field">
              <span>Size</span>
              <select value={settings.resize} onChange={(e) => update({ resize: e.target.value as Resize })}>
                <option value="keep">Keep original size</option>
                <option value="75">75%</option>
                <option value="50">50%</option>
                <option value="25">25%</option>
                <option value="max">Fit within a maximum side…</option>
              </select>
            </label>
            {settings.resize === 'max' ? (
              <label className="field">
                <span>Longest side (px)</span>
                <input
                  type="number"
                  min={16}
                  max={8192}
                  value={settings.maxSide}
                  onChange={(e) => update({ maxSide: Math.max(16, Number(e.target.value) || 16) })}
                />
              </label>
            ) : null}

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={!ready.length || busy}
              onClick={() => void convertAll()}
            >
              {busy ? <span className="spinner" aria-hidden="true" /> : null}
              {busy ? `Converting… ${Math.round(progress * 100)}%` : `Convert ${ready.length} to ${info.label}`}
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
            {converted.length ? (
              <div className="result-card">
                <div>
                  <strong>{converted.length} converted</strong>
                  <span>
                    {formatBytes(before)} → {formatBytes(after)}
                  </span>
                </div>
                {converted.length > 1 ? (
                  <button type="button" className="btn btn-sm" onClick={() => void downloadZip()}>
                    <FileArchive size={15} aria-hidden="true" />
                    Download all as ZIP
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => triggerDownload(converted[0].file, converted[0].file.name)}
                  >
                    <Download size={15} aria-hidden="true" />
                    Download again
                  </button>
                )}
              </div>
            ) : null}
            <p className="hint">
              Converting re-encodes pixels, so EXIF data such as camera and GPS location is dropped.
            </p>
            <SendTo from="image-convert" files={converted.map((c) => c.file)} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
