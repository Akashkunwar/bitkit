/** Screenshot marks: arrows, boxes, blur, pixelation, numbered callouts, and text. */

export type Mark =
  | { id: string; kind: 'arrow' | 'box' | 'highlight'; x: number; y: number; w: number; h: number; color: string }
  | { id: string; kind: 'blur' | 'pixel'; x: number; y: number; w: number; h: number }
  | { id: string; kind: 'number'; x: number; y: number; n: number; color: string }
  | { id: string; kind: 'text'; x: number; y: number; text: string; color: string }

export function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  }
}

function boxBlur(image: ImageData, radius: number): void {
  const { data, width, height } = image
  const copy = new Uint8ClampedArray(data)
  const r = Math.max(1, radius)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let rs = 0
      let gs = 0
      let bs = 0
      let n = 0
      for (let dy = -r; dy <= r; dy += 2) {
        for (let dx = -r; dx <= r; dx += 2) {
          const xx = Math.min(width - 1, Math.max(0, x + dx))
          const yy = Math.min(height - 1, Math.max(0, y + dy))
          const i = (yy * width + xx) * 4
          rs += copy[i]
          gs += copy[i + 1]
          bs += copy[i + 2]
          n += 1
        }
      }
      const o = (y * width + x) * 4
      data[o] = rs / n
      data[o + 1] = gs / n
      data[o + 2] = bs / n
    }
  }
}

function pixelate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const size = Math.max(6, Math.round(Math.min(w, h) / 12))
  const block = ctx.getImageData(x, y, w, h)
  for (let yy = 0; yy < h; yy += size) {
    for (let xx = 0; xx < w; xx += size) {
      const i = (yy * w + xx) * 4
      ctx.fillStyle = `rgb(${block.data[i]}, ${block.data[i + 1]}, ${block.data[i + 2]})`
      ctx.fillRect(x + xx, y + yy, size, size)
    }
  }
}

export function drawMarks(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  marks: Mark[],
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  for (const mark of marks) {
    if (mark.kind === 'blur') {
      const x = Math.round(mark.x)
      const y = Math.round(mark.y)
      const w = Math.max(1, Math.round(mark.w))
      const h = Math.max(1, Math.round(mark.h))
      const image = ctx.getImageData(x, y, w, h)
      boxBlur(image, Math.max(2, Math.round(Math.min(w, h) / 16)))
      ctx.putImageData(image, x, y)
    } else if (mark.kind === 'pixel') {
      pixelate(
        ctx,
        Math.round(mark.x),
        Math.round(mark.y),
        Math.max(1, Math.round(mark.w)),
        Math.max(1, Math.round(mark.h)),
      )
    } else if (mark.kind === 'box' || mark.kind === 'highlight') {
      ctx.save()
      ctx.strokeStyle = mark.color
      ctx.fillStyle = mark.color
      ctx.lineWidth = Math.max(3, width / 240)
      if (mark.kind === 'highlight') {
        ctx.globalAlpha = 0.35
        ctx.fillRect(mark.x, mark.y, mark.w, mark.h)
      } else {
        ctx.strokeRect(mark.x, mark.y, mark.w, mark.h)
      }
      ctx.restore()
    } else if (mark.kind === 'arrow') {
      const x2 = mark.x + mark.w
      const y2 = mark.y + mark.h
      const angle = Math.atan2(mark.h, mark.w)
      const head = Math.max(14, width / 50)
      ctx.save()
      ctx.strokeStyle = mark.color
      ctx.fillStyle = mark.color
      ctx.lineWidth = Math.max(4, width / 200)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(mark.x, mark.y)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - head * Math.cos(angle - 0.45), y2 - head * Math.sin(angle - 0.45))
      ctx.lineTo(x2 - head * Math.cos(angle + 0.45), y2 - head * Math.sin(angle + 0.45))
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else if (mark.kind === 'number') {
      const r = Math.max(16, width / 48)
      ctx.save()
      ctx.fillStyle = mark.color
      ctx.beginPath()
      ctx.arc(mark.x, mark.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fffdf8'
      ctx.font = `700 ${Math.round(r)}px ui-sans-serif, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(mark.n), mark.x, mark.y + 1)
      ctx.restore()
    } else if (mark.kind === 'text') {
      ctx.save()
      ctx.fillStyle = mark.color
      ctx.font = `700 ${Math.max(18, Math.round(width / 28))}px ui-sans-serif, system-ui, sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(mark.text, mark.x, mark.y)
      ctx.restore()
    }
  }
}
