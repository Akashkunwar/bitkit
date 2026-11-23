import { useEffect, useMemo, useRef, useState } from 'react'
import { Segmented } from '../../components/Segmented'
import { ToolLayout } from '../../components/ToolLayout'
import {
  brickCount,
  circlePoints,
  domeLayers,
  downscale,
  paintIds,
  perlerCounts,
  sphereLayers,
  stitchSymbols,
  stringArtSteps,
} from '../../lib/craft'
import { triggerDownload } from '../../lib/download'

const CRAFT_MODES = [
  { value: 'perler', label: 'Perler beads' },
  { value: 'stitch', label: 'Cross stitch' },
  { value: 'lego', label: 'LEGO mosaic' },
  { value: 'pixel', label: 'Pixel art' },
  { value: 'paint', label: 'Paint by numbers' },
  { value: 'string', label: 'String art' },
  { value: 'circle', label: 'Minecraft circle' },
  { value: 'sphere', label: 'Minecraft sphere' },
  { value: 'dome', label: 'Minecraft dome' },
] as const

type CraftMode = (typeof CRAFT_MODES)[number]['value']

const BEADS = [
  '#d64545',
  '#d64545',
  '#e2b33d',
  '#3c7fd4',
  '#e2b33d',
  '#3c7fd4',
  '#2a2a2a',
  '#d64545',
  '#f4f1ea',
  '#2a2a2a',
  '#3c7fd4',
  '#e2b33d',
  '#d64545',
  '#f4f1ea',
  '#2a2a2a',
  '#3c7fd4',
]

const PIXEL_GRID: number[][] = [
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 0, 0, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 1, 1, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
]

function CanvasCard({
  width,
  height,
  draw,
  filename,
  label,
}: {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D) => void
  filename: string
  label: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = width
    canvas.height = height
    draw(ctx)
  }, [draw, height, width])

  return (
    <div className="stack">
      <div className="preview-frame">
        <canvas ref={canvasRef} width={width} height={height} aria-label={label} />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          canvasRef.current?.toBlob((blob) => {
            if (blob) triggerDownload(blob, filename)
          }, 'image/png')
        }}
      >
        Download PNG
      </button>
    </div>
  )
}

function beadIndex(index: number): { x: number; y: number } {
  return { x: index % 4, y: Math.floor(index / 4) }
}

