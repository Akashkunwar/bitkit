/**
 * Text → the phonemes Paradee was trained on, without eSpeak.
 *
 * Port of `paradee/g2p.py` (Apache-2.0). Hindi, French, and Spanish come
 * straight from the small G2P model. English lexicon hits are already in
 * misaki's spelling; words the lexicon misses go through the model and then
 * `toMisaki`, because the model was trained to copy eSpeak.
 */

import { expandEnglishNumbers, englishCardinal, englishWord, type DictionaryEntry } from './english'
import { toMisaki } from './toMisaki'
import type { NaturalLang } from './voices'

export type G2PData = {
  vocab: { in: string[]; out: string[] }
  numbers: Record<string, Record<string, string>>
  lexicon: Record<string, { w: Record<string, string>; c: Record<string, string> }>
}

export type G2PItem = readonly [lang: string, before: string, word: string, after: string]

const PERCENT: Record<string, string> = { hi: 'प्रतिशत', fr: 'pour cent', es: 'por ciento' }
const DEVANAGARI = '०१२३४५६७८९'
const SOFT: Record<string, string> = { b: 'β', d: 'ð', ɡ: 'ɣ' }

type Word = { core: string | null; lead: boolean; trail: boolean }
type Piece = { kind: 'number' | 'word'; piece: string }
type Id = { kind: 'text'; value: string } | { kind: 'job'; index: number }
type Plan = { lead: string; ids: Id[] | null; trail: string }

function isEdge(char: string): boolean {
  return /\p{P}|\p{S}|\p{Z}/u.test(char) || '\u200b\u200c\u200d\ufeff'.includes(char)
}

function isAlnum(char: string): boolean {
  return /\p{L}|\p{N}/u.test(char)
}

function stripEdges(word: string): string {
  const chars = [...word]
  let start = 0
  let end = chars.length
  while (start < end && isEdge(chars[start])) start++
  while (end > start && isEdge(chars[end - 1])) end--
  return chars.slice(start, end).join('')
}

function analyze(raw: string): Word {
  const core = stripEdges(raw)
  if (!core || ![...core].some(isAlnum)) return { core: null, lead: true, trail: true }
  const at = raw.indexOf(core)
  return { core, lead: at > 0, trail: at + core.length < raw.length }
}

function contexts(words: Word[]): Array<{ before: string; after: string } | null> {
  return words.map((word, i) => {
    if (!word.core) return null
    let before = '#'
    const prev = i > 0 ? words[i - 1] : undefined
    if (prev?.core && !word.lead && !prev.trail) before = [...prev.core].at(-1)!.toLowerCase()
    let after = '#'
    const next = words[i + 1]
    if (next?.core && !word.trail && !next.lead) after = [...next.core][0].toLowerCase()
    return { before, after }
  })
}

function unstress(phonemes: string): string {
  return phonemes.replaceAll('ˈ', '').replaceAll('ˌ', '')
}

function hindiNumber(n: number, table: Record<string, string>): string[] {
  if (n < 100) return [table[String(n)] ?? '']
  const out: string[] = []
  let rest = n
  for (const [div, name] of [
    [10 ** 7, 'crore'],
    [10 ** 5, 'lakh'],
    [1000, 'thousand'],
  ] as const) {
    if (rest >= div) {
      out.push(...hindiNumber(Math.floor(rest / div), table), table[name] ?? '')
      rest %= div
    }
  }
  if (rest >= 100) {
    out.push(table[String(Math.floor(rest / 100) * 100)] ?? '')
    rest %= 100
  }
  if (rest) out.push(table[String(rest)] ?? '')
  return out
}

function frenchNumber(n: number, table: Record<string, string>, top = true): string[] {
  const out: string[] = []
  let rest = n
  for (const [div, one, many] of [
    [10 ** 9, 'milliard', 'milliards'],
    [10 ** 6, 'million', 'millions'],
  ] as const) {
    if (rest >= div) {
      const q = Math.floor(rest / div)
      out.push(...(q === 1 ? ['œ̃'] : frenchNumber(q, table, false)), table[q === 1 ? one : many] ?? '')
      rest %= div
    }
  }
  if (rest >= 1000) {
    const q = Math.floor(rest / 1000)
    out.push(...(q === 1 ? [] : frenchNumber(q, table, false)), table.thousand ?? '')
    rest %= 1000
  }
  if (rest >= 100) {
    out.push(table[String(Math.floor(rest / 100) * 100)] ?? '')
    rest %= 100
  }
  if (rest || out.length === 0) out.push(table[String(rest)] ?? '')
  if (!top) return out
  return [...out.slice(0, -1).map(unstress), out.at(-1) ?? '']
}

