import { compressImage } from './image/compress'

export const ICON_SIZES = [16, 32, 48, 180, 192, 512] as const

export const ICO_SIZES = [16, 32, 48] as const

export async function renderPngIcon(source: Blob, size: number): Promise<Uint8Array> {
  const result = await compressImage(source, {
    width: size,
    height: size,
    fit: 'cover',
    mime: 'image/png',
  })
  return new Uint8Array(await result.blob.arrayBuffer())
}

function u8(...n: number[]): Uint8Array {
  return Uint8Array.from(n)
}

/** ICO container with embedded PNGs (supported by modern browsers). */
export function buildIco(pngs: { size: number; bytes: Uint8Array }[]): Uint8Array {
  const count = pngs.length
  const header = u8(0, 0, 1, 0, count & 0xff, (count >> 8) & 0xff)
  const entries: Uint8Array[] = []
  const bodies: Uint8Array[] = []
  let offset = 6 + 16 * count
  for (const png of pngs) {
    const w = png.size >= 256 ? 0 : png.size
    const size = png.bytes.length
    entries.push(
      u8(
        w,
        w,
        0,
        0,
        1,
        0,
        32,
        0,
        size & 0xff,
        (size >> 8) & 0xff,
        (size >> 16) & 0xff,
        (size >> 24) & 0xff,
        offset & 0xff,
        (offset >> 8) & 0xff,
        (offset >> 16) & 0xff,
        (offset >> 24) & 0xff,
      ),
    )
    bodies.push(png.bytes)
    offset += size
  }
  const total = 6 + entries.reduce((n, e) => n + e.length, 0) + bodies.reduce((n, b) => n + b.length, 0)
  const out = new Uint8Array(total)
  out.set(header, 0)
  let o = 6
  for (const e of entries) {
    out.set(e, o)
    o += e.length
  }
  for (const b of bodies) {
    out.set(b, o)
    o += b.length
  }
  return out
}

export async function buildFaviconSet(source: Blob): Promise<{ name: string; bytes: Uint8Array }[]> {
  const pngs: { size: number; bytes: Uint8Array }[] = []
  for (const size of ICON_SIZES) {
    pngs.push({ size, bytes: await renderPngIcon(source, size) })
  }
  const icoPngs = pngs.filter((p) => (ICO_SIZES as readonly number[]).includes(p.size))
  const ico = buildIco(icoPngs)
  return [
    { name: 'favicon.ico', bytes: ico },
    ...pngs.map((p) => ({ name: `icon-${p.size}.png`, bytes: p.bytes })),
  ]
}
