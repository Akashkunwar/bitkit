import { useEffect, useRef } from 'react'
import { triggerDownload } from '../../lib/download'

export function CanvasCard({
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