function spanishNumber(n: number, table: Record<string, string>): string[] {
  const out: string[] = []
  let rest = n
  if (rest >= 10 ** 6) {
    const q = Math.floor(rest / 10 ** 6)
    out.push(...(q === 1 ? [table['millón'] ?? ''] : [...spanishNumber(q, table), table.millones ?? '']))
    rest %= 10 ** 6
  }
  if (rest >= 1000) {
    const q = Math.floor(rest / 1000)
    if (q === 1) out.push(table.thousand ?? '')
    else {
      const parts = spanishNumber(q, table)
      if (q % 10 === 1 && q % 100 !== 11 && parts.at(-1)?.endsWith('o')) {
        parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1)
      }
      out.push(...parts, table.thousand ?? '')
    }
    rest %= 1000
  }
  if (rest >= 100) {
    const hundreds = Math.floor(rest / 100) * 100
    rest %= 100
    out.push(table[hundreds === 100 && rest ? '100+' : String(hundreds)] ?? '')
  }
  if (rest || out.length === 0) out.push(table[String(rest)] ?? '')
  return out
}

function soften(phonemes: string, before: string): string {
  let i = 0
  while (i < phonemes.length && (phonemes[i] === 'ˈ' || phonemes[i] === 'ˌ')) i++
  const char = phonemes[i] ?? ''
  if (char in SOFT && !'#nmɲŋ'.includes(before) && !(char === 'd' && before === 'l')) {
    return phonemes.slice(0, i) + SOFT[char] + phonemes.slice(i + 1)
  }
  return phonemes
}

function prepare(text: string, lang: NaturalLang): string {
  let next = [...text]
    .map((char) => {
      const digit = DEVANAGARI.indexOf(char)
      return digit >= 0 ? String(digit) : char
    })
    .join('')
  next = next.replaceAll('«', '“').replaceAll('»', '”')
  next = [...next].filter((char) => !'\u200b\u200c\u200d\ufeff'.includes(char)).join('')
  next = next.replace(/([।॥])(?=\S)/g, '$1 ')
  if (lang === 'fr') next = next.replace(/(?<=\d)[ \u00a0\u202f](?=\d{3}\b)/g, '')
  if (lang === 'hi' || lang === 'fr' || lang === 'es') {
    next = next.replace(/(\d)\s?%/g, `$1 ${PERCENT[lang]}`)
  }
  if (lang === 'en-us' || lang === 'en-gb') next = expandEnglishNumbers(next)
  return next
}

export class ParadeeG2P {
  private readonly english = new Map<
    string,
    { gold: Record<string, DictionaryEntry>; silver: Record<string, DictionaryEntry> }
  >()

  constructor(
    private readonly data: G2PData,
    private readonly model: (items: G2PItem[]) => Promise<string[]>,
  ) {}

  /** American or British dictionary from misaki. Already in the voice's spelling. */
  setEnglish(lang: 'en-us' | 'en-gb', gold: Record<string, DictionaryEntry>, silver: Record<string, DictionaryEntry>) {
    this.english.set(lang, { gold, silver })
  }

  private number(n: number, lang: 'hi' | 'fr' | 'es', before = '#'): string {
    const table = this.data.numbers[lang] ?? {}
    const parts =
      lang === 'hi' ? hindiNumber(n, table) : lang === 'fr' ? frenchNumber(n, table) : spanishNumber(n, table)
    if (lang !== 'es') return parts.join(' ')
    const soft: string[] = []
    for (const part of parts) soft.push(soften(part, soft.length === 0 ? before : (soft.at(-1)?.at(-1) ?? before)))
    return soft.join(' ')
  }

  private say(
    lang: NaturalLang,
    word: string,
    next: string | null,
    before: string,
    after: string,
    jobs: Array<{ word: string; before: string; after: string }>,
    ids: Id[],
  ) {
    const dict = lang === 'en-us' || lang === 'en-gb' ? this.english.get(lang) : undefined
    const parts = word.split('-').filter(Boolean)
    const said = dict
      ? parts.map((bit, bitIndex) =>
          englishWord(dict.gold, dict.silver, bit, bitIndex === parts.length - 1 ? next : parts[bitIndex + 1]),
        )
      : []
    if (said.length > 0 && said.every((phonemes): phonemes is string => Boolean(phonemes))) {
      ids.push({ kind: 'text', value: said.join(' ') })
      return
    }
    jobs.push({ word, before, after })
    ids.push({ kind: 'job', index: jobs.length - 1 })
  }

