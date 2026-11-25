import { describe, expect, it } from 'vitest'
import {
  PASSPHRASE_WORDS,
  atbash,
  caesar,
  decodeBase32,
  encodeBase32,
  explainChmod,
  hammingDistance,
  httpStatus,
  isbnValid,
  jsonToTypes,
  luhnValid,
  punyDecode,
  punyEncode,
} from '../lib/codes'
import { isoWeek, isLeapYear, addCalendar, parseDate, dayOfYear, spanBetween } from '../lib/dateMath'
import { channelsFromHex, hexFromCmyk } from '../lib/ink'
import { apaCitation } from '../lib/cite'
import { listDifference } from '../lib/lists'
import {
  combinations,
  describeNumbers,
  factorize,
  fromRoman,
  lcm,
  parseFraction,
  formatFraction,
  toRoman,
  gcd,
} from '../lib/deskNumbers'
import { cupToGrams, WORKSHOP_FORMULAS } from '../lib/workshop'
import { navyBodyFat } from '../lib/body'
import { pigLatin, stripAccents } from '../lib/glyphs'

describe('codes added from the browser-only catalog', () => {
  it('round-trips Base32 and matches the RFC vector', () => {
    const bytes = new TextEncoder().encode('foo')
    expect(encodeBase32(bytes)).toBe('MZXW6===')
    expect(new TextDecoder().decode(decodeBase32('MZXW6==='))).toBe('foo')
  })

  it('encodes the classic punycode label', () => {
    expect(punyEncode('bücher')).toBe('bcher-kva')
    expect(punyDecode('bcher-kva')).toBe('bücher')
  })

  it('shifts, mirrors, and checks the small validators', () => {
    expect(caesar('hello', 13)).toBe('uryyb')
    expect(atbash('abc')).toBe('zyx')
    expect(explainChmod('755')).toEqual({ octal: '0755', symbolic: 'rwxr-xr-x' })
    expect(httpStatus(404)).toBe('404 Not Found')
    expect(luhnValid('79927398713')).toBe(true)
    expect(isbnValid('978-0-306-40615-7')).toEqual({ kind: 'ISBN-13', valid: true })
    expect(hammingDistance('karolin', 'kathrin')).toBe(3)
    expect(PASSPHRASE_WORDS.length).toBe(256)
  })

  it('writes a TypeScript type for an object', () => {
    expect(jsonToTypes('{"name":"Ada","ok":true}')).toContain('name: string')
    expect(jsonToTypes('{"name":"Ada","ok":true}')).toContain('ok: boolean')
  })
})

describe('number, date, color, and text desks', () => {
  it('converts numerals, factors, and fractions', () => {
    expect(toRoman(1994)).toBe('MCMXCIV')
    expect(fromRoman('MCMXCIV')).toBe(1994)
    expect(gcd(24n, 36n)).toBe(12n)
    expect(lcm(4n, 6n)).toBe(12n)
    expect(factorize(84)).toBe('2 × 2 × 3 × 7')
    expect(combinations(10, 3)).toBe('120')
    expect(formatFraction(parseFraction('1/2'))).toBe('1/2')
    const stats = describeNumbers([1, 2, 3, 4])
    expect(stats.mean).toBe(2.5)
    expect(stats.median).toBe(2.5)
    expect(stats.sstdev).toBeCloseTo(1.290994, 4)
  })

  it('knows the ISO week and a clamped month end', () => {
    expect(isoWeek(parseDate('2026-01-01'))).toEqual({ year: 2026, week: 1 })
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
    expect(addCalendar(parseDate('2026-01-31'), 0, 1, 0).getDate()).toBe(28)
    expect(dayOfYear(parseDate('2026-01-01'))).toBe(1)
    expect(dayOfYear(parseDate('2026-03-09'))).toBe(68)
    expect(dayOfYear(parseDate('2024-12-31'))).toBe(366)
    expect(spanBetween(parseDate('2026-03-08'), parseDate('2026-03-10')).days).toBe(2)
  })

  it('rejects a discount rate that collapses net present value', () => {
    const npv = WORKSHOP_FORMULAS.find((formula) => formula.id === 'npv')
    const inflation = WORKSHOP_FORMULAS.find((formula) => formula.id === 'inflation')
    expect(npv).toBeDefined()
    expect(inflation).toBeDefined()
    expect(() => npv?.run({ rate: '-100', initial: '1000', flows: '400' })).toThrow(/above -100%/)
    expect(() => inflation?.run({ amount: '100', rate: '-100', years: '10' })).toThrow(/above -100%/)
    expect(npv?.run({ rate: '10', initial: '1000', flows: '400\n400\n500' })[0]?.value).toBe('69.87')
  })

  it('rejects a navy body-fat estimate that falls below zero', () => {
    expect(navyBodyFat('male', 178, 38, 86, 96)).toBeCloseTo(17.3, 1)
    expect(() => navyBodyFat('male', 178, 38, 38.2, 96)).toThrow(/usable body-fat/)
  })

  it('converts a hex color to CMYK and back into the same neighborhood', () => {
    const channels = channelsFromHex('#000000')
    expect(channels.cmyk.endsWith('100%')).toBe(true)
    expect(hexFromCmyk(0, 100, 100, 0)).toBe('#ff0000')
  })

  it('scales a cup, strips an accent, and drops a list line', () => {
    expect(cupToGrams('flour', 2)).toBe(240)
    expect(stripAccents('Café')).toBe('Cafe')
    expect(pigLatin('Hello')).toBe('Ellohay')
    expect(listDifference('a\nb\nc', 'b')).toBe('a\nc')
    expect(
      apaCitation({
        authors: 'Ada Lovelace',
        year: '1843',
        title: 'Notes',
        container: '',
        publisher: 'Taylor',
        url: '',
        accessed: '',
      }),
    ).toContain('Lovelace, Ada')
  })
})
