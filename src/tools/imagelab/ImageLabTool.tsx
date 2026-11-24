import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { downloadNamed } from '../../lib/download'
import { useCopied } from '../../lib/useCopied'
import { ditherRgba, halftoneRgba, invertRgba } from '../../lib/pixels'

type Mode = 'invert' | 'stamp' | 'halftone' | 'dither' | 'base64'

const MODES: { value: Mode; label: string }[] = [
  { value: 'invert', label: 'Invert' },
  { value: 'stamp', label: 'Date stamp' },
  { value: 'halftone', label: 'Halftone' },
  { value: 'dither', label: 'Dither' },
  { value: 'base64', label: 'Base64' },
]

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not read that image.'))
    image.src = src
  })
}

export default function ImageLabTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('invert')
  const [url, setUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)
  urlRef.current = url
  const [stamp, setStamp] = useState(() => new Date().toISOString().slice(0, 10).replaceAll('-', '.'))
  const [cell, setCell] = useState(8)
  const [base64, setBase64] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  const draw = async (source: string, next: Mode) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = await loadImage(source)
    const width = Math.min(image.naturalWidth, 1600)
    const height = Math.round(image.naturalHeight * (width / image.naturalWidth))
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(image, 0, 0, width, height)
    if (next === 'invert' || next === 'halftone' || next === 'dither') {
      const frame = ctx.getImageData(0, 0, width, height)
      const pixels =
        next === 'invert'
          ? invertRgba(frame.data)
          : next === 'halftone'
            ? halftoneRgba(frame.data, width, height, cell)
            : ditherRgba(frame.data, width, height)
      frame.data.set(pixels)
      ctx.putImageData(frame, 0, 0)
    }
    if (next === 'stamp') {
      ctx.font = 'bold 28px ui-monospace, monospace'
      ctx.fillStyle = '#ff7a18'
      ctx.textAlign = 'right'
      ctx.fillText(stamp, width - 24, height - 28)
    }
    if (next === 'base64') setBase64(canvas.toDataURL('image/png'))
  }

  const openFile = async (file: File) => {
    setError(null)
    if (url) URL.revokeObjectURL(url)
    const next = URL.createObjectURL(file)
    setUrl(next)
    try {
      await draw(next, mode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.')
    }
  }

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  return (
    <ToolLayout
      title="Image lab"
      lede="Invert, date-stamp, halftone, dither, or turn a picture into Base64. The file stays in this tab."
    >
      <div className="split">
        <section className="panel">
          <DropZone accept="image/*" label="Drop an image." onFiles={(files) => files[0] && void openFile(files[0])} />
          <Segmented
            label="Edit"
            value={mode}
            options={MODES}
            onChange={(next) => {
              setMode(next)
              if (url) void draw(url, next)
            }}
          />
          {mode === 'stamp' ? (
            <label className="field">
              <span>Stamp</span>
              <input className="text-input" value={stamp} onChange={(e) => setStamp(e.target.value)} />
            </label>
          ) : null}
          {mode === 'halftone' ? (
            <label className="field">
              <span>Dot size · {cell}</span>
              <input
                type="range"
                min={4}
                max={24}
                value={cell}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setCell(next)
                }}
              />
            </label>
          ) : null}
          <button type="button" className="btn btn-primary" disabled={!url} onClick={() => url && void draw(url, mode)}>
            Apply
          </button>
          {error ? <p className="status-bad">{error}</p> : null}
          {mode === 'base64' && base64 ? (
            <>
              <textarea className="code-area" rows={6} readOnly value={base64} />
              <button type="button" className="btn" onClick={() => void copy(base64, 'b64')}>
                {copied === 'b64' ? 'Copied ✓' : 'Copy Base64'}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="btn"
            disabled={!url}
            onClick={() => {
              canvasRef.current?.toBlob((blob) => {
                if (blob) void downloadNamed(blob, `${mode}.png`)
              }, 'image/png')
            }}
          >
            Download PNG
          </button>
        </section>
        <aside className="panel">
          <canvas ref={canvasRef} className="paper-preview" />
        </aside>
      </div>
    </ToolLayout>
  )
}