  private async pronounce(
    lang: NaturalLang,
    items: Array<{ word: string; before: string; after: string }>,
  ): Promise<string[]> {
    const entry = this.data.lexicon[lang] ?? { w: {}, c: {} }
    const out: Array<string | null> = items.map((item) => {
      const context = entry.c[`${item.word}\t${item.before}\t${item.after}`]
      return context || entry.w[item.word] || entry.w[item.word.toLowerCase()] || null
    })
    const missing = out.flatMap((phonemes, index) => (phonemes == null ? [index] : []))
    const predicted = await this.model(
      missing.map((index) => [lang, items[index].before, items[index].word, items[index].after]),
    )
    const english = lang === 'en-us' || lang === 'en-gb'
    missing.forEach((index, nth) => {
      const raw = predicted[nth] ?? ''
      out[index] = english ? toMisaki(raw, lang === 'en-gb') : raw
    })
    return out.map((phonemes) => phonemes ?? '')
  }

  async phonemize(text: string, lang: NaturalLang): Promise<string> {
    const prepared = prepare(text, lang)
    const raws = prepared.split(/\s+/).filter(Boolean)
    const words = raws.map(analyze)
    const around = contexts(words)
    const jobs: Array<{ word: string; before: string; after: string }> = []
    const plan: Plan[] = []

    raws.forEach((raw, index) => {
      const word = words[index]
      const ctx = around[index] ?? { before: '#', after: '#' }
      if (!word?.core) {
        plan.push({ lead: raw, ids: null, trail: '' })
        return
      }
      const at = raw.indexOf(word.core)
      const pieces: Piece[] = []
      for (const piece of word.core.match(/\d+|[^\d]+/g) ?? []) {
        if (/^\d+$/.test(piece)) pieces.push({ kind: 'number', piece })
        else {
          const trimmed = piece.replace(/^[-.,/:]+|[-.,/:]+$/g, '')
          if ([...trimmed].some(isAlnum)) pieces.push({ kind: 'word', piece: trimmed })
        }
      }
      const ids: Id[] = []
      pieces.forEach((part, pieceIndex) => {
        const first = pieceIndex === 0
        const last = pieceIndex === pieces.length - 1
        if (part.kind === 'number') {
          if (lang === 'en-us' || lang === 'en-gb') {
            const spoken =
              part.piece.length >= 10 || !Number.isSafeInteger(Number(part.piece))
                ? [...part.piece].map((digit) => englishCardinal(Number(digit)))
                : englishCardinal(Number(part.piece)).split(' ')
            const afterNumber = last
              ? (words.slice(index + 1).find((item) => item.core)?.core ?? null)
              : (pieces[pieceIndex + 1]?.piece ?? null)
            spoken.forEach((token, tokenIndex) => {
              this.say(lang, token, spoken[tokenIndex + 1] ?? afterNumber, '#', '#', jobs, ids)
            })
          } else if (part.piece.length < 10) {
            ids.push({ kind: 'text', value: this.number(Number(part.piece), lang, first ? ctx.before : '#') })
          } else {
            ids.push({
              kind: 'text',
              value: [...part.piece].map((digit) => this.number(Number(digit), lang)).join(' '),
            })
          }
        } else {
          const next = !last
            ? (pieces[pieceIndex + 1]?.piece ?? null)
            : (words.slice(index + 1).find((item) => item.core)?.core ?? null)
          this.say(lang, part.piece, next, first ? ctx.before : '#', last ? ctx.after : '#', jobs, ids)
        }
      })
      plan.push({ lead: raw.slice(0, at), ids, trail: raw.slice(at + word.core.length) })
    })

    const said = await this.pronounce(lang, jobs)
    return plan
      .map((item) => {
        if (!item.ids) return item.lead
        const body = item.ids.map((id) => (id.kind === 'text' ? id.value : said[id.index])).join(' ')
        return item.lead + body + item.trail
      })
      .join(' ')
      .replaceAll('-', '')
  }
}
