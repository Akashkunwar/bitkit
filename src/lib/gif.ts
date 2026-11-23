/**
 * GIF89a encoder with one global palette. Frames must share a size.
 * `decodeGif` reads that file back to palette indices so the encoder can
 * be checked without a browser GIF decoder.
 */

export type GifFrame = {
  width: number
  height: number
  rgba: Uint8ClampedArray
  /** Delay before the next frame, in centiseconds (GIF's unit). */
  delayCs: number
}

type Palette = { colors: { r: number; g: number; b: number }[]; table: Uint8Array }

function buildPalette(frames: GifFrame[]): Palette {
  const bins = new Map<number, { r: number; g: number; b: number; n: number }>()
  for (const frame of frames) {
    const step = Math.max(1, Math.floor(frame.rgba.length / 4 / 5000))
    for (let i = 0; i < frame.rgba.length; i += 4 * step) {
      const r = frame.rgba[i]
      const g = frame.rgba[i + 1]
      const b = frame.rgba[i + 2]
      const key = (r << 16) | (g << 8) | b
      const hit = bins.get(key)
      if (hit) hit.n += 1
      else bins.set(key, { r, g, b, n: 1 })
    }
  }
  let colors = [...bins.values()].sort((a, b) => b.n - a.n)
  if (!colors.length) colors = [{ r: 0, g: 0, b: 0, n: 1 }]
  if (colors.length > 256) colors = colors.slice(0, 256)
  const lookup = new Uint8Array(32 * 32 * 32)
  for (let r = 0; r < 32; r += 1) {
    for (let g = 0; g < 32; g += 1) {
      for (let b = 0; b < 32; b += 1) {
        const rr = r * 8 + 4
        const gg = g * 8 + 4
        const bb = b * 8 + 4
        let best = 0
        let bestD = Infinity
        for (let i = 0; i < colors.length; i += 1) {
          const d = (colors[i].r - rr) ** 2 + (colors[i].g - gg) ** 2 + (colors[i].b - bb) ** 2
          if (d < bestD) {
            bestD = d
            best = i
          }
        }
        lookup[(r << 10) | (g << 5) | b] = best
      }
    }
  }
  return { colors, table: lookup }
}

function indexFrame(frame: GifFrame, palette: Palette): Uint8Array {
  const out = new Uint8Array(frame.width * frame.height)
  const exact = new Map<number, number>()
  palette.colors.forEach((color, index) => exact.set((color.r << 16) | (color.g << 8) | color.b, index))
  for (let p = 0, i = 0; i < out.length; i += 1, p += 4) {
    const key = (frame.rgba[p] << 16) | (frame.rgba[p + 1] << 8) | frame.rgba[p + 2]
    const hit = exact.get(key)
    out[i] =
      hit ?? palette.table[((frame.rgba[p] >> 3) << 10) | ((frame.rgba[p + 1] >> 3) << 5) | (frame.rgba[p + 2] >> 3)]
  }
  return out
}

function lzw(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clear = 1 << minCodeSize
  const eoi = clear + 1
  let codeSize = minCodeSize + 1
  let next = eoi + 1
  const dict = new Map<string, number>()
  const bytes: number[] = []
  let acc = 0
  let nbits = 0

  const emit = (code: number) => {
    acc |= code << nbits
    nbits += codeSize
    while (nbits >= 8) {
      bytes.push(acc & 255)
      acc >>>= 8
      nbits -= 8
    }
  }
  const reset = () => {
    dict.clear()
    codeSize = minCodeSize + 1
    next = eoi + 1
  }
  const codeOf = (key: string): number => (key.includes(',') ? (dict.get(key) as number) : Number(key))

  emit(clear)
  if (!indices.length) {
    emit(eoi)
    if (nbits) bytes.push(acc & 255)
    return Uint8Array.from(bytes)
  }

  let prefix = String(indices[0])
  for (let i = 1; i < indices.length; i += 1) {
    const combined = `${prefix},${indices[i]}`
    if (dict.has(combined)) {
      prefix = combined
      continue
    }
    emit(codeOf(prefix))
    if (next < 4096) {
      dict.set(combined, next)
      next += 1
      if (next === 1 << codeSize && codeSize < 12) codeSize += 1
    } else {
      emit(clear)
      reset()
    }
    prefix = String(indices[i])
  }
  emit(codeOf(prefix))
  emit(eoi)
  if (nbits) bytes.push(acc & 255)
  return Uint8Array.from(bytes)
}

