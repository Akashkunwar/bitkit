export type NoiseColour = 'white' | 'pink' | 'brown' | 'blue' | 'grey'

export const NOISE_COLOURS: { value: NoiseColour; label: string; note: string }[] = [
  { value: 'white', label: 'White', note: 'Equal energy per frequency. Bright, hissy.' },
  { value: 'pink', label: 'Pink', note: 'Falls 3 dB per octave. Closest to rainfall.' },
  { value: 'brown', label: 'Brown', note: 'Falls 6 dB per octave. Deep, like distant surf.' },
  { value: 'blue', label: 'Blue', note: 'Rises with frequency. Very bright; masks hiss.' },
  { value: 'grey', label: 'Grey', note: 'Shaped to sound equally loud across the range.' },
]

/**
 * Fills a buffer with the requested noise colour.
 *
 * White is raw uniform noise. Pink uses the Voss-McCartney style filter
 * (Paul Kellet's economical coefficients); brown is an integrated random walk;
 * blue and grey are derived from those by differencing and gentle shaping.
 */
export function fillNoise(channel: Float32Array, colour: NoiseColour): void {
  const n = channel.length
  if (colour === 'white') {
    for (let i = 0; i < n; i += 1) channel[i] = Math.random() * 2 - 1
    return
  }

  if (colour === 'brown') {
    let last = 0
    for (let i = 0; i < n; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      channel[i] = last * 3.5
    }
    return
  }

  if (colour === 'blue') {
    // Differencing white noise tilts the spectrum upwards by 6 dB/octave.
    let prev = 0
    for (let i = 0; i < n; i += 1) {
      const white = Math.random() * 2 - 1
      channel[i] = (white - prev) * 0.5
      prev = white
    }
    return
  }

  // Pink, and grey as a slightly flattened pink.
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  const tilt = colour === 'grey' ? 0.6 : 1
  for (let i = 0; i < n; i += 1) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
    b6 = white * 0.115926
    channel[i] = (pink * 0.11 * tilt + white * (1 - tilt) * 0.3)
  }
}

/** Seconds of audio to generate for the looping buffer. */
const LOOP_SECONDS = 4

export type NoiseEngine = {
  start: (colour: NoiseColour) => void
  stop: () => void
  setColour: (colour: NoiseColour) => void
  setVolume: (value: number) => void
  /** 0 disables the low-pass entirely. */
  setTone: (hz: number) => void
  fadeOut: (seconds: number) => void
  isRunning: () => boolean
  close: () => void
}

export function createNoiseEngine(): NoiseEngine {
  let ctx: AudioContext | null = null
  let source: AudioBufferSourceNode | null = null
  let gain: GainNode | null = null
  let filter: BiquadFilterNode | null = null
  let volume = 0.4
  let tone = 0
  let running = false

  const ensure = () => {
    if (!ctx) {
      ctx = new AudioContext()
      gain = ctx.createGain()
      filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 20_000
      filter.connect(gain)
      gain.connect(ctx.destination)
    }
    return ctx
  }

  const buildBuffer = (colour: NoiseColour) => {
    const audio = ensure()
    const buffer = audio.createBuffer(1, audio.sampleRate * LOOP_SECONDS, audio.sampleRate)
    fillNoise(buffer.getChannelData(0), colour)
    return buffer
  }

  const stopSource = () => {
    if (source) {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
      source.disconnect()
      source = null
    }
  }

  const play = (colour: NoiseColour) => {
    const audio = ensure()
    void audio.resume()
    stopSource()
    source = audio.createBufferSource()
    source.buffer = buildBuffer(colour)
    source.loop = true
    if (filter) source.connect(filter)
    source.start()
    if (gain) {
      // Ramp in, so starting playback is not a click.
      gain.gain.cancelScheduledValues(audio.currentTime)
      gain.gain.setValueAtTime(0.0001, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), audio.currentTime + 0.4)
    }
    running = true
  }

  return {
    start: play,
    setColour: (colour) => {
      if (running) play(colour)
    },
    stop: () => {
      stopSource()
      running = false
    },
    setVolume: (value) => {
      volume = Math.min(1, Math.max(0, value))
      if (gain && ctx) gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05)
    },
    setTone: (hz) => {
      tone = hz
      if (filter && ctx) {
        filter.frequency.setTargetAtTime(hz > 0 ? hz : 20_000, ctx.currentTime, 0.05)
      }
    },
    fadeOut: (seconds) => {
      if (!gain || !ctx) return
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.1, seconds))
      window.setTimeout(() => {
        stopSource()
        running = false
      }, seconds * 1000 + 120)
    },
    isRunning: () => running,
    close: () => {
      stopSource()
      void ctx?.close()
      ctx = null
      gain = null
      filter = null
      running = false
      void tone
    },
  }
}

// --- level metering ---

export type Level = { rms: number; peak: number; db: number; peakDb: number }

/** Full-scale RMS converted to dBFS; the floor keeps log() finite on silence. */
export function toDb(value: number): number {
  return 20 * Math.log10(Math.max(value, 1e-7))
}

export function measure(buffer: Float32Array): Level {
  let sum = 0
  let peak = 0
  for (let i = 0; i < buffer.length; i += 1) {
    const v = buffer[i]
    sum += v * v
    const abs = Math.abs(v)
    if (abs > peak) peak = abs
  }
  const rms = Math.sqrt(sum / Math.max(1, buffer.length))
  return { rms, peak, db: toDb(rms), peakDb: toDb(peak) }
}

/**
 * A browser cannot know the microphone's real sensitivity, so absolute SPL is
 * not available. This maps dBFS onto a rough SPL scale using the common
 * assumption that 0 dBFS is about 94 dB SPL — useful for comparison, not for
 * anything that matters legally or medically.
 */
export function estimateSpl(dbfs: number, calibration = 94): number {
  return Math.max(0, dbfs + calibration)
}

export const SPL_REFERENCE: { db: number; label: string }[] = [
  { db: 30, label: 'Whisper, quiet room' },
  { db: 45, label: 'Library, soft speech' },
  { db: 60, label: 'Normal conversation' },
  { db: 70, label: 'Busy street, vacuum' },
  { db: 85, label: 'Hearing damage over 8 hours' },
  { db: 100, label: 'Concert, power tools' },
  { db: 120, label: 'Pain threshold' },
]

export function referenceFor(spl: number): string {
  let closest = SPL_REFERENCE[0]
  for (const entry of SPL_REFERENCE) {
    if (spl >= entry.db) closest = entry
  }
  return closest.label
}
