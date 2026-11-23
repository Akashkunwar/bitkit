const RATE = 24000

/** 16-bit mono WAV bytes. The page plays these; nothing is uploaded. */
export function wavBytes(samples: Float32Array, sampleRate = RATE): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Uint8Array(buffer)
}

export function encodeWav(samples: Float32Array, sampleRate = RATE): Blob {
  const bytes = wavBytes(samples, sampleRate)
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' })
}

/** A few milliseconds of silence so one sentence doesn't crash into the next. */
export function withBreath(samples: Float32Array, ms = 70, sampleRate = RATE): Float32Array {
  const out = new Float32Array(samples.length + Math.round((sampleRate * ms) / 1000))
  out.set(samples)
  return out
}