function subBlocks(data: Uint8Array): Uint8Array[] {
  const parts: Uint8Array[] = []
  for (let i = 0; i < data.length; i += 255) {
    const slice = data.subarray(i, Math.min(data.length, i + 255))
    const block = new Uint8Array(slice.length + 1)
    block[0] = slice.length
    block.set(slice, 1)
    parts.push(block)
  }
  parts.push(new Uint8Array([0]))
  return parts
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 255, (n >> 8) & 255])
}

export function encodeGif(frames: GifFrame[]): Uint8Array {
  if (!frames.length) throw new Error('A GIF needs at least one frame.')
  const { width, height } = frames[0]
  if (frames.some((frame) => frame.width !== width || frame.height !== height)) {
    throw new Error('Every GIF frame has to be the same size.')
  }
  if (width < 1 || height < 1 || width > 4096 || height > 4096) {
    throw new Error('GIF frames must be between 1 and 4096 pixels on a side.')
  }
  const palette = buildPalette(frames)
  let tableSize = 2
  while (tableSize < Math.max(2, palette.colors.length)) tableSize *= 2
  const colorTable = new Uint8Array(tableSize * 3)
  palette.colors.forEach((color, index) => {
    colorTable[index * 3] = color.r
    colorTable[index * 3 + 1] = color.g
    colorTable[index * 3 + 2] = color.b
  })
  const minCodeSize = Math.max(2, Math.round(Math.log2(tableSize)))
  const packed = 0x80 | (7 << 4) | (Math.round(Math.log2(tableSize)) - 1)
  const parts: Uint8Array[] = [
    new TextEncoder().encode('GIF89a'),
    u16(width),
    u16(height),
    new Uint8Array([packed, 0, 0]),
    colorTable,
  ]
  frames.forEach((frame, index) => {
    const delay = Math.max(1, Math.round(frame.delayCs) || 10)
    parts.push(new Uint8Array([0x21, 0xf9, 0x04, 0x00, delay & 255, (delay >> 8) & 255, 0x00, 0x00]))
    parts.push(new Uint8Array([0x2c, 0, 0, 0, 0, ...u16(width), ...u16(height), 0]))
    const indexed = indexFrame(frame, palette)
    const compressed = lzw(indexed, minCodeSize)
    parts.push(new Uint8Array([minCodeSize]))
    parts.push(...subBlocks(compressed))
    if (index === frames.length - 1) parts.push(new Uint8Array([0x3b]))
  })
  return concat(parts)
}

export type DecodedGif = { width: number; height: number; frames: Uint8Array[] }

/** Reads palette indices back out of a GIF this encoder wrote. */
export function decodeGif(bytes: Uint8Array): DecodedGif {
  const header = new TextDecoder().decode(bytes.subarray(0, 6))
  if (header !== 'GIF89a' && header !== 'GIF87a') throw new Error('Not a GIF.')
  const width = bytes[6] | (bytes[7] << 8)
  const height = bytes[8] | (bytes[9] << 8)
  const packed = bytes[10]
  const tableSize = 1 << ((packed & 7) + 1)
  let cursor = 13 + tableSize * 3
  const frames: Uint8Array[] = []
  while (cursor < bytes.length && bytes[cursor] !== 0x3b) {
    if (bytes[cursor] === 0x21) {
      cursor += 2
      let size = bytes[cursor]
      cursor += 1
      while (size) {
        cursor += size
        size = bytes[cursor]
        cursor += 1
      }
      continue
    }
    if (bytes[cursor] !== 0x2c) throw new Error('Unexpected GIF block.')
    const fw = bytes[cursor + 5] | (bytes[cursor + 6] << 8)
    const fh = bytes[cursor + 7] | (bytes[cursor + 8] << 8)
    cursor += 10
    const minCodeSize = bytes[cursor]
    cursor += 1
    const lzwBytes: number[] = []
    let size = bytes[cursor]
    cursor += 1
    while (size) {
      lzwBytes.push(...bytes.subarray(cursor, cursor + size))
      cursor += size
      size = bytes[cursor]
      cursor += 1
    }
    frames.push(lzwDecode(Uint8Array.from(lzwBytes), minCodeSize, fw * fh))
  }
  return { width, height, frames }
}

