import { describe, expect, it } from 'vitest'
import { searchTools } from '../registry'
import {
  clockParts,
  dragOffsetMs,
  filterZones,
  formatOffset,
  handAngles,
  listZones,
  mergePrefs,
  prefsToParams,
} from '../lib/liveClock'

const KOLKATA = new Date('2026-11-25T02:52:07.000Z')

describe('live clock', () => {
  it('formats a zone, including midnight as 00 and a 12-hour clock', () => {
    const parts = clockParts(KOLKATA, 'Asia/Kolkata', false, 'en-US')
    expect(parts.hour).toBe(8)
    expect(parts.hourText).toBe('08')
    expect(parts.minuteText).toBe('22')
    expect(parts.secondText).toBe('07')
    expect(parts.city).toBe('Kolkata')
    expect(parts.dateLine).toBe('Wednesday, November 25, 2026')
    expect(parts.offsetLabel).toMatch(/5:30/)
    expect(parts.ampm).toBe('')

    const morning = clockParts(KOLKATA, 'Asia/Kolkata', true, 'en-US')
    expect(morning.hourText).toBe('08')
    expect(morning.ampm).toMatch(/AM/)

    const afternoon = clockParts(new Date('2026-11-25T10:15:00.000Z'), 'Asia/Kolkata', true, 'en-US')
    expect(afternoon.hour).toBe(15)
    expect(afternoon.hourText).toBe('03')
    expect(afternoon.ampm).toMatch(/PM/)

    const midnight = clockParts(new Date('2026-01-01T00:00:00.000Z'), 'UTC', false, 'en-US')
    expect(midnight.hour).toBe(0)
    expect(midnight.hourText).toBe('00')
    expect(clockParts(KOLKATA, 'Not/AZone', false, 'en-US').hourText).toBe('02')
  })

  it('points the hands and shifts time by a sideways drag', () => {
    expect(handAngles({ hour: 3, minute: 0, second: 0, ms: 0 })).toEqual({ hour: 90, minute: 0, second: 0 })
    expect(handAngles({ hour: 6, minute: 30, second: 0, ms: 0 }).hour).toBe(195)
    expect(handAngles({ hour: 6, minute: 30, second: 0, ms: 0 }).minute).toBe(180)

    expect(dragOffsetMs(0, 16, 'minute')).toBe(2 * 60_000)
    expect(dragOffsetMs(0, 8, 'quarter')).toBe(15 * 60_000)
    expect(dragOffsetMs(0, 8, 'hour')).toBe(60 * 60_000)
    expect(dragOffsetMs(60_000, -8, 'minute')).toBe(0)
    expect(formatOffset(0)).toBe('')
    expect(formatOffset(2 * 3_600_000 + 15 * 60_000)).toBe('2h 15m ahead')
    expect(formatOffset(-45 * 60_000)).toBe('45m behind')
    expect(formatOffset(60 * 60_000)).toBe('1h ahead')
  })

  it('finds cities by name or abbreviation and keeps a shareable link short', () => {
    const zones = listZones()
    const india = zones.find((zone) => zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta')
    expect(india).toBeTruthy()
    expect(filterZones('ist', zones)[0]).toBe(india)
    expect(filterZones('calcutta', zones)).toContain(india)
    expect(filterZones('tokyo', zones)[0]).toBe('Asia/Tokyo')
    expect(filterZones('', zones)).toEqual([])

    const prefs = mergePrefs(
      { theme: 'amber', face: 'digital', seconds: true, showDate: true, hour12: false, zone: 'auto', awake: true },
      new URLSearchParams('face=flip&tz=Asia/Tokyo&hour=12&seconds=0'),
    )
    expect(prefs).toMatchObject({
      face: 'flip',
      theme: 'amber',
      zone: 'Asia/Tokyo',
      hour12: true,
      seconds: false,
      awake: true,
    })
    expect(mergePrefs(null, new URLSearchParams('face=nope&tz=Not/AZone')).face).toBe('digital')
    expect(mergePrefs(null, new URLSearchParams('face=nope&tz=Not/AZone')).zone).toBe('auto')
    expect(prefsToParams(prefs).toString()).toBe('face=flip&theme=amber&seconds=0&hour=12&tz=Asia%2FTokyo')
  })

  it('is findable as a live clock', () => {
    expect(searchTools('live clock').some((tool) => tool.id === 'live')).toBe(true)
    expect(searchTools('flip clock').some((tool) => tool.id === 'live')).toBe(true)
  })
})
