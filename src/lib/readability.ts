export type Sentence = {
  text: string
  words: number
  syllables: number
  /** Flesch Reading Ease for this sentence alone. */
  ease: number
  index: number
}

export type ReadabilityReport = {
  words: number
  sentences: number
  syllables: number
  characters: number
  paragraphs: number
  avgWordsPerSentence: number
  avgSyllablesPerWord: number
  ease: number
  grade: number
  readingTimeSec: number
  speakingTimeSec: number
  passiveHits: number
  adverbHits: number
  longest: Sentence[]
}

/** Average adult silent reading speed, in words per minute. */
const READING_WPM = 238
const SPEAKING_WPM = 140

const VOWELS = 'aeiouy'

/**
 * Syllable estimate. There is no exact algorithm without a dictionary; this is
 * the standard heuristic and is close enough for a readability score.
 */
export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!clean) return 0
  if (clean.length <= 3) return 1

  const working = clean
    // A trailing silent e, and -ed/-es that do not add a beat.
    .replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, '')
    .replace(/^y/, '')

  let count = 0
  let prevVowel = false
  for (const ch of working) {
    const isVowel = VOWELS.includes(ch)
    if (isVowel && !prevVowel) count += 1
    prevVowel = isVowel
  }
  // Common endings that do carry their own syllable.
  if (/(?:[^aeiouy]le|[aeiouy]{3}|ism|ual)$/.test(clean)) count += 1
  return Math.max(1, count)
}

/** Abbreviations whose full stop does not end a sentence. */
const ABBREVIATIONS = /\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|fig|no|vol|approx)\.$/i

const TERMINATORS = '.!?\u2026'

export function splitSentences(input: string): string[] {
  const out: string[] = []
  const chars = [...input]
  let current = ''

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    current += ch
    if (!TERMINATORS.includes(ch)) continue

    const prev = chars[i - 1] ?? ''
    const next = chars[i + 1] ?? ''
    // Run on through decimals (3.5), mid-word dots, and known abbreviations.
    if (ch === '.' && /\d/.test(prev) && /\d/.test(next)) continue
    if (next && !/\s/.test(next)) continue
    if (ABBREVIATIONS.test(current.trimEnd())) continue

    out.push(current.trim())
    current = ''
  }
  if (current.trim()) out.push(current.trim())
  return out.filter(Boolean)
}

export function splitWords(input: string): string[] {
  return input.match(/[A-Za-z0-9']+/g) ?? []
}

/** Flesch Reading Ease: higher is easier. 60–70 is plain English. */
export function fleschEase(words: number, sentences: number, syllables: number): number {
  if (!words || !sentences) return 0
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
}

/** Flesch–Kincaid grade level, in US school years. */
export function fleschKincaid(words: number, sentences: number, syllables: number): number {
  if (!words || !sentences) return 0
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
}

export type Band = { label: string; note: string; tone: 'ok' | 'warn' | 'high' }

export function bandForEase(ease: number): Band {
  if (ease >= 70) return { label: 'Easy', note: 'Most readers will breeze through this.', tone: 'ok' }
  if (ease >= 60) return { label: 'Plain English', note: 'Around a 13–15 year old reading level.', tone: 'ok' }
  if (ease >= 50) return { label: 'Fairly hard', note: 'Fine for a technical audience.', tone: 'warn' }
  if (ease >= 30) return { label: 'Difficult', note: 'University level. Shorten some sentences.', tone: 'warn' }
  return { label: 'Very difficult', note: 'Dense. Break up the long sentences below.', tone: 'high' }
}

const PASSIVE = /\b(?:am|is|are|was|were|be|been|being)\s+\w+(?:ed|en)\b/gi
const ADVERBS = /\b\w+ly\b/gi

export function analyse(input: string): ReadabilityReport {
  const text = input.trim()
  const sentenceTexts = splitSentences(text)
  const allWords = splitWords(text)
  const syllables = allWords.reduce((sum, w) => sum + countSyllables(w), 0)

  const sentences: Sentence[] = sentenceTexts.map((sentence, index) => {
    const words = splitWords(sentence)
    const syl = words.reduce((sum, w) => sum + countSyllables(w), 0)
    return {
      text: sentence,
      index,
      words: words.length,
      syllables: syl,
      ease: fleschEase(words.length, 1, syl),
    }
  })

  const words = allWords.length
  const count = sentences.length || (words ? 1 : 0)

  return {
    words,
    sentences: count,
    syllables,
    characters: text.length,
    paragraphs: text ? text.split(/\n{2,}/).filter((p) => p.trim()).length : 0,
    avgWordsPerSentence: count ? words / count : 0,
    avgSyllablesPerWord: words ? syllables / words : 0,
    ease: fleschEase(words, count, syllables),
    grade: fleschKincaid(words, count, syllables),
    readingTimeSec: (words / READING_WPM) * 60,
    speakingTimeSec: (words / SPEAKING_WPM) * 60,
    passiveHits: (text.match(PASSIVE) ?? []).length,
    adverbHits: (text.match(ADVERBS) ?? []).length,
    // The sentences actually dragging the score down.
    longest: [...sentences].sort((a, b) => b.words - a.words).slice(0, 5),
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} sec`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs ? `${mins} min ${secs} sec` : `${mins} min`
}
