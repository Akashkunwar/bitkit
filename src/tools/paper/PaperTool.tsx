import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { downloadNamed } from '../../lib/download'
import { PAPER, wrapByMeasure } from '../../lib/paper'

type Mode = 'hand' | 'graph'
type Graph = 'square' | 'dot' | 'ruled'

const FONTS = [
  { id: 'script', label: 'Script', stack: '"Segoe Script", "Apple Chancery", "Snell Roundhand", cursive' },
  { id: 'print', label: 'Print', stack: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive' },
  { id: 'ink', label: 'Ink', stack: '"Palatino Linotype", Palatino, "Book Antiqua", serif' },
]

function paint(
  canvas: HTMLCanvasElement,
  mode: Mode,
  text: string,
  font: string,
  ink: string,
  graph: Graph,
  gap: number,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height, margin } = PAPER
  canvas.width = width
  canvas.height = height
  ctx.fillStyle = '#f7f1e4'
  ctx.fillRect(0, 0, width, height)

  if (mode === 'graph' && graph === 'square') {
    ctx.strokeStyle = 'rgba(90, 140, 190, 0.45)'
    ctx.lineWidth = 1
    for (let x = margin; x <= width - margin; x += gap) {
      ctx.beginPath()
      ctx.moveTo(x, margin)
      ctx.lineTo(x, height - margin)
      ctx.stroke()
    }
    for (let y = margin; y <= height - margin; y += gap) {
      ctx.beginPath()
      ctx.moveTo(margin, y)
      ctx.lineTo(width - margin, y)
      ctx.stroke()
    }
    return
  }

  if (mode === 'graph' && graph === 'dot') {
    ctx.fillStyle = 'rgba(70, 110, 150, 0.55)'
    for (let y = margin; y <= height - margin; y += gap) {
      for (let x = margin; x <= width - margin; x += gap) {
        ctx.beginPath()
        ctx.arc(x, y, 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }

  ctx.strokeStyle = 'rgba(180, 90, 90, 0.35)'
  ctx.lineWidth = 1
  const top = margin + 28
  for (let y = top; y < height - margin; y += PAPER.lineGap) {
    ctx.beginPath()
    ctx.moveTo(margin, y)
    ctx.lineTo(width - margin, y)
    ctx.stroke()
  }
  if (mode === 'graph') return

  ctx.fillStyle = ink
  ctx.font = `28px ${font}`
  ctx.textBaseline = 'alphabetic'
  const max = width - margin * 2
  const lines = wrapByMeasure(text, max, (sample) => ctx.measureText(sample).width)
  lines.forEach((line, index) => {
    const y = top + index * PAPER.lineGap
    if (y > height - margin) return
    ctx.fillText(line, margin, y - 6)
  })
}

export default function PaperTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('hand')
  const [text, setText] = useState('The quick brown fox writes on ruled paper.')
  const [fontId, setFontId] = useState(FONTS[0].id)
  const [ink, setInk] = useState('#1d3557')
  const [graph, setGraph] = useState<Graph>('square')
  const [gap, setGap] = useState(24)
  const font = FONTS.find((item) => item.id === fontId) ?? FONTS[0]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paint(canvas, mode, text, font.stack, ink, graph, gap)
  }, [mode, text, font.stack, ink, graph, gap])

  return (
    <ToolLayout
      title="Writing paper"
      lede="Handwriting on ruled paper, or a printable graph sheet. The page is drawn in this tab."
    >
      <div className="split">
        <section className="panel">
          <Segmented
            label="Page"
            value={mode}
            options={[
              { value: 'hand', label: 'Handwriting' },
              { value: 'graph', label: 'Graph' },
            ]}
            onChange={setMode}
          />
          {mode === 'hand' ? (
            <>
              <label className="field">
                <span>Text</span>
                <textarea
                  className="code-area editor"
                  rows={10}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Hand</span>
                <select className="text-input" value={fontId} onChange={(e) => setFontId(e.target.value)}>
                  {FONTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ink</span>
                <input type="color" value={ink} onChange={(e) => setInk(e.target.value)} />
              </label>
            </>
          ) : (
            <>
              <Segmented
                label="Grid"
                value={graph}
                options={[
                  { value: 'square', label: 'Squares' },
                  { value: 'dot', label: 'Dots' },
                  { value: 'ruled', label: 'Ruled' },
                ]}
                onChange={setGraph}
              />
              {graph !== 'ruled' ? (
                <label className="field">
                  <span>Spacing · {gap}px</span>
                  <input type="range" min={12} max={48} value={gap} onChange={(e) => setGap(Number(e.target.value))} />
                </label>
              ) : null}
            </>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const canvas = canvasRef.current
              if (!canvas) return
              canvas.toBlob((blob) => {
                if (blob) void downloadNamed(blob, mode === 'hand' ? 'handwriting.png' : 'graph-paper.png')
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
