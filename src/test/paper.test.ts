import { describe, expect, it } from 'vitest'
import { wrapByMeasure } from '../lib/paper'

describe('paper', () => {
  it('wraps words that do not fit the line', () => {
    const lines = wrapByMeasure('one two three', 7, (sample) => sample.length)
    expect(lines).toEqual(['one two', 'three'])
  })

  it('keeps a blank line between paragraphs', () => {
    expect(wrapByMeasure('a\n\nb', 10, (sample) => sample.length)).toEqual(['a', '', 'b'])
  })
})
