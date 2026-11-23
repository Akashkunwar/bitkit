/**
 * Roman ↔ Devanagari for names and short phrases.
 *
 * Vowels are written out: a aa i ee u oo e ai o au. A consonant before
 * another consonant takes a halant (namaste → नमस्ते). A consonant at the
 * end of a word keeps the implicit schwa in writing (kit → किट). Retroflex
 * stops are doubled: tt ट, tth ठ, dd ड, ddh ढ. Long aa is "aa", long ee is
 * "ee" (or "ii"), long oo is "oo" (or "uu").
 */

const PAIRS: [string, string][] = [
  ['ksh', 'क्ष'],
  ['tth', 'ठ'],
  ['ddh', 'ढ'],
  ['chh', 'छ'],
  ['kh', 'ख'],
  ['gh', 'घ'],
  ['jh', 'झ'],
  ['th', 'थ'],
  ['dh', 'ध'],
  ['ph', 'फ'],
  ['bh', 'भ'],
  ['sh', 'श'],
  ['ng', 'ङ'],
  ['ny', 'ञ'],
  ['tt', 'ट'],
  ['dd', 'ड'],
  ['k', 'क'],
  ['g', 'ग'],
  ['c', 'च'],
  ['j', 'ज'],
  ['t', 'त'],
  ['d', 'द'],
  ['n', 'न'],
  ['p', 'प'],
  ['b', 'ब'],
  ['m', 'म'],
  ['y', 'य'],
  ['r', 'र'],
  ['l', 'ल'],
  ['v', 'व'],
  ['w', 'व'],
  ['s', 'स'],
  ['h', 'ह'],
]

const VOWELS: [string, string, string][] = [
  ['aa', 'आ', 'ा'],
  ['ai', 'ऐ', 'ै'],
  ['au', 'औ', 'ौ'],
  ['ee', 'ई', 'ी'],
  ['ii', 'ई', 'ी'],
  ['oo', 'ऊ', 'ू'],
  ['uu', 'ऊ', 'ू'],
  ['a', 'अ', ''],
  ['i', 'इ', 'ि'],
  ['u', 'उ', 'ु'],
  ['e', 'ए', 'े'],
  ['o', 'ओ', 'ो'],
]

const HALANT = '्'

const CONS_SET = new Set(PAIRS.map(([, dev]) => dev))

function matchToken(source: string, at: number, table: { latin: string }[]): number {
  const slice = source.slice(at).toLowerCase()
  let best = -1
  for (let i = 0; i < table.length; i += 1) {
    if (slice.startsWith(table[i].latin) && (best < 0 || table[i].latin.length > table[best].latin.length)) best = i
  }
  return best
}

const CONS = PAIRS.map(([latin, dev]) => ({ latin, dev }))
const VOWS = VOWELS.map(([latin, independent, matra]) => ({ latin, independent, matra }))

function transliterateWord(word: string): string {
  let out = ''
  let i = 0
  while (i < word.length) {
    const cons = matchToken(word, i, CONS)
    if (cons >= 0) {
      const base = CONS[cons].dev
      i += CONS[cons].latin.length
      const vow = matchToken(word, i, VOWS)
      if (vow >= 0) {
        out += base + VOWS[vow].matra
        i += VOWS[vow].latin.length
      } else if (i < word.length && matchToken(word, i, CONS) >= 0) {
        out += base + HALANT
      } else {
        out += base
      }
      continue
    }
    const vow = matchToken(word, i, VOWS)
    if (vow >= 0) {
      out += VOWS[vow].independent
      i += VOWS[vow].latin.length
      continue
    }
    out += word[i]
    i += 1
  }
  return out
}

export function toDevanagari(input: string): string {
  return input.replace(/[A-Za-z]+/g, (word) => transliterateWord(word))
}

const REVERSE_CONS = [...PAIRS].sort((a, b) => b[1].length - a[1].length)
const MATRA: Record<string, string> = {}
const INDEPENDENT: Record<string, string> = {}
for (const [latin, independent, matra] of VOWELS) {
  if (matra && !MATRA[matra]) MATRA[matra] = latin === 'ii' ? 'ee' : latin === 'uu' ? 'oo' : latin
  if (!INDEPENDENT[independent]) INDEPENDENT[independent] = latin === 'ii' ? 'ee' : latin === 'uu' ? 'oo' : latin
}

function reverseWord(word: string): string {
  let out = ''
  const chars = [...word]
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    if (INDEPENDENT[ch]) {
      out += INDEPENDENT[ch]
      continue
    }
    if (MATRA[ch] || ch === HALANT) continue
    const pair = REVERSE_CONS.find(([, dev]) => dev === ch)
    if (!pair) {
      out += ch
      continue
    }
    out += pair[0]
    const next = chars[i + 1]
    if (next && MATRA[next]) out += MATRA[next]
    else if (next === HALANT) {
      /* consonant cluster */
    } else if (next && (CONS_SET.has(next) || INDEPENDENT[next])) out += 'a'
    else if (!next) {
      /* final consonant keeps no extra vowel in the romanisation */
    } else out += 'a'
  }
  return out
}

export function toRoman(input: string): string {
  return input.replace(/[\u0900-\u097F]+/g, (word) => reverseWord(word))
}
