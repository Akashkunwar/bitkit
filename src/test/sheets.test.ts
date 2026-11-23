import { describe, expect, it } from 'vitest'
import { bingoCard, maze, secretSanta, wordSearch } from '../lib/party'
import { bubbleFrames, parseNumbers } from '../lib/sortSteps'
import { weeksLived } from '../lib/weeks'

describe('party sheets', () => {
  it('pairs everyone with someone else', () => {
    const pairs = secretSanta(['Asha', 'Dev', 'Mina'], 3)
    expect(pairs).toHaveLength(3)
    expect(pairs.every((pair) => pair.from !== pair.to)).toBe(true)
    expect(new Set(pairs.map((pair) => pair.to)).size).toBe(3)
  })

  it('builds a bingo card with a free center', () => {
    const card = bingoCard(4)
    expect(card).toHaveLength(5)
    expect(card[2][2]).toBe(0)
    const numbers = card.flat().filter((n) => n !== 0)
    expect(new Set(numbers).size).toBe(24)
    expect(Math.max(...card.map((row) => row[0]))).toBeLessThanOrEqual(15)
  })

  it('hides the requested words in the grid', () => {
    const puzzle = wordSearch(['bitkit', 'local'], 10, 2)
    expect(puzzle.grid).toHaveLength(10)
    expect(puzzle.placed).toEqual(expect.arrayContaining(['BITKIT', 'LOCAL']))
    expect(puzzle.grid.every((row) => row.every((cell) => /^[A-Z]$/.test(cell)))).toBe(true)
  })

  it('opens a path from the left edge to the right edge', () => {
    const walls = maze(15, 15, 1)
    expect(walls[1][0]).toBe(false)
    expect(walls[walls.length - 2][walls[0].length - 1]).toBe(false)
    expect(walls.flat().some((cell) => !cell)).toBe(true)
  })
})

describe('life in weeks', () => {
  it('counts whole weeks between two dates', () => {
    expect(weeksLived(new Date('2020-01-01T00:00:00Z'), new Date('2020-01-15T00:00:00Z'))).toBe(2)
    expect(weeksLived(new Date('2030-01-01'), new Date('2020-01-01'))).toBe(0)
  })
})

describe('sort steps', () => {
  it('ends on a sorted copy and leaves the input alone', () => {
    const input = [3, 1, 2]
    const frames = bubbleFrames(input)
    expect(input).toEqual([3, 1, 2])
    expect(frames.at(-1)?.values).toEqual([1, 2, 3])
  })

  it('parses commas and spaces', () => {
    expect(parseNumbers('1, 2 3')).toEqual([1, 2, 3])
  })
})
