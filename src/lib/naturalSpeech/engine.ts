/**
 * On-device natural speech.
 *
 * Paradee-8M (Apache-2.0, distilled from Kokoro-82M) turns phonemes into a
 * 24 kHz waveform. The pronunciation model and its word lists are Paradee's
 * own G2P, also Apache-2.0. Fetches below download those files and the ONNX
 * runtime. The text itself is never sent anywhere.
 */

import type { InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import type { DictionaryEntry } from './english'
import { ParadeeG2P, type G2PData, type G2PItem } from './g2p'
import { phonemeIds } from './vocab'
import { withBreath } from './wav'
import { isNaturalVoice, languageForVoice, NATURAL_VOICES, type NaturalVoiceId } from './voices'

const ORT_VERSION = '1.31.1'
const PARADEE_COMMIT = '2de547e45da92840a636c499eb0782e988be1e47'
const MISAKI_COMMIT = 'fba1236595f2d2bf21d414ba6e57d25256afada3'
const MODEL_URL = 'https://huggingface.co/sahilmahendrakar/Paradee-8M-v1.3/resolve/main/onnx/paradee_int8.onnx'
const G2P_URL = `https://cdn.jsdelivr.net/gh/sahilmahendrakar/paradee@${PARADEE_COMMIT}/paradee/data/g2p.onnx`
const LEXICON_URL = `https://cdn.jsdelivr.net/gh/sahilmahendrakar/paradee@${PARADEE_COMMIT}/paradee/data/g2p.json.gz`
const DICT_URL = `https://cdn.jsdelivr.net/gh/hexgrad/misaki@${MISAKI_COMMIT}/misaki/data`
const WASM_PATH = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`
const CACHE = 'bitkit-natural-voice'
const MAX_PHONEMES = 510

type Ort = {
  Tensor: new (type: string, data: ArrayBufferView, dims: readonly number[]) => Tensor
  env: { wasm: { wasmPaths: string; numThreads: number } }
  InferenceSession: {
    create(data: ArrayBuffer, options: { executionProviders: string[] }): Promise<InferenceSession>
  }
}

export type VoiceStatus = (message: string) => void

async function cachedBytes(url: string): Promise<ArrayBuffer> {
  let cache: Cache | null = null
  try {
    cache = await caches.open(CACHE)
    const hit = await cache.match(url)
    if (hit) return hit.arrayBuffer()
  } catch {
    cache = null
  }
  const response = await fetch(url)
  if (!response.ok)
    throw new Error('Could not download the natural voice. Check the connection, or use a device voice.')
  const bytes = await response.arrayBuffer()
  if (cache) {
    try {
      await cache.put(url, new Response(bytes.slice(0)))
    } catch {
      /* storage full or private mode — the bytes are still in hand */
    }
  }
  return bytes
}

async function gunzipJson(bytes: ArrayBuffer): Promise<G2PData> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return JSON.parse(await new Response(stream).text()) as G2PData
}

function tensorIds(ort: Ort, ids: number[]): Tensor {
  return new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length])
}

function decodeCtc(values: ArrayLike<number | bigint>, time: number, rowIndex: number, steps: number, outs: string[]) {
  let phonemes = ''
  let previous = 0
  for (let step = 0; step < steps; step++) {
    const raw = values[rowIndex * time + step]
    const id = typeof raw === 'bigint' ? Number(raw) : raw
    if (id !== previous && id !== 0) phonemes += outs[id] ?? ''
    previous = id
  }
  return phonemes
}

async function runRows(
  session: InferenceSession,
  ort: Ort,
  rows: number[][],
): Promise<{ values: ArrayLike<number | bigint>; time: number }> {
  const width = Math.max(...rows.map((row) => row.length))
  const chars = new BigInt64Array(rows.length * width)
  const pad = new Uint8Array(rows.length * width).fill(1)
  rows.forEach((row, rowIndex) => {
    row.forEach((id, column) => {
      chars[rowIndex * width + column] = BigInt(id)
      pad[rowIndex * width + column] = 0
    })
  })
  const result = await session.run({
    chars: new ort.Tensor('int64', chars, [rows.length, width]),
    pad: new ort.Tensor('bool', pad, [rows.length, width]),
  })
  const best = result.best
  return { values: best.data as ArrayLike<number | bigint>, time: best.dims[1] ?? 0 }
}

async function runG2P(session: InferenceSession, ort: Ort, data: G2PData, items: G2PItem[]): Promise<string[]> {
  if (!items.length) return []
  const index = new Map(data.vocab.in.map((char, id) => [char, id]))
  // The published grapheme-to-phoneme code puts a space between the context
  // letter and the word. This vocabulary has no space, and the pad id is
  // pronounced. `<s1>` is the boundary the model treats as a word edge.
  const boundary = index.get(' ') ?? index.get('<s1>') ?? index.get('#') ?? 0
  const rows = items.map(([lang, before, word, after]) => {
    const letters = [...word.toLowerCase()].slice(0, 60)
    return [
      index.get(`<${lang}>`) ?? boundary,
      index.get(before) ?? boundary,
      boundary,
      ...letters.map((char) => index.get(char) ?? boundary),
      boundary,
      index.get(after) ?? boundary,
    ]
  })
  const decoded = await runRows(session, ort, rows)
  return rows.map((row, rowIndex) =>
    decodeCtc(decoded.values, decoded.time, rowIndex, Math.min(3 * row.length, decoded.time), data.vocab.out),
  )
}

class Engine {
  private readonly dictionaries = new Set<string>()

  constructor(
    private readonly ort: Ort,
    private readonly voice: InferenceSession,
    private readonly g2p: ParadeeG2P,
  ) {}

  private async ensureEnglish(lang: 'en-us' | 'en-gb', onStatus?: VoiceStatus) {
    if (this.dictionaries.has(lang)) return
    onStatus?.('Downloading the pronunciation dictionary…')
    const accent = lang === 'en-gb' ? 'gb' : 'us'
    const [gold, silver] = await Promise.all([
      cachedBytes(`${DICT_URL}/${accent}_gold.json`),
      cachedBytes(`${DICT_URL}/${accent}_silver.json`),
    ])
    const parse = (bytes: ArrayBuffer) => JSON.parse(new TextDecoder().decode(bytes)) as Record<string, DictionaryEntry>
    this.g2p.setEnglish(lang, parse(gold), parse(silver))
    this.dictionaries.add(lang)
  }

  private async waveform(phonemes: string, voice: NaturalVoiceId, speed: number): Promise<Float32Array> {
    const ids = phonemeIds(phonemes)
    if (ids.length <= 2) return new Float32Array()
    const index = NATURAL_VOICES.findIndex((item) => item.id === voice)
    const result = await this.voice.run({
      input_ids: tensorIds(this.ort, ids),
      speed: new this.ort.Tensor('float32', Float32Array.of(speed), [1]),
      voice: new this.ort.Tensor('int64', BigInt64Array.of(BigInt(index)), [1]),
    })
    const audio = result.waveform ?? result[this.voice.outputNames[0]]
    return Float32Array.from(audio.data as ArrayLike<number>)
  }

  async synthesize(text: string, voice: NaturalVoiceId, speed: number, onStatus?: VoiceStatus): Promise<Float32Array> {
    const lang = languageForVoice(voice)
    if (lang === 'en-us' || lang === 'en-gb') {
      try {
        await this.ensureEnglish(lang, onStatus)
      } catch {
        /* an unknown word still goes through the small pronunciation model */
      }
    }
    const pieces: Float32Array[] = []
    for (const sentence of text.split(/(?<=[.!?…])\s+|(?<=[।॥])\s*|\n+/u)) {
      const trimmed = sentence.trim()
      if (!trimmed) continue
      let phonemes = await this.g2p.phonemize(trimmed, lang)
      while (phonemes.length > MAX_PHONEMES) {
        let cut = phonemes.lastIndexOf(' ', MAX_PHONEMES)
        if (cut <= 0) cut = MAX_PHONEMES
        pieces.push(await this.waveform(phonemes.slice(0, cut), voice, speed))
        phonemes = phonemes.slice(cut).trimStart()
      }
      if (phonemes.trim()) pieces.push(await this.waveform(phonemes, voice, speed))
    }
    const total = pieces.reduce((sum, piece) => sum + piece.length, 0)
    const joined = new Float32Array(total)
    let offset = 0
    for (const piece of pieces) {
      joined.set(piece, offset)
      offset += piece.length
    }
    return joined.length ? withBreath(joined) : joined
  }
}

let loading: Promise<Engine> | null = null

async function create(onStatus?: VoiceStatus): Promise<Engine> {
  onStatus?.('Downloading the natural voice…')
  const ort = (await import('onnxruntime-web/wasm')) as unknown as Ort
  ort.env.wasm.wasmPaths = WASM_PATH
  ort.env.wasm.numThreads = 1
  const [model, g2pModel, lexicon] = await Promise.all([
    cachedBytes(MODEL_URL),
    cachedBytes(G2P_URL),
    cachedBytes(LEXICON_URL),
  ])
  onStatus?.('Starting the voice…')
  const data = await gunzipJson(lexicon)
  const [voice, g2pSession] = await Promise.all([
    ort.InferenceSession.create(model, { executionProviders: ['wasm'] }),
    ort.InferenceSession.create(g2pModel, { executionProviders: ['wasm'] }),
  ])
  const g2p = new ParadeeG2P(data, (items) => runG2P(g2pSession, ort, data, items))
  return new Engine(ort, voice, g2p)
}

function engine(onStatus?: VoiceStatus): Promise<Engine> {
  if (!loading) {
    loading = create(onStatus).catch((error: unknown) => {
      loading = null
      throw error
    })
  }
  return loading
}

export async function synthesize(
  text: string,
  voice: string,
  speed: number,
  onStatus?: VoiceStatus,
): Promise<Float32Array> {
  if (!isNaturalVoice(voice)) throw new Error('That voice is not available.')
  const ready = await engine(onStatus)
  const rate = Math.min(2, Math.max(0.5, speed))
  return ready.synthesize(text, voice, rate, onStatus)
}
