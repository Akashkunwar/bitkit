import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { DropZone } from '../../components/DropZone'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { circleCrop, pixelate, sharpen, withBorder, type Rgba } from '../../lib/picture'

type Mode = 'circle' | 'border' | 'sharpen' | 'pixel' | 'text'

function parseColor(hex: string): Rgba {
  const full = hex.replace('#', '')
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
    a: 255,
  }
}

async function loadPixels(file: File): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')
    ctx.drawImage(img, 0, 0)
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return { data: image.data, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function downloadPixels(data: Uint8ClampedArray, width: number, height: number, name: string) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  const pixels = new Uint8ClampedArray(data.length)
  pixels.set(data)
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('Could not encode the PNG.'))), 'image/png')
  })
  triggerDownload(blob, name)
}

export default function PictureTool() {
  const [mode, setMode] = useState<Mode>('circle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)
  urlRef.current = preview
  const [edge, setEdge] = useState(24)
  const [color, setColor] = useState('#1c1917')
  const [block, setBlock] = useState(12)
  const [text, setText] = useState('BitKit')
  const [size, setSize] = useState(72)
  const [ink, setInk] = useState('#1c1917')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const take = (next: File) => {
    setFile(next)
    setError(null)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(next)
    })
  }

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  useHandoff((payload) => {
    const image = payload.files?.find((item) => item.type.startsWith('image/'))
    if (image) take(image)
  })

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'text') {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas is unavailable.')
        ctx.font = `700 ${size}px sans-serif`
        const width = Math.ceil(ctx.measureText(text || ' ').width) + 24
        canvas.width = Math.max(8, width)
        canvas.height = size + 24
        ctx.font = `700 ${size}px sans-serif`
        ctx.fillStyle = ink
        ctx.textBaseline = 'middle'
        ctx.fillText(text || ' ', 12, canvas.height / 2)
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('Could not encode the PNG.'))), 'image/png')
        })
        triggerDownload(blob, 'text.png')
        return
      }
      if (!file) throw new Error('Drop a picture first.')
      const source = await loadPixels(file)
      if (mode === 'circle') {
        await downloadPixels(
          circleCrop(source.data, source.width, source.height),
          source.width,
          source.height,
          'circle.png',
        )
      } else if (mode === 'border') {
        const framed = withBorder(source.data, source.width, source.height, edge, parseColor(color))
        await downloadPixels(framed.data, framed.width, framed.height, 'border.png')
      } else if (mode === 'sharpen') {
        await downloadPixels(
          sharpen(source.data, source.width, source.height),
          source.width,
          source.height,
          'sharp.png',
        )
      } else {
        await downloadPixels(
          pixelate(source.data, source.width, source.height, block),
          source.width,
          source.height,
          'pixel.png',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not edit that picture.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Picture edits"
      lede="Circle crop, a solid border, sharpen, pixelate, or draw text on a transparent PNG."
    >
      <Segmented
        label="Edit"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'circle', label: 'Circle' },
          { value: 'border', label: 'Border' },
          { value: 'sharpen', label: 'Sharpen' },
          { value: 'pixel', label: 'Pixelate' },
          { value: 'text', label: 'Text PNG' },
        ]}
      />
      {mode === 'text' ? (
        <div className="row">
          <label className="field">
            <span>Text</span>
            <input className="text-input" value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <label className="field">
            <span>Size · {size}</span>
            <input type="range" min={16} max={240} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Color</span>
            <input type="color" value={ink} onChange={(e) => setInk(e.target.value)} />
          </label>
        </div>
      ) : (
        <>
          <DropZone
            accept="image/*"
            label="Drop a picture."
            hint="The edit stays in this tab and downloads as PNG."
            onFiles={(files) => files[0] && take(files[0])}
          />
          {preview ? <img alt="" src={preview} style={{ maxWidth: 360, maxHeight: 240 }} /> : null}
        </>
      )}
      {mode === 'border' ? (
        <div className="row">
          <label className="field">
            <span>Thickness · {edge}px</span>
            <input type="range" min={1} max={120} value={edge} onChange={(e) => setEdge(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Color</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
      ) : null}
      {mode === 'pixel' ? (
        <label className="field">
          <span>Block · {block}px</span>
          <input type="range" min={2} max={64} value={block} onChange={(e) => setBlock(Number(e.target.value))} />
        </label>
      ) : null}
      {error ? <p className="status-bad">{error}</p> : null}
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy || (mode !== 'text' && !file)}
        onClick={() => void run()}
      >
        {busy ? 'Working…' : 'Download PNG'}
      </button>
    </ToolLayout>
  )
}
