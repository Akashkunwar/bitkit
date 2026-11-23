import { describe, expect, it } from 'vitest'
import { expandEnglishNumbers, englishCardinal, englishWord } from '../lib/naturalSpeech/english'
import { ParadeeG2P, type G2PData } from '../lib/naturalSpeech/g2p'
import { toMisaki } from '../lib/naturalSpeech/toMisaki'
import { phonemeIds } from '../lib/naturalSpeech/vocab'
import { wavBytes } from '../lib/naturalSpeech/wav'
import { wordAt } from '../lib/speech'

const data: G2PData = {
  vocab: { in: ['<en-us>', '<hi>', '#', ' ', 'a'], out: ['<blank>', 'h', 'ə'] },
  numbers: { hi: { '0': 'zɪɾo', '1': 'ˈeːk', '21': 'ɪkkˈiːs' }, fr: {}, es: {} },
  lexicon: {
    'en-us': { w: { hello: 'həlˈO', be: 'be' }, c: {} },
    hi: { w: {}, c: {} },
  },
}

describe('natural speech', () => {
  it('reads years as words and keeps letters beside a digit', () => {
    expect(englishCardinal(2026)).toBe('two thousand twenty six')
    expect(expandEnglishNumbers('In 2026, a 3D chart.')).toBe('In two thousand twenty six, a three D chart.')
    expect(expandEnglishNumbers('Call 5551234567.')).toContain('five five five')
  })

  it('maps eSpeak diphthongs into the spelling the English voice learned', () => {
    expect(toMisaki('həˈloʊ')).toBe('həˈlO')
    expect(toMisaki('eə', true)).toContain('ɛː')
  })

  it('keeps a known English word and converts only model output', async () => {
    const seen: string[] = []
    const g2p = new ParadeeG2P(data, async (items) => {
      seen.push(...items.map((item) => item[2]))
      return items.map(() => 'həˈloʊ')
    })
    expect(await g2p.phonemize('hello.', 'en-us')).toBe('həlˈO.')
    expect(seen).toEqual([])
    expect(await g2p.phonemize('be', 'en-us')).toBe('be')
    expect(await g2p.phonemize('zz', 'en-us')).toBe('həˈlO')
    expect(seen).toEqual(['zz'])
  })

  it('uses the English dictionary for everyday words', async () => {
    expect(englishWord({ the: 'ði', to: 'tu', hello: 'həlˈO' }, { works: 'wˈɜɹks' }, 'hello', null)).toBe('həlˈO')
    expect(englishWord({ the: 'ði' }, null, 'the', 'apple')).toBe('ði')
    expect(englishWord({ the: 'ði' }, null, 'the', 'book')).toBe('ðə')
    expect(englishWord({ a: 'A' }, null, 'a', 'cat')).toBe('ɐ')
    expect(englishWord({ to: 'tu' }, null, 'to', 'store')).toBe('tə')
    expect(englishWord({ to: 'tu' }, null, 'to', 'apple')).toBe('tʊ')
    expect(englishWord({}, { works: 'wˈɜɹks' }, 'works', null)).toBe('wˈɜɹks')
    const g2p = new ParadeeG2P(data, async () => ['nope'])
    g2p.setEnglish('en-us', { hello: 'həlˈO', on: 'ˈɔn', device: 'dəvˈIs' }, {})
    expect(await g2p.phonemize('hello on-device', 'en-us')).toBe('həlˈO ˈɔn dəvˈIs')
  })

  it('reads a Hindi number from the table instead of the model', async () => {
    const g2p = new ParadeeG2P(data, async () => ['nope'])
    expect(await g2p.phonemize('21', 'hi')).toBe('ɪkkˈiːs')
  })

  it('pads phoneme ids and drops letters the voice cannot say', () => {
    expect(phonemeIds('həlˈO')).toEqual([
      0,
      phonemeIds('h')[1],
      phonemeIds('ə')[1],
      phonemeIds('l')[1],
      phonemeIds('ˈ')[1],
      phonemeIds('O')[1],
      0,
    ])
    expect(phonemeIds('★')).toEqual([0, 0])
  })

  it('writes a wav header around the samples', () => {
    const bytes = wavBytes(Float32Array.of(0, 0.5, -1))
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('WAVE')
    expect(bytes.length).toBe(44 + 6)
  })

  it('highlights the word under a playback position', () => {
    expect(wordAt('hear this aloud', 6)).toEqual({ start: 5, end: 9 })
    expect(wordAt('hear this aloud', 0)).toEqual({ start: 0, end: 4 })
  })
})
