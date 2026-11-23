/**
 * Kruti Dev 010 ↔ Unicode Devanagari.
 *
 * Kruti Dev stores letters on a Latin keyboard, and two marks are typed in
 * a different order from Unicode: short i (`f`) comes before the consonant,
 * and reph (`Z`) comes after it. The maps below are the public 010 key
 * table; the two reorders put those marks where Unicode expects them.
 */

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['vkS', 'औ'],
  ['vks', 'ओ'],
  ['[k+', 'ख़'],
  ['[k', 'ख'],
  ['?k', 'घ'],
  ['.k', 'ण'],
  ['Fk', 'थ'],
  ['/k', 'ध'],
  ['Hk', 'भ'],
  ["'k", 'श'],
  ['"k', 'ष'],
  ['{k', 'क्ष'],
  ['Q+', 'फ़'],
  ['t+', 'ज़'],
  ['x+', 'ग़'],
  ['d+', 'क़'],
  ['M+', 'ड़'],
  ['<+', 'ढ़'],
  ['kS', 'ौ'],
  ['ks', 'ो'],
  ['vk', 'आ'],
  ['bZ', 'ई'],
  [',s', 'ऐ'],
  ['v', 'अ'],
  ['b', 'इ'],
  ['m', 'उ'],
  ['Å', 'ऊ'],
  [',', 'ए'],
  ['_', 'ऋ'],
  ['d', 'क'],
  ['x', 'ग'],
  ['p', 'च'],
  ['N', 'छ'],
  ['t', 'ज'],
  ['V', 'ट'],
  ['B', 'ठ'],
  ['M', 'ड'],
  ['<', 'ढ'],
  ['r', 'त'],
  ['n', 'द'],
  ['u', 'न'],
  ['i', 'प'],
  ['Q', 'फ'],
  ['c', 'ब'],
  ['e', 'म'],
  [';', 'य'],
  ['j', 'र'],
  ['y', 'ल'],
  ['o', 'व'],
  ['l', 'स'],
  ['g', 'ह'],
  ['³', 'ङ'],
  ['¥', 'ञ'],
  ['k', 'ा'],
  ['h', 'ी'],
  ['q', 'ु'],
  ['w', 'ू'],
  ['`', 'ृ'],
  ['s', 'े'],
  ['S', 'ै'],
  ['a', 'ं'],
  ['%', 'ः'],
  ['A', '।'],
  ['~', '्'],
  ['=', 'त्र'],
  ['K', 'ज्ञ'],
  ['J', 'श्र'],
  [')', 'द्ध'],
  ['}', 'द्व'],
]

const SORTED = [...PAIRS].sort((a, b) => b[0].length - a[0].length)
const REVERSED = [...PAIRS].map(([kruti, uni]) => [uni, kruti] as const).sort((a, b) => b[0].length - a[0].length)

const CONSONANT = /[\u0915-\u0939\u0958-\u095F]/
const MATRA = /[\u093E-\u094C\u0902\u0901\u0903]/

function apply(input: string, pairs: ReadonlyArray<readonly [string, string]>): string {
  let out = input
  for (const [from, to] of pairs) out = out.split(from).join(to)
  return out
}

function clusterAt(text: string, start: number): string {
  if (!CONSONANT.test(text[start] ?? '')) return ''
  let end = start + 1
  if (text[end] === '\u093C') end += 1
  while (text[end] === '\u094D' && CONSONANT.test(text[end + 1] ?? '')) {
    end += 2
    if (text[end] === '\u093C') end += 1
  }
  return text.slice(start, end)
}

/** `f` is typed before the consonant. Unicode stores ि after it. */
function moveShortI(text: string): string {
  let out = text
  let i = out.indexOf('f')
  while (i !== -1) {
    const cluster = clusterAt(out, i + 1)
    if (!cluster) {
      i = out.indexOf('f', i + 1)
      continue
    }
    out = out.slice(0, i) + cluster + 'ि' + out.slice(i + 1 + cluster.length)
    i = out.indexOf('f', i + cluster.length)
  }
  return out
}

/** `Z` is typed after the consonant. Unicode stores र् before it. */
function moveReph(text: string): string {
  let out = text
  let i = out.indexOf('Z')
  while (i !== -1) {
    let j = i - 1
    while (j >= 0 && MATRA.test(out[j] ?? '')) j -= 1
    const clusterEnd = j + 1
    while (j >= 0 && (CONSONANT.test(out[j] ?? '') || out[j] === '\u093C' || out[j] === '\u094D')) j -= 1
    const clusterStart = j + 1
    if (clusterStart >= clusterEnd) {
      i = out.indexOf('Z', i + 1)
      continue
    }
    const cluster = out.slice(clusterStart, i)
    out = `${out.slice(0, clusterStart)}र्${cluster}${out.slice(i + 1)}`
    i = out.indexOf('Z', clusterStart + 2)
  }
  return out
}

export function krutiToUnicode(input: string): string {
  return moveReph(moveShortI(apply(input, SORTED)))
}

export function unicodeToKruti(input: string): string {
  let text = input.replace(/\u0930\u094D([\u0915-\u0939]\u093C?)/g, (_, consonant: string) => `${consonant}\u0000`)
  text = text.replace(
    /([\u0915-\u0939]\u093C?(?:\u094D[\u0915-\u0939]\u093C?)*)\u093F/g,
    (_, cluster: string) => `f${cluster}`,
  )
  return apply(text, REVERSED).replaceAll('\u0000', 'Z')
}
