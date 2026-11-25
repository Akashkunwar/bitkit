import { describe, expect, it } from 'vitest'
import {
  clickChimp,
  dealChimp,
  digitsFor,
  freshSequence,
  freshVerbal,
  freshVisual,
  holdForDigits,
  judgeVerbal,
  pickVisual,
  pressSequence,
  revealVisual,
  typingScore,
  visualLayout,
} from '../lib/games/bench'
import { mulberry32 } from '../lib/games/random'
import {
  answerMatches,
  CLUES,
  clueScore,
  freshLives,
  normAnswer,
  orderPrompts,
  QUESTIONS,
  rivalCorrect,
  stepLives,
} from '../lib/games/show'

describe('bench drills', () => {
  it('builds a number that does not start with zero', () => {
    const value = digitsFor(6, mulberry32(4))
    expect(value).toHaveLength(6)
    expect(value.startsWith('0')).toBe(false)
    expect(holdForDigits(6)).toBeGreaterThan(holdForDigits(1))
  })

  it('grows a sequence and rejects a wrong square', () => {
    const rand = mulberry32(2)
    const start = freshSequence(rand)
    const next = pressSequence(start, start.order[0], rand)
    expect(next.order).toHaveLength(2)
    expect(pressSequence(start, (start.order[0] + 1) % 9, () => 0).failed).toBe(true)
  })

  it('scores a seen word, then ends after three misses', () => {
    let state = freshVerbal(() => 0, ['apple', 'boat', 'cloud'])
    expect(state.current).toBeTruthy()
    state = judgeVerbal({ ...state, seen: [], current: 'apple', bag: ['boat'] }, 'new', () => 0.9)
    expect(state.seen).toContain('apple')
    expect(state.score).toBe(1)
    state = { ...state, current: 'apple', lives: 1 }
    state = judgeVerbal(state, 'new', () => 0)
    expect(state.over).toBe(true)
    expect(state.lives).toBe(0)
  })

  it('hides the chimp grid after 1 and advances when the order is finished', () => {
    const start = { ...dealChimp(2, 0, () => 0.3), spots: [3, 7], count: 2 }
    const first = clickChimp(start, 3, () => 0.2)
    expect(first.hidden).toBe(true)
    expect(first.expect).toBe(2)
    expect(clickChimp(start, 1, () => 0).over).toBe(true)
    const done = clickChimp(first, 7, mulberry32(1))
    expect(done.count).toBe(3)
    expect(done.cleared).toBe(2)
  })

  it('ends visual memory on a miss and deals the next level when the pattern is complete', () => {
    expect(visualLayout(1)).toEqual({ size: 3, tiles: 3 })
    const round = { ...freshVisual(1, () => 0.4), tiles: [0, 1], phase: 'pick' as const }
    expect(pickVisual(round, 4, () => 0).over).toBe(true)
    const next = pickVisual(
      pickVisual(round, 0, () => 0.2),
      1,
      mulberry32(1),
    )
    expect(next.level).toBe(2)
    expect(next.phase).toBe('show')
    expect(revealVisual({ ...round, phase: 'show' }).phase).toBe('pick')
  })

  it('counts typing from correct characters', () => {
    const score = typingScore('12345 6789', '12345 6789', 60_000)
    expect(score.wpm).toBe(2)
    expect(score.accuracy).toBe(100)
  })
})

describe('show rounds', () => {
  it('accepts a shortened or punctuated answer', () => {
    expect(normAnswer('The Sun')).toBe('sun')
    expect(answerMatches('U.S.A.', ['usa', 'united states'])).toBe(true)
    expect(answerMatches('united states', ['usa', 'united states'])).toBe(true)
    expect(answerMatches('', ['sun'])).toBe(false)
  })

  it('pays more for a faster clue', () => {
    expect(clueScore(0)).toBe(10)
    expect(clueScore(7_500)).toBe(5)
    expect(clueScore(15_000)).toBe(0)
  })

  it('drops a life, and ends when one side is out', () => {
    const open = freshLives()
    const hit = stepLives(open, true, false, 20)
    expect(hit.you).toBe(3)
    expect(hit.rival).toBe(2)
    expect(stepLives({ ...open, you: 1, rival: 1 }, false, false, 20).over).toBe('draw')
    expect(stepLives({ ...open, you: 1, rival: 2 }, false, true, 20).over).toBe('rival')
    expect(stepLives({ ...open, you: 2, rival: 1 }, true, false, 20).over).toBe('you')
    const deckEnd = stepLives({ ...open, youRight: 2, rivalRight: 1, index: 4 }, true, true, 5)
    expect(deckEnd.over).toBe('you')
    expect(rivalCorrect(() => 0.61)).toBe(true)
    expect(rivalCorrect(() => 0.62)).toBe(false)
  })

  it('keeps a checkable answer on every prompt', () => {
    for (const clue of [...CLUES, ...QUESTIONS]) {
      expect(clue.answers.length).toBeGreaterThan(0)
      expect(answerMatches(clue.answers[0], clue.answers)).toBe(true)
    }
    const once = orderPrompts(CLUES, 9)
    expect(orderPrompts(CLUES, 9)[0]).toEqual(once[0])
    expect(once).toHaveLength(CLUES.length)
  })
})
