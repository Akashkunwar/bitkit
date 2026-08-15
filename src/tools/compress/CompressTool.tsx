import { useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { DownloadButton } from '../../components/DownloadButton'
import { Segmented } from '../../components/Segmented'
import { type EncodeMime } from '../../lib/image/compress'
import { compressInWorker } from '../../lib/image/workerClient'
import { FORM_PRESETS, type FitMode } from '../../lib/image/size'
import { formatBytes, parseByteLimit, applyFilenamePattern, mimeToExt } from '../../lib/format'
import { triggerDownload } from '../../lib/download'
import { filesFromPaste } from '../../lib/clipboard'
import { useHandoff } from '../../lib/useHandoff'
import { SendTo } from '../../components/SendTo'
import { filesFromBlobs } from '../../lib/handoff'

type Item = {
  id: string
  file: File
  url: string
  width?: number
  height?: number
  result?: { blob: Blob; width: number; height: number; withinLimit: boolean; url: string }
  error?: string
  busy?: boolean
}

export default function CompressTool() {
  const [items, setItems] = useState<Item[]>([])
  const [fit, setFit] = useState<FitMode>('contain')
  const [mime, setMime] = useState<EncodeMime>('image/jpeg')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [maxBytesInput, setMaxBytesInput] = useState('450kb')
  const [preset, setPreset] = useState('450kb-free')

  const maxBytes = parseByteLimit(maxBytesInput)

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void filesFromPaste(event).then((files) => {
        if (files.length) addFiles(files)
      })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const addFiles = (files: File[]) => {
    const next = files
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      }))
    setItems((prev) => [...prev, ...next])
  }

  useHandoff((payload) => {
    if (payload.files?.length) addFiles(payload.files)
  })

  const applyPreset = (id: string) => {
    setPreset(id)
    const found = FORM_PRESETS.find((p) => p.id === id)
    if (!found) return
    setWidth(found.width ? String(found.width) : '')
    setHeight(found.height ? String(found.height) : '')
    if (found.fit) setFit(found.fit)
    if (found.maxBytes) setMaxBytesInput(`${Math.round(found.maxBytes / 1024)}kb`)
    else setMaxBytesInput('')
  }

  const run = async () => {
    const w = width ? Number(width) : undefined
    const h = height ? Number(height) : undefined
    setItems((prev) => prev.map((item) => ({ ...item, busy: true, error: undefined })))
    const updated: Item[] = []
    for (const item of items) {
      try {
        const result = await compressInWorker(item.file, {
          width: w,
          height: h,
          fit,
          mime,
          maxBytes,
          background: mime === 'image/jpeg' ? '#ffffff' : undefined,
        })
        if (item.result) URL.revokeObjectURL(item.result.url)
        updated.push({
          ...item,
          busy: false,
          result: { ...result, url: URL.createObjectURL(result.blob) },
        })
      } catch (err) {
        updated.push({
          ...item,
          busy: false,
          error: err instanceof Error ? err.message : 'Compression failed.',
        })
      }
    }
    setItems(updated)
  }

  const jpegWarning = mime === 'image/jpeg'
  const anyOver = items.some((item) => item.result && !item.result.withinLimit)

  const summary = useMemo(
    () => items.filter((item) => item.result).length,
    [items],
  )

  return (
    <ToolLayout
      title="Resize & compress"
      lede="Match portal limits: pixels, kilobytes, or both. Encoding happens on this device."
    >
      <DropZone multiple onFiles={addFiles} hint="Batch supported. Huge files may fail on phones because of memory limits." />

      <div className="split">
        <section className="panel">
          <label className="field">
            <span>Preset</span>
            <select value={preset} onChange={(event) => applyPreset(event.target.value)}>
              {FORM_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Width px</span>
              <input value={width} onChange={(event) => setWidth(event.target.value)} inputMode="numeric" />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Height px</span>
              <input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="numeric" />
            </label>
          </div>
          <Segmented
            label="Fit"
            value={fit}
            options={[
              { value: 'contain', label: 'Contain' },
              { value: 'cover', label: 'Cover / crop' },
              { value: 'stretch', label: 'Stretch' },
            ]}
            onChange={setFit}
          />
          <Segmented
            label="Output"
            value={mime}
            options={[
              { value: 'image/jpeg', label: 'JPEG' },
              { value: 'image/webp', label: 'WebP' },
              { value: 'image/png', label: 'PNG' },
            ]}
            onChange={setMime}
          />
          <label className="field">
            <span>Max file size</span>
            <input
              value={maxBytesInput}
              onChange={(event) => {
                setMaxBytesInput(event.target.value)
                setPreset('custom')
              }}
              placeholder="450kb"
            />
          </label>
          {jpegWarning ? (
            <p className="banner warn">JPEG has no transparency. Transparent areas become white.</p>
          ) : null}
          {mime === 'image/png' && maxBytes ? (
            <p className="banner warn">PNG is lossless. A byte cap may require shrinking the pixel size instead of quality.</p>
          ) : null}
          <div className="row">
            <DownloadButton label="Convert" disabled={!items.length} onClick={() => void run()} />
            <button type="button" className="btn" disabled={!summary} onClick={() => {
              items.forEach((item, index) => {
                if (!item.result) return
                triggerDownload(
                  item.result.blob,
                  applyFilenamePattern('{original}', {
                    original: item.file.name,
                    ext: mimeToExt(mime),
                    index: index + 1,
                  }),
                )
              })
            }}>
              Download all
            </button>
          </div>
          {anyOver ? (
            <p className="status-bad">
              At least one file is still over the limit after quality and size reduction. Try a smaller
              dimension or a lossy format.
            </p>
          ) : null}
          <SendTo
            from="compress"
            files={
              items.some((item) => item.result)
                ? filesFromBlobs(
                    items.flatMap((item) =>
                      item.result
                        ? [{ blob: item.result.blob, name: item.file.name.replace(/\.[^.]+$/, '') + '.' + mimeToExt(mime) }]
                        : [],
                    ),
                  )
                : items.map((item) => item.file)
            }
          />
        </section>
        <aside className="panel">
          {!items.length ? <p className="muted">Nothing queued yet.</p> : null}
          {items.map((item) => (
            <div key={item.id} style={{ marginBottom: '1rem' }}>
              <p>
                {item.file.name} · {formatBytes(item.file.size)}
                {item.busy ? ' · working…' : ''}
              </p>
              <div className="row">
                <div className="preview-frame" style={{ width: 120, height: 90 }}>
                  <img src={item.url} alt="" />
                </div>
                {item.result ? (
                  <div className="preview-frame" style={{ width: 120, height: 90 }}>
                    <img src={item.result.url} alt="" />
                  </div>
                ) : null}
              </div>
              {item.result ? (
                <p className={item.result.withinLimit ? 'status-ok' : 'status-bad'}>
                  {item.result.width}×{item.result.height} · {formatBytes(item.result.blob.size)}
                  {maxBytes ? ` / ${formatBytes(maxBytes)}` : ''}
                </p>
              ) : null}
              {item.error ? <p className="status-bad">{item.error}</p> : null}
            </div>
          ))}
        </aside>
      </div>
    </ToolLayout>
  )
}
