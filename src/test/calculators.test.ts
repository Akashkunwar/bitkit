import { describe, expect, it } from 'vitest'
import { CalcError, calculate, factorial, formatNumber, tryCalculate } from '../lib/calc'
import { CATEGORIES, convertUnit, formatSig, searchUnits } from '../lib/unitConvert'
import { amountInWords, cagr, compound, discount, emi, formatMoney, simpleInterest, sip } from '../lib/finance'

describe('calculator: precedence and syntax', () => {
  const cases: [string, number][] = [
    ['2+3*4', 14],
    ['(2+3)*4', 20],
    ['2^3^2', 512],
    ['-2^2', -4],
    ['2^-1', 0.5],
    ['10/4', 2.5],
    ['7 mod 3', 1],
    ['-7 mod 3', 2],
    ['2×3÷4', 1.5],
    ['8 − 3', 5],
    ['2**10', 1024],
    ['1.5e3 + 1', 1501],
    ['.5 + .25', 0.75],
  ]
  for (const [expr, expected] of cases) {
    it(`${expr} = ${expected}`, () => expect(calculate(expr)).toBeCloseTo(expected, 10))
  }

  it('multiplies implicitly', () => {
    expect(calculate('2π')).toBeCloseTo(2 * Math.PI)
    expect(calculate('3(4+1)')).toBe(15)
    expect(calculate('(1+2)(3+4)')).toBe(21)
    expect(calculate('2sin(30)')).toBeCloseTo(1)
    expect(calculate('2 sqrt 9')).toBe(6)
  })

  it('forgives a missing closing bracket at the end', () => {
    expect(calculate('(1+2')).toBe(3)
    expect(calculate('sqrt(16')).toBe(4)
  })
})

describe('calculator: functions and modes', () => {
  it('uses degrees or radians for trig', () => {
    expect(calculate('sin(90)', { angle: 'deg' })).toBe(1)
    expect(calculate('cos(90)', { angle: 'deg' })).toBe(0)
    expect(calculate('sin(pi/2)', { angle: 'rad' })).toBe(1)
    expect(calculate('asin(1)', { angle: 'deg' })).toBeCloseTo(90)
    expect(calculate('atan(1)', { angle: 'rad' })).toBeCloseTo(Math.PI / 4)
    expect(() => calculate('tan(90)', { angle: 'deg' })).toThrow(CalcError)
  })

  it('handles roots, logs, and combinatorics', () => {
    expect(calculate('√16')).toBe(4)
    expect(calculate('sqrt 16')).toBe(4)
    expect(calculate('cbrt(-27)')).toBe(-3)
    expect(calculate('root(-8, 3)')).toBeCloseTo(-2)
    expect(calculate('log(1000)')).toBeCloseTo(3)
    expect(calculate('ln(e)')).toBe(1)
    expect(calculate('log(8, 2)')).toBeCloseTo(3)
    expect(calculate('nCr(5, 2)')).toBe(10)
    expect(calculate('nPr(5, 2)')).toBe(20)
    expect(calculate('gcd(12, 18)')).toBe(6)
    expect(calculate('lcm(4, 6)')).toBe(12)
    expect(calculate('round(3.14159, 2)')).toBe(3.14)
  })

  it('computes factorials, including the gamma extension', () => {
    expect(calculate('5!')).toBe(120)
    expect(calculate('0!')).toBe(1)
    expect(factorial(0.5)).toBeCloseTo(Math.sqrt(Math.PI) / 2, 8)
    expect(factorial(171)).toBe(Infinity)
    expect(() => factorial(-1)).toThrow(CalcError)
  })

  it('treats percent like an everyday calculator', () => {
    expect(calculate('50%')).toBe(0.5)
    expect(calculate('200 + 10%')).toBeCloseTo(220)
    expect(calculate('200 - 10%')).toBeCloseTo(180)
    expect(calculate('200 * 10%')).toBeCloseTo(20)
  })

  it('remembers the previous answer', () => {
    expect(calculate('ans * 2', { ans: 21 })).toBe(42)
    expect(() => calculate('ans + 1')).toThrow(/previous answer/)
  })

  it('explains mistakes instead of returning garbage', () => {
    expect(() => calculate('1/0')).toThrow(/divide by zero/)
    expect(() => calculate('2+')).toThrow(CalcError)
    expect(() => calculate(')')).toThrow(/Unmatched/)
    expect(() => calculate('foo(2)')).toThrow(/Unknown/)
    expect(() => calculate('sqrt(-1)')).toThrow(/not real/)
    expect(() => calculate('2 $ 3')).toThrow(/Unexpected/)
    expect(tryCalculate('2+')).toBeNull()
    expect(tryCalculate('2+2')).toBe(4)
  })
})

describe('calculator: display', () => {
  it('hides floating-point noise and uses exponents at the extremes', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatNumber(1e20)).toBe('1e20')
    expect(formatNumber(-1.23e-10)).toBe('-1.23e-10')
    expect(formatNumber(1234567.891, { group: true })).toBe('1,234,567.891')
    expect(formatNumber(1 / 0)).toBe('∞')
  })
})

