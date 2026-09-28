import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, Copy, Download, X } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { copyBlob } from '../../lib/clipboard'
import { useHandoff } from '../../lib/useHandoff'
import { usePasteFiles } from '../../lib/usePasteFiles'
import { useToolSettings } from '../../lib/prefs'
import { decodeImage } from '../../lib/image/compress'
import { BACKDROPS, drawFrame, layoutFrame, type Aspect, type Chrome } from '../../lib/frame'

const DEFAULTS = {
  backdrop: 'indigo',
  padding: 0.08,
  radius: 14,
  shadow: 0.6,
  chrome: 'mac-light' as Chrome,
  aspect: 'auto' as Aspect,
  title: '',
  scale: 2,
}

type Loaded = { name: string; image: ImageBitmap | HTMLImageElement; width: number; height: number }

export default function FrameTool() {
  const { settings, update } = useToolSettings('frame', DEFAULTS)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<File | null>(null)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backdrop = BACKDROPS.find((b) => b.id === settings.backdrop) ?? BACKDROPS[0]

  const take = async (files: File[]) => {
    const file = files.find((f) => f.type.startsWith('image/'))
    if (!file) {
      setError('Drop an image — a screenshot works best.')
      return
    }
    try {
      const image = await decodeImage(file)
      const width = 'naturalWidth' in image && image.naturalWidth ? image.naturalWidth : image.width
      const height = 'naturalHeight' in image && image.naturalHeight ? image.naturalHeight : image.height
      setLoaded({ name: file.name.replace(/\.[^.]+$/, '') || 'screenshot', image, width, height })
      setError(null)
      setOutput(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that image.')
    }
  }

  // Release each decoded image once it is replaced or the tool closes.
  useEffect(
    () => () => {
      if (loaded && 'close' in loaded.image) loaded.image.close()
    },
    [loaded],
  )

  useHandoff((payload) => {
    if (payload.files?.length) void take(payload.files)
  })
  usePasteFiles((files) => void take(files))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !loaded) return
    const layout = layoutFrame(loaded.width, loaded.height, settings)
    const preview = Math.min(1, 1000 / Math.max(layout.width, layout.height))
    drawFrame(canvas, loaded.image as CanvasImageSource, loaded, { ...settings, backdrop: backdrop.stops }, preview)
    setOutput(null)
  }, [loaded, settings, backdrop])

  const render = async (): Promise<File | null> => {
    if (!loaded) return null
    const canvas = document.createElement('canvas')
    const layout = layoutFrame(loaded.width, loaded.height, settings)
    // Never exceed the canvas limit; screenshots are often already 2x.
    const scale = Math.min(settings.scale, 8000 / Math.max(layout.width, layout.height))
    drawFrame(canvas, loaded.image as CanvasImageSource, loaded, { ...settings, backdrop: backdrop.stops }, scale)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return null
    const file = new File([blob], `${loaded.name}-framed.png`, { type: 'image/png' })
    setOutput(file)
    return file
  }

  const download = async () => {
    const file = await render()
    if (file) triggerDownload(file, file.name)
  }

  const copy = async () => {
    const file = await render()
    if (!file) return
    try {
      await copyBlob(file)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('This browser will not copy images; download it instead.')
    }
  }

  return (
    <ToolLayout
      title="Screenshot frame"
      lede="Put a screenshot on a gradient backdrop with padding, rounded corners, a soft shadow, and optional window chrome — ready for a post, a README, or a slide."
    >
      {!loaded ? (
        <>
          <DropZone
            accept="image/*"
            label="Drop a screenshot, or paste it with Ctrl + V"
            hint="PNG screenshots look sharpest. Nothing leaves this tab."
            buttonLabel="Choose image"
            onFiles={(files) => void take(files)}
          />
          {error ? <p className="status-bad">{error}</p> : null}
        </>
      ) : (
        <div className="split">
          <section className="panel">
            <div className="toolbar">
              <strong>
                {loaded.name}{' '}
                <span className="muted">
                  · {loaded.width} × {loaded.height}
                </span>
              </strong>
              <button type="button" className="btn btn-sm" onClick={() => setLoaded(null)}>
                <X size={15} aria-hidden="true" />
                Close
              </button>
            </div>
            <div className="preview-frame frame-stage">
              <canvas ref={canvasRef} role="img" aria-label="Framed screenshot preview" />
            </div>
          </section>
          <aside className="panel">
            <div className="field">
              <span>Backdrop</span>
              <div className="swatch-picker" role="group" aria-label="Backdrop">
                {BACKDROPS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={b.id === settings.backdrop}
                    aria-label={b.label}
                    title={b.label}
                    className="swatch-option"
                    style={{ '--swatch': b.css } as CSSProperties}
                    onClick={() => update({ backdrop: b.id })}
                  />
                ))}
              </div>
            </div>
            <Segmented
              label="Window"
              value={settings.chrome}
              onChange={(chrome) => update({ chrome })}
              block
              options={[
                { value: 'none', label: 'None' },
                { value: 'mac-light', label: 'Light' },
                { value: 'mac-dark', label: 'Dark' },
                { value: 'browser', label: 'Browser' },
              ]}
            />
            {settings.chrome !== 'none' ? (
              <label className="field">
                <span>{settings.chrome === 'browser' ? 'Address' : 'Title'}</span>
                <input
                  value={settings.title}
                  placeholder={settings.chrome === 'browser' ? 'bitkit.app' : 'Optional'}
                  onChange={(e) => update({ title: e.target.value })}
                />
              </label>
            ) : null}
            <label className="field">
              <span>Padding · {Math.round(settings.padding * 100)}%</span>
              <input
                type="range"
                min={0}
                max={0.25}
                step={0.01}
                value={settings.padding}
                onChange={(e) => update({ padding: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              <span>Corners · {settings.radius}px</span>
              <input
                type="range"
                min={0}
                max={48}
                value={settings.radius}
                onChange={(e) => update({ radius: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              <span>Shadow · {Math.round(settings.shadow * 100)}%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.shadow}
                onChange={(e) => update({ shadow: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              <span>Canvas shape</span>
              <select value={settings.aspect} onChange={(e) => update({ aspect: e.target.value as Aspect })}>
                <option value="auto">Fit the screenshot</option>
                <option value="16:9">16:9 — slides, YouTube</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1 — Instagram, LinkedIn</option>
                <option value="4:5">4:5 — Instagram portrait</option>
                <option value="9:16">9:16 — stories</option>
              </select>
            </label>
            <Segmented
              label="Export size"
              value={String(settings.scale)}
              onChange={(scale) => update({ scale: Number(scale) })}
              block
              options={[
                { value: '1', label: '1×' },
                { value: '2', label: '2×' },
                { value: '3', label: '3×' },
              ]}
            />
            <div className="stack">
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => void download()}>
                <Download size={18} aria-hidden="true" />
                Download PNG
              </button>
              <button type="button" className="btn btn-block" onClick={() => void copy()}>
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? 'Copied to clipboard' : 'Copy image'}
              </button>
            </div>
            {error ? <p className="status-bad">{error}</p> : null}
            <SendTo from="frame" files={output ? [output] : []} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
