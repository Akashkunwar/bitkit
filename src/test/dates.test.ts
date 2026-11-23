import { describe, expect, it } from 'vitest'
import { calendarCells } from '../lib/dates'

describe('calendarCells', () => {
  it('starts a Sunday-first grid on the last days of the previous month', () => {
    const cells = calendarCells(2000, 0)
    expect(cells).toHaveLength(42)
    expect(cells[0]?.iso).toBe('1999-12-26')
    expect(cells[0]?.inMonth).toBe(false)
    expect(cells[6]?.iso).toBe('2000-01-01')
    expect(cells[6]?.inMonth).toBe(true)
  })
})
