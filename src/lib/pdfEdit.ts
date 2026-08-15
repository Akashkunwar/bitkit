import { PDFDocument, LineCapStyle, StandardFonts, degrees, rgb, type RGB } from 'pdf-lib'

export type Point = { x: number; y: number }

export type PenAnnotation = { id: string; kind: 'pen'; points: Point[]; color: string; width: number }
export type TextAnnotation = { id: string; kind: 'text'; x: number; y: number; text: string; size: number; color: string }
type RectBase = { id: string; x: number; y: number; w: number; h: number; color: string; opacity: number }
export type WhiteoutAnnotation = RectBase & { kind: 'whiteout' }
export type HighlightAnnotation = RectBase & { kind: 'highlight' }
export type RectAnnotation = WhiteoutAnnotation | HighlightAnnotation
export type ImageAnnotation = { id: string; kind: 'image'; x: number; y: number; w: number; h: number; dataUrl: string }

export type Annotation = PenAnnotation | TextAnnotation | RectAnnotation | ImageAnnotation

export type PageState = {
  id: string
  /** Index of this page in the source document. */
  sourceIndex: number
  /** Extra user rotation in degrees, on top of the page's own /Rotate. */
  rotation: 0 | 90 | 180 | 270
  annotations: Annotation[]
}

let seq = 0
export function annotationId(): string {
  seq += 1
  return `a${Date.now().toString(36)}${seq}`
}

export function hexToRgb(hex: string): RGB {
  const m = hex.replace('#', '')
  return rgb(parseInt(m.slice(0, 2), 16) / 255, parseInt(m.slice(2, 4), 16) / 255, parseInt(m.slice(4, 6), 16) / 255)
}

/**
 * Map a point in rendered-view coordinates (origin top-left, y down, measured in
 * PDF points at the *rotated* orientation) to native PDF coordinates (origin
 * bottom-left, y up, unrotated page).
 */
export function viewToPdf(rotation: number, pageW: number, pageH: number, v: Point): Point {
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return { x: v.y, y: v.x }
    case 180:
      return { x: pageW - v.x, y: v.y }
    case 270:
      return { x: pageW - v.y, y: pageH - v.x }
    default:
      return { x: v.x, y: pageH - v.y }
  }
}

/** WinAnsi cannot encode every glyph; strip what Helvetica cannot draw. */
function sanitizeForHelvetica(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replaceAll(/[^\u0000-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u20ac]/g, '?')
}

export async function exportPdf(sourceBytes: Uint8Array, pages: PageState[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(sourceBytes, { ignoreEncryption: true })
  const out = await PDFDocument.create()
  const font = await out.embedFont(StandardFonts.Helvetica)
  const copied = await out.copyPages(src, pages.map((p) => p.sourceIndex))

  const imageCache = new Map<string, Awaited<ReturnType<typeof out.embedPng>>>()

  for (let i = 0; i < pages.length; i += 1) {
    const state = pages[i]
    const page = copied[i]
    out.addPage(page)

    const baseRotation = page.getRotation().angle
    const effective = ((((baseRotation + state.rotation) % 360) + 360) % 360) as 0 | 90 | 180 | 270
    page.setRotation(degrees(effective))

    const W = page.getWidth()
    const H = page.getHeight()
    const map = (v: Point) => viewToPdf(effective, W, H, v)

    for (const ann of state.annotations) {
      if (ann.kind === 'whiteout' || ann.kind === 'highlight') {
        const a = map({ x: ann.x, y: ann.y })
        const b = map({ x: ann.x + ann.w, y: ann.y + ann.h })
        page.drawRectangle({
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(a.x - b.x),
          height: Math.abs(a.y - b.y),
          color: hexToRgb(ann.color),
          opacity: ann.opacity,
        })
      } else if (ann.kind === 'pen') {
        const color = hexToRgb(ann.color)
        for (let p = 1; p < ann.points.length; p += 1) {
          page.drawLine({
            start: map(ann.points[p - 1]),
            end: map(ann.points[p]),
            thickness: ann.width,
            color,
            lineCap: LineCapStyle.Round,
          })
        }
      } else if (ann.kind === 'text') {
        const anchor = map({ x: ann.x, y: ann.y + ann.size })
        page.drawText(sanitizeForHelvetica(ann.text), {
          x: anchor.x,
          y: anchor.y,
          size: ann.size,
          font,
          color: hexToRgb(ann.color),
          rotate: degrees(effective),
          lineHeight: ann.size * 1.25,
        })
      } else {
        let image = imageCache.get(ann.dataUrl)
        if (!image) {
          image = await out.embedPng(ann.dataUrl)
          imageCache.set(ann.dataUrl, image)
        }
        const anchor = map({ x: ann.x, y: ann.y + ann.h })
        page.drawImage(image, {
          x: anchor.x,
          y: anchor.y,
          width: ann.w,
          height: ann.h,
          rotate: degrees(effective),
        })
      }
    }
  }

  return out.save()
}