function PerlerSim() {
  const counts = perlerCounts(BEADS)
  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#efe8dc'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    BEADS.forEach((color, index) => {
      const { x, y } = beadIndex(index)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(28 + x * 48, 28 + y * 48, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.arc(24 + x * 48, 24 + y * 48, 5, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return (
    <div className="stack">
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Color</th>
              <th className="num">Beads</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(counts).map(([color, count]) => (
              <tr key={color}>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      marginRight: 8,
                      background: color,
                      borderRadius: 99,
                      verticalAlign: 'middle',
                    }}
                  />
                  {color}
                </td>
                <td className="num">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CanvasCard width={220} height={220} draw={draw} filename="perler.png" label="Perler beads" />
    </div>
  )
}

function StitchSim() {
  const symbols = stitchSymbols(BEADS)
  const legend = new Map<string, string>()
  BEADS.forEach((color, index) => {
    if (!legend.has(color)) legend.set(color, symbols[index])
  })

  const draw = (ctx: CanvasRenderingContext2D) => {
    const cell = 48
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    symbols.forEach((symbol, index) => {
      const { x, y } = beadIndex(index)
      ctx.strokeStyle = '#d9d0c3'
      ctx.strokeRect(x * cell, y * cell, cell, cell)
      ctx.fillStyle = BEADS[index]
      ctx.fillText(symbol, x * cell + cell / 2, y * cell + cell / 2)
    })
  }

  return (
    <div className="stack">
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Color</th>
            </tr>
          </thead>
          <tbody>
            {[...legend.entries()].map(([color, symbol]) => (
              <tr key={color}>
                <td>{symbol}</td>
                <td>{color}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CanvasCard width={192} height={192} draw={draw} filename="cross-stitch.png" label="Cross stitch" />
    </div>
  )
}

function LegoSim() {
  const [width, setWidth] = useState(8)
  const [height, setHeight] = useState(6)
  const total = brickCount(width, height)
  const palette = ['#d64545', '#e2b33d', '#3c7fd4', '#2f9e6b', '#f4f1ea']

  const draw = (ctx: CanvasRenderingContext2D) => {
    const cell = 28
    ctx.fillStyle = '#efe8dc'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        ctx.fillStyle = palette[(x + y) % palette.length]
        ctx.fillRect(x * cell + 2, y * cell + 6, cell - 4, cell - 8)
        ctx.beginPath()
        ctx.arc(x * cell + cell / 2, y * cell + 8, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <label className="field">
          <span>Width · {width}</span>
          <input
            type="range"
            min={2}
            max={16}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Height · {height}</span>
          <input
            type="range"
            min={2}
            max={16}
            value={height}
            onChange={(event) => setHeight(Number(event.target.value))}
          />
        </label>
      </div>
      <p>{total} bricks.</p>
      <CanvasCard width={width * 28} height={height * 28} draw={draw} filename="lego-mosaic.png" label="LEGO mosaic" />
    </div>
  )
}

function PixelSim() {
  const [factor, setFactor] = useState(2)
  const small = useMemo(() => downscale(PIXEL_GRID, factor), [factor])

  const paint = (ctx: CanvasRenderingContext2D, grid: number[][], cell: number) => {
    ctx.imageSmoothingEnabled = false
    grid.forEach((row, y) => {
      row.forEach((value, x) => {
        ctx.fillStyle = value ? '#243044' : '#f7f3ea'
        ctx.fillRect(x * cell, y * cell, cell, cell)
      })
    })
  }

  return (
    <div className="stack">
      <label className="field">
        <span>Downscale factor · {factor}</span>
        <input
          type="range"
          min={1}
          max={4}
          step={1}
          value={factor}
          onChange={(event) => setFactor(Number(event.target.value))}
        />
      </label>
      <p>
        {PIXEL_GRID.length}×{PIXEL_GRID[0].length} becomes {small.length}×{small[0]?.length ?? 0}.
      </p>
      <CanvasCard
        width={PIXEL_GRID[0].length * 22}
        height={PIXEL_GRID.length * 22}
        draw={(ctx) => paint(ctx, PIXEL_GRID, 22)}
        filename="pixel-art.png"
        label="Pixel art"
      />
      <CanvasCard
        width={Math.max((small[0]?.length ?? 1) * 22, 1)}
        height={Math.max(small.length * 22, 1)}
        draw={(ctx) => paint(ctx, small, 22)}
        filename="pixel-art-small.png"
        label="Downscaled pixel art"
      />
    </div>
  )
}

function PaintSim() {
  const ids = paintIds(BEADS)
  const legend = new Map<number, string>()
  BEADS.forEach((color, index) => {
    if (!legend.has(ids[index])) legend.set(ids[index], color)
  })

  const draw = (ctx: CanvasRenderingContext2D) => {
    const cell = 48
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ids.forEach((id, index) => {
      const { x, y } = beadIndex(index)
      ctx.fillStyle = BEADS[index]
      ctx.fillRect(x * cell + 4, y * cell + 4, cell - 8, cell - 8)
      ctx.fillStyle = '#111111'
      ctx.fillText(String(id), x * cell + cell / 2, y * cell + cell / 2)
    })
  }

  return (
    <div className="stack">
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Color</th>
            </tr>
          </thead>
          <tbody>
            {[...legend.entries()].map(([id, color]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{color}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CanvasCard width={192} height={192} draw={draw} filename="paint-by-numbers.png" label="Paint by numbers" />
    </div>
  )
}

function StringSim() {
  const [nails, setNails] = useState(36)
  const steps = useMemo(() => stringArtSteps(nails), [nails])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#1b1a17'
    ctx.fillRect(0, 0, width, height)
    const cx = width / 2
    const cy = height / 2
    const radius = width / 2 - 24
    const at = (index: number) => {
      const angle = (index / nails) * Math.PI * 2 - Math.PI / 2
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const
    }
    ctx.strokeStyle = 'rgba(226, 182, 87, 0.8)'
    for (const [from, to] of steps) {
      const [x1, y1] = at(from)
      const [x2, y2] = at(to)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    ctx.fillStyle = '#f4f1ea'
    for (let i = 0; i < nails; i += 1) {
      const [x, y] = at(i)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <div className="stack">
      <label className="field">
        <span>Nails · {nails}</span>
        <input type="range" min={4} max={72} value={nails} onChange={(event) => setNails(Number(event.target.value))} />
      </label>
      <p>{steps.length} strings.</p>
      <CanvasCard width={420} height={420} draw={draw} filename="string-art.png" label="String art" />
    </div>
  )
}

function coordinateText(layers: number[][], y0: number): string {
  return layers
    .map((layer, index) => {
      const y = y0 + index
      const coords: string[] = []
      for (let i = 0; i < layer.length; i += 2) coords.push(`(${layer[i]}, ${y}, ${layer[i + 1]})`)
      return `y=${y}  ${coords.join(' ')}`
    })
    .join('\n')
}

function CircleSim() {
  const [radius, setRadius] = useState(4)
  const points = useMemo(() => circlePoints(radius), [radius])
  const text = points.map((point) => `(${point.x}, ${point.y})`).join('\n')

  return (
    <div className="stack">
      <p>Coordinate list, not a game.</p>
      <label className="field">
        <span>Radius · {radius}</span>
        <input
          type="range"
          min={1}
          max={8}
          value={radius}
          onChange={(event) => setRadius(Number(event.target.value))}
        />
      </label>
      <p className="muted">{points.length} blocks on the ring.</p>
      <pre className="code-area" style={{ maxHeight: '24rem' }}>
        {text}
      </pre>
    </div>
  )
}

function SphereSim({ upper }: { upper: boolean }) {
  const [radius, setRadius] = useState(3)
  const layers = useMemo(() => (upper ? domeLayers(radius) : sphereLayers(radius)), [radius, upper])
  const text = coordinateText(layers, upper ? 0 : -radius)
  const blocks = layers.reduce((sum, layer) => sum + layer.length / 2, 0)

  return (
    <div className="stack">
      <p>Coordinate list, not a game.</p>
      <label className="field">
        <span>Radius · {radius}</span>
        <input
          type="range"
          min={1}
          max={6}
          value={radius}
          onChange={(event) => setRadius(Number(event.target.value))}
        />
      </label>
      <p className="muted">
        {layers.length} layers, {blocks} blocks.{' '}
        {upper ? 'Upper half, including the middle.' : 'Full sphere, bottom to top.'}
      </p>
      <pre className="code-area" style={{ maxHeight: '24rem' }}>
        {text}
      </pre>
    </div>
  )
}

function CraftBody({ mode }: { mode: CraftMode }) {
  switch (mode) {
    case 'perler':
      return <PerlerSim />
    case 'stitch':
      return <StitchSim />
    case 'lego':
      return <LegoSim />
    case 'pixel':
      return <PixelSim />
    case 'paint':
      return <PaintSim />
    case 'string':
      return <StringSim />
    case 'circle':
      return <CircleSim />
    case 'sphere':
      return <SphereSim upper={false} />
    case 'dome':
      return <SphereSim upper />
    default: {
      const exhaustive: never = mode
      throw new Error(exhaustive)
    }
  }
}

export default function CraftTool() {
  const [mode, setMode] = useState<CraftMode>('perler')
  const options: { value: CraftMode; label: string }[] = CRAFT_MODES.map((item) => ({
    value: item.value,
    label: item.label,
  }))

  return (
    <ToolLayout
      title="Craft patterns"
      lede="Count beads, stitches, and bricks, then download a PNG. Block shapes stay as coordinate lists."
    >
      <Segmented label="Pattern" value={mode} options={options} onChange={setMode} />
      <CraftBody mode={mode} />
    </ToolLayout>
  )
}
