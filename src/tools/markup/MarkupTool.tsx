import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { usePasteFiles } from '../../lib/usePasteFiles'
import { decodeImage } from '../../lib/image/compress'
import { drawMarks, normalizeRect, type Mark } from '../../lib/markup'

type Tool = 'arrow' | 'box' | 'highlight' | 'blur' | 'pixel' | 'number' | 'text'

const TOOLS: { value: Tool; label: string }[] = [
  { value: 'arrow', label: 'Arrow' },
  { value: 'box', label: 'Box' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'blur', label: 'Blur' },
  { value: 'pixel', label: 'Pixelate' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
]

type Loaded = { name: string; image: CanvasImageSource; width: number; height: number }

function rectMark(
  id: string,
  tool: Tool,
  rect: { x: number; y: number; w: number; h: number },
  color: string,
): Mark | null {
  if (tool === 'number' || tool === 'text') return null
  if (tool === 'blur' || tool === 'pixel') return { id, kind: tool, ...rect }
  return { id, kind: tool, ...rect, color }
}

export default function MarkupTool() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [tool, setTool] = useState<Tool>('arrow')
  const [color, setColor] = useState('#e23d2b')
  const [label, setLabel] = useState('Note')
  const [marks, setMarks] = useState<Mark[]>([])
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<File | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const number = useRef(1)

  const paint = (next: Mark[] = marks) => {
    const canvas = canvasRef.current
    if (!canvas || !loaded) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawMarks(ctx, loaded.image, loaded.width, loaded.height, next)
  }

  useEffect(() => {
    paint(marks)
    // paint reads the latest marks; the canvas is the dependency that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, marks])

  const take = async (files: File[]) => {
    const file = files.find(
      (item) => item.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(item.name),
    )
    if (!file) {
      setError('Drop a screenshot.')
      return
    }
    setError(null)
    setOutput(null)
    try {
      const image = await decodeImage(file)
      const width = 'naturalWidth' in image && image.naturalWidth ? image.naturalWidth : image.width
      const height = 'naturalHeight' in image && image.naturalHeight ? image.naturalHeight : image.height
      setLoaded({ name: file.name, image, width, height })
      setMarks([])
      number.current = 1
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.')
    }
  }

  useHandoff((payload) => {
    if (payload.files?.length) void take(payload.files)
  })
  usePasteFiles((files) => void take(files))

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const down = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const at = point(event)
    if (!at) return
    event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === 'number') {
      setMarks((current) => [
        ...current,
        { id: crypto.randomUUID(), kind: 'number', x: at.x, y: at.y, n: number.current, color },
      ])
      number.current += 1
      return
    }
    if (tool === 'text') {
      const text = label.trim()
      if (!text) return
      setMarks((current) => [...current, { id: crypto.randomUUID(), kind: 'text', x: at.x, y: at.y, text, color }])
      return
    }
    drag.current = at
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const start = drag.current
    const at = point(event)
    if (!start || !at || !loaded) return
    const rect = normalizeRect(start.x, start.y, at.x, at.y)
    const preview = rectMark('draft', tool, rect, color)
    if (preview) paint([...marks, preview])
  }

  const up = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const start = drag.current
    const at = point(event)
    drag.current = null
    if (!start || !at) return
    const rect = normalizeRect(start.x, start.y, at.x, at.y)
    if (rect.w < 4 && rect.h < 4) return
    const mark = rectMark(crypto.randomUUID(), tool, rect, color)
    if (mark) setMarks((current) => [...current, mark])
  }

  const download = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      setError('Could not export the image.')
      return
    }
    const name = `${(loaded?.name ?? 'screenshot').replace(/\.[^.]+$/, '')}-marked.png`
    const file = new File([blob], name, { type: 'image/png' })
    setOutput(file)
    triggerDownload(file, name)
  }

  return (
    <ToolLayout
      title="Screenshot markup"
      lede="Arrows, numbers, highlights, and a blur over the bit you do not want to share. The picture never leaves this tab."
    >
      {!loaded ? (
        <DropZone label="Drop a screenshot." hint="Paste works too." onFiles={(files) => void take(files)} />
      ) : (
        <div className="split">
          <section className="panel">
            <canvas
              ref={canvasRef}
              width={loaded.width}
              height={loaded.height}
              className="markup-canvas"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
            />
          </section>
          <aside className="panel">
            <Segmented label="Mark" value={tool} options={TOOLS} onChange={setTool} block />
            {tool !== 'blur' && tool !== 'pixel' ? (
              <label className="field">
                <span>Colour</span>
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              </label>
            ) : (
              <p className="hint">Drag over a name, email, or balance. Blur softens it. Pixelate blocks it out.</p>
            )}
            {tool === 'text' ? (
              <label className="field">
                <span>Text</span>
                <input className="text-input" value={label} onChange={(event) => setLabel(event.target.value)} />
              </label>
            ) : null}
            <div className="row">
              <button
                type="button"
                className="btn"
                disabled={!marks.length}
                onClick={() => setMarks((current) => current.slice(0, -1))}
              >
                Undo
              </button>
              <button type="button" className="btn-ghost" disabled={!marks.length} onClick={() => setMarks([])}>
                Clear
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => void download()}>
              Download PNG
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setLoaded(null)
                setMarks([])
                setOutput(null)
              }}
            >
              Different image
            </button>
            {error ? <p className="status-bad">{error}</p> : null}
            <SendTo from="markup" files={output ? [output] : []} />
          </aside>
        </div>
      )}
      {error && !loaded ? <p className="status-bad">{error}</p> : null}
    </ToolLayout>
  )
}