function lzwDecode(data: Uint8Array, minCodeSize: number, count: number): Uint8Array {
  const clear = 1 << minCodeSize
  const eoi = clear + 1
  let codeSize = minCodeSize + 1
  let next = eoi + 1
  const dict: number[][] = []
  for (let i = 0; i < clear; i += 1) dict[i] = [i]
  let acc = 0
  let nbits = 0
  let pos = 0
  const read = (): number => {
    while (nbits < codeSize) {
      if (pos >= data.length) return eoi
      acc |= data[pos] << nbits
      nbits += 8
      pos += 1
    }
    const code = acc & ((1 << codeSize) - 1)
    acc >>>= codeSize
    nbits -= codeSize
    return code
  }
  const out: number[] = []
  let prev: number[] | null = null
  for (;;) {
    const code = read()
    if (code === eoi || out.length >= count) break
    if (code === clear) {
      dict.length = clear
      for (let i = 0; i < clear; i += 1) dict[i] = [i]
      codeSize = minCodeSize + 1
      next = eoi + 1
      prev = null
      continue
    }
    let entry: number[]
    if (code < next && dict[code]) entry = dict[code]
    else if (prev) entry = [...prev, prev[0]]
    else break
    for (const value of entry) {
      if (out.length < count) out.push(value)
    }
    if (prev && next < 4096) {
      dict[next] = [...prev, entry[0]]
      next += 1
      if (next === 1 << codeSize && codeSize < 12) codeSize += 1
    }
    prev = entry
  }
  return Uint8Array.from(out)
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.04) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const done = () => {
      video.removeEventListener('seeked', done)
      video.removeEventListener('error', fail)
      resolve()
    }
    const fail = () => {
      video.removeEventListener('seeked', done)
      video.removeEventListener('error', fail)
      reject(new Error('Could not seek in this video.'))
    }
    video.addEventListener('seeked', done)
    video.addEventListener('error', fail)
    video.currentTime = time
  })
}

/** Samples a clip into GIF frames. Caps the length so a long video cannot freeze the tab. */
export async function sampleVideoFrames(
  video: HTMLVideoElement,
  options: { start: number; end: number; fps?: number; maxEdge?: number; maxSeconds?: number },
): Promise<{ frames: GifFrame[]; truncated: boolean }> {
  const fps = options.fps ?? 10
  const maxSeconds = options.maxSeconds ?? 8
  const maxEdge = options.maxEdge && options.maxEdge > 0 ? options.maxEdge : 480
  const span = Math.max(0.1, options.end - options.start)
  const used = Math.min(span, maxSeconds)
  const count = Math.max(1, Math.min(80, Math.round(used * fps)))
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth || 1, video.videoHeight || 1))
  const width = Math.max(1, Math.round((video.videoWidth || 1) * scale))
  const height = Math.max(1, Math.round((video.videoHeight || 1) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is unavailable.')
  const frames: GifFrame[] = []
  const delayCs = Math.max(2, Math.round(100 / fps))
  for (let i = 0; i < count; i += 1) {
    const t = options.start + (count === 1 ? 0 : (i * used) / (count - 1))
    await seekTo(video, Math.min(t, options.end))
    ctx.drawImage(video, 0, 0, width, height)
    const image = ctx.getImageData(0, 0, width, height)
    frames.push({ width, height, rgba: image.data, delayCs })
  }
  return { frames, truncated: span - used > 0.05 }
}
