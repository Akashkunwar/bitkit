import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { DownloadButton } from '../../components/DownloadButton'
import { Segmented } from '../../components/Segmented'
import { decodeImage } from '../../lib/image/compress'
import { renderFinished, MARKETING_PRESETS, type ColorAdjust } from '../../lib/image/filters'
import { applyFilenamePattern, mimeToExt } from '../../lib/format'
import { triggerDownload } from '../../lib/download'
import { filesFromPaste } from '../../lib/clipboard'
import { useHandoff } from '../../lib/useHandoff'
import { SendTo } from '../../components/SendTo'

type Crop = { x: number; y: number; w: number; h: number }

export default function FinishTool() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  const [crop, setCrop] = useState<Crop | null>(null)
  const [rotate, setRotate] = useState<0 | 90 | 180 | 270>(0)
  const [adjust, setAdjust] = useState<ColorAdjust>({ brightness: 1, contrast: 1, saturation: 1 })
  const [overlayText, setOverlayText] = useState('')
  const [background, setBackground] = useState('#ffffff')
  const [mime, setMime] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg')
  const [preset, setPreset] = useState('original')
  const [busy, setBusy] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void filesFromPaste(event).then((files) => {
        if (files[0]) void load(files[0])
      })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const load = async (next: File) => {
    if (url) URL.revokeObjectURL(url)
    const decoded = await decodeImage(next)
    const width = 'naturalWidth' in decoded && decoded.naturalWidth ? decoded.naturalWidth : decoded.width
    const height = 'naturalHeight' in decoded && decoded.naturalHeight ? decoded.naturalHeight : decoded.height
    if ('close' in decoded) decoded.close()
    setFile(next)
    setUrl(URL.createObjectURL(next))
    setNatural({ width, height })
    setCrop({ x: 0, y: 0, w: width, h: height })
  }

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) void load(image)
  })

  const exportImage = async () => {
    if (!file || !imgRef.current || !crop) return
    setBusy(true)
    try {
      const chosen = MARKETING_PRESETS.find((item) => item.id === preset)
      let blob = await renderFinished({
        source: imgRef.current,
        width: natural.width,
        height: natural.height,
        crop,
        rotate,
        adjust,
        overlayText,
        background,
        mime,
      })
      if (chosen && chosen.width && chosen.height) {
        const { compressImage } = await import('../../lib/image/compress')
        const sized = await compressImage(blob, {
          width: chosen.width,
          height: chosen.height,
          fit: 'cover',
          mime,
        })
        blob = sized.blob
      }
      triggerDownload(
        blob,
        applyFilenamePattern('{original}-edit', { original: file.name, ext: mimeToExt(mime) }),
      )
    } finally {
      setBusy(false)
    }
  }

  const toSource = (clientX: number, clientY: number) => {
    const img = imgRef.current
    if (!img) return { x: 0, y: 0 }
    const rect = img.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * natural.width
    const y = ((clientY - rect.top) / rect.height) * natural.height
    return {
      x: Math.min(natural.width, Math.max(0, x)),
      y: Math.min(natural.height, Math.max(0, y)),
    }
  }

  const cropStyle = () => {
    const img = imgRef.current
    if (!img || !crop) return undefined
    const rect = img.getBoundingClientRect()
    const scaleX = rect.width / natural.width
    const scaleY = rect.height / natural.height
    return {
      left: crop.x * scaleX,
      top: crop.y * scaleY,
      width: crop.w * scaleX,
      height: crop.h * scaleY,
    }
  }

  return (
    <ToolLayout
      title="Image finishing"
      lede="Crop, color, rotate, overlay, and export. This does not remove AI watermarks or provenance signals, and it will not make a generated image “undetectable.”"
    >
      <p className="banner">
        SynthID and similar marks live in the pixels. Ordinary edits are not a removal tool. Label AI-assisted
        marketing assets when that is the honest description.
      </p>
      <DropZone onFiles={(files) => files[0] && void load(files[0])} />
      <div className="split">
        <section className="panel">
          {url ? (
            <div
              className="crop-stage"
              onMouseDown={(event) => {
                const start = toSource(event.clientX, event.clientY)
                drag.current = start
                setCrop({ x: start.x, y: start.y, w: 1, h: 1 })
              }}
              onMouseMove={(event) => {
                if (!drag.current) return
                const now = toSource(event.clientX, event.clientY)
                const x = Math.min(drag.current.x, now.x)
                const y = Math.min(drag.current.y, now.y)
                setCrop({
                  x,
                  y,
                  w: Math.abs(now.x - drag.current.x),
                  h: Math.abs(now.y - drag.current.y),
                })
              }}
              onMouseUp={() => {
                drag.current = null
              }}
            >
              <img
                ref={imgRef}
                src={url}
                alt="Working image"
                style={{
                  filter: `brightness(${adjust.brightness}) contrast(${adjust.contrast}) saturate(${adjust.saturation})`,
                  transform: `rotate(${rotate}deg)`,
                }}
              />
              {crop ? <div className="crop-box" style={cropStyle()} /> : null}
            </div>
          ) : (
            <p className="muted">Upload or paste an image, then drag on the preview to crop.</p>
          )}
        </section>
        <aside className="panel">
          <div className="row">
            <button type="button" className="btn" onClick={() => setRotate((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)}>
              Rotate 90°
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setCrop({ x: 0, y: 0, w: natural.width, h: natural.height })}
            >
              Reset crop
            </button>
          </div>
          <label className="field">
            <span>Brightness {adjust.brightness.toFixed(2)}</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.01}
              value={adjust.brightness}
              onChange={(event) => setAdjust((a) => ({ ...a, brightness: Number(event.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Contrast {adjust.contrast.toFixed(2)}</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.01}
              value={adjust.contrast}
              onChange={(event) => setAdjust((a) => ({ ...a, contrast: Number(event.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Saturation {adjust.saturation.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={adjust.saturation}
              onChange={(event) => setAdjust((a) => ({ ...a, saturation: Number(event.target.value) }))}
            />
          </label>
          <label className="field">
            <span>Background (for JPEG / fill)</span>
            <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
          </label>
          <label className="field">
            <span>Overlay text</span>
            <input value={overlayText} onChange={(event) => setOverlayText(event.target.value)} />
          </label>
          <label className="field">
            <span>Export preset</span>
            <select value={preset} onChange={(event) => setPreset(event.target.value)}>
              {MARKETING_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Segmented
            label="Format"
            value={mime}
            options={[
              { value: 'image/jpeg', label: 'JPEG' },
              { value: 'image/webp', label: 'WebP' },
              { value: 'image/png', label: 'PNG' },
            ]}
            onChange={setMime}
          />
          <DownloadButton label={busy ? 'Exporting…' : 'Download'} disabled={!file || busy} onClick={() => void exportImage()} />
          <SendTo from="finish" files={file ? [file] : undefined} />
          <p className="hint">
            Re-encoding strips most EXIF. That is a side effect, not a way to hide origin.
          </p>
        </aside>
      </div>
    </ToolLayout>
  )
}
