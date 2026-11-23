import { describe, expect, it } from 'vitest'
import { accuracy, lessonWords, netWpm, recordKey, speedWords, unlockedLetters, type LearnStats } from '../lib/typing'

const sequence = (...values: number[]) => {
  let index = 0
  return () => values[index++] ?? 0.2
}

describe('typing lessons', () => {
  it('starts a beginner on the first four letters', () => {
    expect(unlockedLetters({})).toEqual(['e', 't', 'a', 'o'])
  })

  it('unlocks the next letter only after the current ones are steady', () => {
    let stats: LearnStats = {}
    for (const letter of ['e', 't', 'a', 'o']) {
      for (let i = 0; i < 12; i += 1) stats = recordKey(stats, letter, true, 280)
    }
    expect(unlockedLetters(stats)).toEqual(['e', 't', 'a', 'o', 'i'])
  })

  it('builds practice words from the unlocked letters, favoring the slow ones', () => {
    const words = lessonWords(
      ['e', 't'],
      { t: { hits: 20, misses: 0, times: [200, 200, 200] } },
      6,
      sequence(0, 0.1, 0.9),
    )
    expect(words).toHaveLength(6)
    for (const word of words) expect(word).toMatch(/^[et]+$/)
  })
})

describe('typing speed', () => {
  it('counts five characters as one word per minute', () => {
    const attempts = [{ word: 'place', typed: 'place' }]
    expect(netWpm(attempts, 60_000)).toBeCloseTo(1.2, 5)
    expect(accuracy([{ word: 'place', typed: 'plaxe' }])).toBeCloseTo(80, 5)
  })

  it('can mix in capitals, punctuation, and numbers', () => {
    const words = speedWords(8, { punctuation: true, numbers: true }, sequence(0.01, 0.5, 0.01, 0.9))
    expect(words.some((word) => /^\d+$/.test(word))).toBe(true)
  })
})