describe('unit conversion', () => {
  const close = (actual: number, expected: number, digits = 6) => expect(actual).toBeCloseTo(expected, digits)

  it('uses exact definitions for common units', () => {
    close(convertUnit('length', 1, 'in', 'cm'), 2.54)
    close(convertUnit('length', 1, 'mi', 'km'), 1.609344)
    close(convertUnit('mass', 1, 'kg', 'lb'), 2.2046226218)
    close(convertUnit('area', 1, 'acre', 'ft2'), 43560, 4)
    close(convertUnit('volume', 1, 'usgal', 'l'), 3.785411784)
    close(convertUnit('volume', 1, 'cup', 'ml'), 236.5882365, 4)
    close(convertUnit('energy', 1, 'kwh', 'mj'), 3.6)
    close(convertUnit('power', 1, 'hp', 'w'), 745.69987158, 5)
    close(convertUnit('angle', 180, 'deg', 'rad'), Math.PI)
    close(convertUnit('frequency', 60, 'rpm', 'hz'), 1)
    close(convertUnit('pressure', 1, 'atm', 'psi'), 14.6959488, 5)
  })

  it('converts temperatures with offsets', () => {
    expect(convertUnit('temperature', 100, 'c', 'f')).toBeCloseTo(212)
    expect(convertUnit('temperature', -40, 'f', 'c')).toBeCloseTo(-40)
    expect(convertUnit('temperature', 0, 'k', 'c')).toBeCloseTo(-273.15)
    expect(convertUnit('temperature', 0, 'c', 'r')).toBeCloseTo(491.67)
  })

  it('inverts fuel economy between distance-per-fuel and fuel-per-distance', () => {
    expect(convertUnit('fuel', 10, 'kml', 'l100')).toBeCloseTo(10)
    expect(convertUnit('fuel', 20, 'kml', 'l100')).toBeCloseTo(5)
    expect(convertUnit('fuel', 10, 'kml', 'mpgus')).toBeCloseTo(23.5215, 3)
    expect(convertUnit('fuel', 5, 'l100', 'mpguk')).toBeCloseTo(56.49, 1)
  })

  it('separates decimal and binary data units', () => {
    expect(convertUnit('data', 1, 'tb', 'gib')).toBeCloseTo(931.3225746, 5)
    expect(convertUnit('datarate', 100, 'mbps', 'mbs')).toBeCloseTo(12.5)
  })

  it('round-trips every unit in every category', () => {
    for (const category of CATEGORIES) {
      const [a] = category.defaults
      for (const unit of category.units) {
        const there = convertUnit(category.id, 42.5, a, unit.id)
        const back = convertUnit(category.id, there, unit.id, a)
        expect(back, `${category.id} ${a} → ${unit.id}`).toBeCloseTo(42.5, 6)
      }
    }
  })

  it('has unique unit ids within each category and valid defaults', () => {
    for (const category of CATEGORIES) {
      const ids = category.units.map((u) => u.id)
      expect(new Set(ids).size, category.id).toBe(ids.length)
      for (const d of category.defaults) expect(ids, category.id).toContain(d)
    }
  })

  it('finds units by symbol and everyday alias', () => {
    expect(searchUnits('psi')[0].unit.id).toBe('psi')
    expect(searchUnits('gaj').map((m) => m.unit.id)).toContain('yd2')
    expect(searchUnits('pound').some((m) => m.unit.id === 'lb')).toBe(true)
    expect(searchUnits('')).toEqual([])
  })

  it('formats to significant figures', () => {
    expect(formatSig(2.54)).toBe('2.54')
    expect(formatSig(1234567.891, 6)).toBe('1,234,570')
    expect(formatSig(1 / 3, 4)).toBe('0.3333')
    expect(formatSig(9.4607e15, 5)).toBe('9.4607 × 10^15')
  })
})

describe('finance', () => {
  it('matches a bank EMI table', () => {
    // ₹10 lakh at 8.5% for 20 years.
    const result = emi(1_000_000, 8.5, 240)
    expect(result.emi).toBeCloseTo(8678.23, 1)
    expect(result.schedule).toHaveLength(20)
    expect(result.schedule.at(-1)!.balance).toBeCloseTo(0, 6)
    const principalPaid = result.schedule.reduce((sum, row) => sum + row.principal, 0)
    expect(principalPaid).toBeCloseTo(1_000_000, 4)
    expect(result.totalPayment).toBeCloseTo(result.emi * 240, 0)
  })

  it('handles a zero-interest loan', () => {
    expect(emi(12000, 0, 12).emi).toBe(1000)
    expect(emi(12000, 0, 12).totalInterest).toBe(0)
  })

  it('matches the AMFI SIP formula', () => {
    // ₹10,000 a month for 10 years at 12%.
    const result = sip(10_000, 12, 10)
    expect(result.invested).toBe(1_200_000)
    expect(result.value).toBeCloseTo(2_323_391, -1)
    expect(result.yearly).toHaveLength(10)
  })

  it('compounds at the chosen frequency', () => {
    expect(compound(100_000, 10, 3, 'yearly').value).toBeCloseTo(133_100, 4)
    expect(compound(100_000, 12, 1, 'monthly').value).toBeCloseTo(112_682.5, 0)
    expect(simpleInterest(100_000, 10, 3)).toBe(30_000)
  })

  it('computes CAGR and stacked discounts', () => {
    expect(cagr(100, 200, 5)).toBeCloseTo(14.87, 2)
    const d = discount(1000, 20, 10)
    expect(d.final).toBeCloseTo(720)
    expect(d.effectivePct).toBeCloseTo(28)
  })

  it('rejects impossible inputs', () => {
    expect(() => emi(0, 8, 12)).toThrow()
    expect(() => sip(1000, 12, 0)).toThrow()
    expect(() => cagr(0, 10, 1)).toThrow()
  })

  it('formats money with lakh grouping and words', () => {
    expect(formatMoney(1234567, { locale: 'en-IN', currency: 'INR' })).toBe('₹12,34,567')
    expect(formatMoney(1234567, { locale: 'en-US', currency: 'USD' })).toBe('$1,234,567')
    expect(amountInWords(2_500_000, 'en-IN')).toBe('25 lakh')
    expect(amountInWords(32_000_000, 'en-IN')).toBe('3.2 crore')
    expect(amountInWords(1_400_000, 'en-US')).toBe('1.4 million')
  })
})
