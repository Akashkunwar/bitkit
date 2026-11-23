/**
 * eSpeak-style phonemes → the spelling Paradee's English voices were trained on.
 *
 * Adapted from Paradee's `web/misaki.js` (Apache-2.0), which ports misaki's
 * EspeakFallback table. Lexicon hits are already in that spelling and must
 * not be passed through here.
 */
const E2M: ReadonlyArray<readonly [string, string]> = [
  ['ʔˌn̩', 'ʔn'],
  ['ʔn̩', 'ʔn'],
  ['aɪ', 'I'],
  ['aʊ', 'W'],
  ['dʒ', 'ʤ'],
  ['eɪ', 'A'],
  ['e', 'A'],
  ['tʃ', 'ʧ'],
  ['ɔɪ', 'Y'],
  ['ʲo', 'jo'],
  ['ʲə', 'jə'],
  ['ʲ', ''],
  ['ɚ', 'əɹ'],
  ['r', 'ɹ'],
  ['x', 'k'],
  ['ç', 'k'],
  ['ɬ', 'l'],
  ['̃', ''],
]

const BOUNDARY = String.raw`[\s;:,.!?—…"“”()]|$`

export function toMisaki(phonemes: string, british = false): string {
  let ps = phonemes
  if (british) ps = ps.split('eə').join('ɛː')
  for (const [from, to] of E2M) ps = ps.split(from).join(to)
  ps = ps.replace(/(\S)̩/gu, 'ᵊ$1').replace(/̩/g, '')
  ps = ps.replace(new RegExp(`əl(?=${BOUNDARY})`, 'gu'), 'ᵊl')
  ps = british
    ? ps.replace(new RegExp(`ɐ(?!n?(?:${BOUNDARY}))`, 'gu'), 'ə')
    : ps.replace(new RegExp(`ɐ(?!${BOUNDARY})`, 'gu'), 'ə')
  if (british) {
    ps = ps.split('iə').join('ɪə').split('əʊ').join('Q')
    ps = ps.replace(new RegExp(`(^|\\s)ðɪ(?=\\s|$)`, 'gu'), '$1ði')
  } else {
    ps = ps
      .split('oʊ')
      .join('O')
      .split('ɜːɹ')
      .join('ɜɹ')
      .split('ɜː')
      .join('ɜɹ')
      .split('ɪə')
      .join('iə')
      .split('ː')
      .join('')
  }
  ps = ps.split('o').join('ɔ')
  return ps.split('ɾ').join('T').split('ʔ').join('t')
}
