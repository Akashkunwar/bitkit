import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { decodeImage } from '../../lib/image/compress'
import {
  asciiToPng,
  DEFAULT_ASCII,
  gridFor,
  imageDataToAscii,
  RAMPS,
  type AsciiOptions,
} from '../../lib/asciiArt'

export default function AsciiTool() {
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState<AsciiOptions>(DEFAULT_ASCII)
  const [rampId, setRampId] = useState(RAMPS[1].id)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) setFile(image)
  })

  useEffect(() => {
    if (!file) return
    let live = true
    setBusy(true)
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const source = await decodeImage(file)
          if (!live) return
          const srcW = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
          const srcH = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
          const grid = gridFor(srcW, srcH, options)

          const canvas = document.createElement('canvas')
          canvas.width = grid.width
          canvas.height = grid.height
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) throw new Error('Canvas is unavailable in this browser.')
          // Downscaling to the character grid is the sampling step; the browser's
          // smoothing averages each cell for us.
          ctx.drawImage(source as CanvasImageSource, 0, 0, grid.width, grid.height)
          const data = ctx.getImageData(0, 0, grid.width, grid.height)
          if ('close' in source) source.close()

          if (!live) return
          setText(imageDataToAscii(data, options).text)
          setError(null)
        } catch (err) {
          if (live) setError(err instanceof Error ? err.message : 'Could not convert that image.')
        } finally {
          if (live) setBusy(false)
        }
      })()
    }, 140)
    return () => {
      live = false
      window.clearTimeout(id)
    }
  }, [file, options])

  const set = <K extends keyof AsciiOptions>(key: K, value: AsciiOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }))

  return (
    <ToolLayout
      title="ASCII from image"
      lede="Turn a photo into text art. Every pixel is read locally — nothing is uploaded."
    >
      <DropZone
        accept="image/*"
        label="Drop an image."
        hint="High-contrast pictures with a clear subject work best."
        onFiles={(files) => {
          const image = files.find((f) => f.type.startsWith('image/'))
          if (image) setFile(image)
          else setError('That is not an image.')
        }}
      />
      {error ? <p className="status-bad">{error}</p> : null}

      {file ? (
        <>
          <div className="split">
            <label className="field">
              <span>Width — {options.columns} characters</span>
              <input
                type="range"
                min={20}
                max={300}
                value={options.columns}
                onChange={(e) => set('columns', Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Character set</span>
              <select
                className="text-input"
                value={rampId}
                onChange={(e) => {
                  setRampId(e.target.value)
                  const ramp = RAMPS.find((r) => r.id === e.target.value)
                  if (ramp) set('ramp', ramp.chars)
                }}
              >
                {RAMPS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="split">
            <label className="field">
              <span>Contrast — {options.contrast.toFixed(2)}×</span>
              <input
                type="range"
                min={0.4}
                max={2.5}
                step={0.05}
                value={options.contrast}
                onChange={(e) => set('contrast', Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Brightness — {options.brightness > 0 ? '+' : ''}{options.brightness}</span>
              <input
                type="range"
                min={-80}
                max={80}
                value={options.brightness}
                onChange={(e) => set('brightness', Number(e.target.value))}
              />
            </label>
          </div>

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <label className="row">
              <input type="checkbox" checked={options.invert} onChange={(e) => set('invert', e.target.checked)} />
              Invert — for light text on a dark background
            </label>
            <label className="field" style={{ minWidth: '12rem' }}>
              <span>Cell aspect — {options.cellAspect.toFixed(1)}</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={options.cellAspect}
                onChange={(e) => set('cellAspect', Number(e.target.value))}
              />
            </label>
          </div>

          <pre className="ascii-out" aria-label="ASCII output">
            {busy && !text ? 'Converting…' : text}
          </pre>

          <div className="row" style={{ marginTop: '0.8rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={!text} onClick={() => void copy(text, 'ascii')}>
              {copied === 'ascii' ? 'Copied' : 'Copy text'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!text}
              onClick={() => triggerDownload(new Blob([text], { type: 'text/plain' }), 'ascii.txt')}
            >
              Download .txt
            </button>
            <button
              type="button"
              className="btn"
              disabled={!text}
              onClick={() => {
                void asciiToPng(text, {
                  background: options.invert ? '#111111' : '#ffffff',
                  colour: options.invert ? '#f2f2f2' : '#111111',
                })
                  .then((png) => triggerDownload(png, 'ascii.png'))
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : 'PNG export failed.'))
              }}
            >
              Download PNG
            </button>
          </div>
        </>
      ) : null}

      <SendTo from="ascii" text={text} />
    </ToolLayout>
  )
}
