/** Beginner lessons introduce letters in English-frequency order, one at a time. */
export const LEARN_ORDER = 'etaoinshrdlucmfwypvbgkqjxz'.split('')

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
const MIN_LETTERS = 4

export type KeyStat = { hits: number; misses: number; times: number[] }
export type LearnStats = Record<string, KeyStat>

export const COMMON_WORDS =
  `the of and to in a is that it for you was with on as his they be at one have this from or had by hot but some what there we can out other were all your when up use word how said an each she which do their time if will way about many then them write would like so these her long make thing see him two has look more day could go come did number sound no most people my over know water than call first who may down side been now find any new work part take get place made live where after back little only round man year came show every good me give our under name very through just form sentence great think say help low line differ turn cause much mean before move right boy old too same tell does set three want air well also play small end put home read hand port large spell add even land here must big high such follow act why ask men change went light kind off need house picture try us again animal point mother world near build self earth father head stand own page should country found answer school grow study still learn plant cover food sun four between state keep eye never last let thought city tree cross farm hard start might story saw far sea draw left late run don't while press close night real life few north open seem together next white children begin got walk example ease paper group always music those both mark often letter until mile river car feet care second book carry took science eat room friend began idea fish mountain stop once base hear horse cut sure watch color face wood main enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure door product black short numeral class wind question happen complete ship area half rock order fire south problem piece told knew pass since top whole king space heard best hour better true during hundred five remember step early hold west ground interest reach fast verb sing listen six table travel less morning ten simple several vowel toward war lay against pattern slow center love person money serve appear road map rain rule govern pull cold notice voice unit power town fine certain fly fall lead cry dark machine note wait plan figure star box noun field rest correct able pound done beauty drive stood contain front teach week final gave green oh quick develop ocean warm free minute strong special mind behind clear tail produce fact street inch multiply nothing course stay wheel full force blue object decide surface deep moon island foot system busy test record boat common gold possible plane`.split(
    /\s+/,
  )

export function emptyStat(): KeyStat {
  return { hits: 0, misses: 0, times: [] }
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** 0 when a letter is new or slow, 1 when it is accurate and quick. */
export function confidence(stat: KeyStat | undefined): number {
  if (!stat || stat.hits < 3) return 0
  const accuracy = stat.hits / (stat.hits + stat.misses)
  const speed = Math.max(0, Math.min(1, (800 - median(stat.times)) / 600))
  return accuracy * speed
}

function steady(stat: KeyStat | undefined): boolean {
  if (!stat || stat.hits < 10 || stat.times.length < 8) return false
  return stat.misses / stat.hits < 0.15 && median(stat.times) <= 480
}

export function unlockedLetters(stats: LearnStats): string[] {
  let count = MIN_LETTERS
  for (let i = MIN_LETTERS; i < LEARN_ORDER.length; i += 1) {
    const ready = LEARN_ORDER.slice(0, i).every((letter) => steady(stats[letter]))
    if (!ready) break
    count = i + 1
  }
  return LEARN_ORDER.slice(0, count)
}

export function recordKey(stats: LearnStats, letter: string, hit: boolean, ms: number): LearnStats {
  const current = stats[letter] ?? emptyStat()
  const next: KeyStat = hit
    ? { hits: current.hits + 1, misses: current.misses, times: [...current.times, ms].slice(-24) }
    : { hits: current.hits, misses: current.misses + 1, times: current.times }
  return { ...stats, [letter]: next }
}

function pick(letters: string[], stats: LearnStats, random: () => number, vowel: boolean | null): string {
  const pool = vowel === null ? letters : letters.filter((letter) => VOWELS.has(letter) === vowel)
  const choices = pool.length > 0 ? pool : letters
  const weights = choices.map((letter) => 1 / (confidence(stats[letter]) + 0.25))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let cursor = random() * total
  for (let i = 0; i < choices.length; i += 1) {
    cursor -= weights[i]
    if (cursor <= 0) return choices[i]
  }
  return choices[choices.length - 1]
}

/** Nonsense words from the unlocked letters, weighted toward the keys that are still slow. */
export function lessonWords(
  letters: string[],
  stats: LearnStats,
  count: number,
  random: () => number = Math.random,
): string[] {
  const words: string[] = []
  for (let index = 0; index < count; index += 1) {
    const length = 2 + Math.floor(random() * 4)
    let vowel: boolean | null = letters.some((letter) => VOWELS.has(letter)) ? random() < 0.5 : null
    let word = ''
    for (let i = 0; i < length; i += 1) {
      word += pick(letters, stats, random, vowel)
      if (vowel !== null) vowel = !vowel
    }
    words.push(word)
  }
  return words
}

export type SpeedOptions = { punctuation: boolean; numbers: boolean }

export function speedWords(count: number, options: SpeedOptions, random: () => number = Math.random): string[] {
  const words: string[] = []
  let capitalize = false
  while (words.length < count) {
    if (options.numbers && random() < 0.12) {
      words.push(String(1 + Math.floor(random() * 9000)))
      capitalize = false
      continue
    }
    let word = COMMON_WORDS[Math.floor(random() * COMMON_WORDS.length)] ?? 'the'
    if (word === words[words.length - 1]) {
      const at = COMMON_WORDS.indexOf(word)
      word = COMMON_WORDS[(at + 1) % COMMON_WORDS.length] ?? word
    }
    if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1)
    capitalize = false
    if (options.punctuation && random() < 0.18) {
      const mark = random() < 0.55 ? ',' : '.'
      word += mark
      capitalize = mark === '.'
    }
    words.push(word)
  }
  return words
}

export type Attempt = { word: string; typed: string }

/** Net words per minute. Five characters, including a space after a finished word, make one word. */
export function netWpm(attempts: Attempt[], elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  let correct = 0
  for (const attempt of attempts) {
    const length = Math.min(attempt.word.length, attempt.typed.length)
    for (let i = 0; i < length; i += 1) if (attempt.word[i] === attempt.typed[i]) correct += 1
    correct += 1
  }
  return correct / 5 / (elapsedMs / 60_000)
}

export function rawWpm(typedChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  return typedChars / 5 / (elapsedMs / 60_000)
}

export function accuracy(attempts: Attempt[]): number {
  let correct = 0
  let total = 0
  for (const attempt of attempts) {
    const length = Math.max(attempt.word.length, attempt.typed.length)
    total += length
    const shared = Math.min(attempt.word.length, attempt.typed.length)
    for (let i = 0; i < shared; i += 1) if (attempt.word[i] === attempt.typed[i]) correct += 1
  }
  return total === 0 ? 100 : (correct / total) * 100
}
