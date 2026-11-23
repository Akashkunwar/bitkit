import { describe, expect, it } from 'vitest'
import { jsonTreeRows } from '../lib/jsonTree'
import { monthWeeks } from '../lib/month'

describe('month grid', () => {
  it('starts June 2026 on a Monday and keeps seven columns', () => {
    const weeks = monthWeeks(2026, 5)
    expect(weeks[0][0]).toBeNull()
    expect(weeks[0][1]).toBe(1)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks.flat().filter((day) => day != null)).toHaveLength(30)
  })
})

describe('json tree', () => {
  it('nests objects and arrays under the root', () => {
    const rows = jsonTreeRows({ name: 'kit', tags: ['a'] })
    expect(rows[0].label).toBe('root {2}')
    expect(rows.map((row) => row.label)).toEqual(['root {2}', 'name: "kit"', 'tags [1]', '0: "a"'])
  })
})
