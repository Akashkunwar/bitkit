import { mandelbrotEscape } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

export function MandelbrotSim() {
  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    const image = ctx.createImageData(width, height)
    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        const x = -2.1 + (px / width) * 2.8
        const y = -1.2 + (py / height) * 2.4
        const escape = mandelbrotEscape(x, y)
        const offset = (py * width + px) * 4
        if (escape >= 20) {
          image.data[offset] = 7
          image.data[offset + 1] = 8
          image.data[offset + 2] = 16
        } else {
          image.data[offset] = 20 + escape * 10
          image.data[offset + 1] = 40 + escape * 8
          image.data[offset + 2] = 80 + escape * 6
        }
        image.data[offset + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  }

  return (
    <div className="stack">
      <p>Dark pixels stay in the set. Brighter pixels escaped.</p>
      <CanvasCard width={280} height={200} draw={draw} filename="mandelbrot.png" label="Mandelbrot set" />
    </div>
  )
}
