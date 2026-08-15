import { describe, expect, it } from 'vitest'
import {
  addWorkingDays,
  breakdown,
  countWorkingDays,
  MON_TO_FRI,
  nextAnniversary,
  parseDate,
  parseHolidays,
  span,
  toInput,
} from '../lib/dates'
import { amountToWords, groupDigits, integerToWords, titleCase } from '../lib/numwords'
import { bandFor, bmi, bmr, BMI_BANDS, healthyWeightRange, macrosFor, tdee } from '../lib/health'
import { angleForIndex, makeTeams, parseEntries, pickMany, rollDice, shuffle } from '../lib/randomize'
import { applyStyle, STYLES, toPlain } from '../lib/unicodeStyle'
import { analyse, countSyllables, fleschEase, splitSentences } from '../lib/readability'
import { countText, lengthFor, PLATFORMS, statusFor } from '../lib/platforms'
import { EMOJI, searchEmoji, searchKaomoji } from '../lib/emoji'
import { displayWidth, drawBox, drawTable, drawTree, parseOutline, parseRows } from '../lib/boxdraw'
import { DEFAULT_ASCII, gridFor, imageDataToAscii } from '../lib/asciiArt'
import { fillNoise, estimateSpl, measure, referenceFor, toDb } from '../lib/noise'
import { suggestPanels, CAROUSEL_PRESETS } from '../lib/carousel'
import { tools, searchTools } from '../registry'

describe('dates', () => {
  it('breaks a span into calendar years, months, and days', () => {
    expect(breakdown(new Date(2000, 0, 15), new Date(2026, 0, 14))).toEqual({
      years: 25,
      months: 11,
      days: 30,
    })
    expect(breakdown(new Date(2024, 0, 1), new Date(2024, 2, 1))).toEqual({ years: 0, months: 2, days: 0 })
  })

  it('borrows days from the previous month, not a fixed 30', () => {
    // 31 Jan to 1 Mar 2023: February had 28 days.
    expect(breakdown(new Date(2023, 0, 31), new Date(2023, 2, 1))).toEqual({ years: 0, months: 1, days: 1 })
  })

  it('counts total days and weekend days', () => {
    const result = span(new Date(2026, 0, 1), new Date(2026, 0, 8))
    expect(result.totalDays).toBe(7)
    expect(result.weekdays + result.weekendDays).toBe(7)
  })

  it('rejects impossible dates instead of rolling them forward', () => {
    expect(parseDate('2026-02-31')).toBeNull()
    expect(parseDate('2026-02-28')).not.toBeNull()
  })

  it('finds the next anniversary and handles 29 February', () => {
    const next = nextAnniversary(new Date(2000, 1, 29), new Date(2026, 5, 1))
    expect(next.date.getMonth()).toBe(1)
    expect(next.date.getFullYear()).toBe(2027)
    expect(next.daysAway).toBeGreaterThan(0)
  })

  it('adds working days across a weekend', () => {
    // Friday 2 Jan 2026 + 1 working day is Monday 5 Jan.
    const friday = new Date(2026, 0, 2)
    expect(friday.getDay()).toBe(5)
    expect(toInput(addWorkingDays(friday, 1, MON_TO_FRI))).toBe('2026-01-05')
    expect(toInput(addWorkingDays(friday, 5, MON_TO_FRI))).toBe('2026-01-09')
  })

  it('skips holidays and counts backwards', () => {
    const holidays = parseHolidays('2026-01-05')
    expect(toInput(addWorkingDays(new Date(2026, 0, 2), 1, MON_TO_FRI, holidays))).toBe('2026-01-06')
    expect(toInput(addWorkingDays(new Date(2026, 0, 5), -1, MON_TO_FRI))).toBe('2026-01-02')
  })

  it('counts working days inclusively', () => {
    const result = countWorkingDays(new Date(2026, 0, 5), new Date(2026, 0, 9), MON_TO_FRI)
    expect(result.working).toBe(5)
    expect(result.off).toBe(0)
  })

  it('does not hang when no working days are configured', () => {
    const none = [false, false, false, false, false, false, false]
    expect(toInput(addWorkingDays(new Date(2026, 0, 2), 3, none))).toBe('2026-01-02')
  })
})

describe('number to words', () => {
  it('spells the Indian scale', () => {
    expect(integerToWords(0, 'indian')).toBe('zero')
    expect(integerToWords(101, 'indian')).toBe('one hundred and one')
    expect(integerToWords(100000, 'indian')).toBe('one lakh')
    expect(integerToWords(12345678, 'indian')).toBe('one crore twenty-three lakh forty-five thousand six hundred and seventy-eight')
  })

  it('spells the international scale', () => {
    expect(integerToWords(1000000, 'international')).toBe('one million')
    expect(integerToWords(1234, 'international')).toBe('one thousand two hundred and thirty-four')
  })

  it('writes cheque amounts with paise', () => {
    expect(amountToWords(1250.5, { scale: 'indian' })).toBe(
      'one thousand two hundred and fifty rupees and fifty paise only',
    )
    expect(amountToWords(100, { scale: 'indian' })).toBe('one hundred rupees only')
  })

  it('carries rounding into the whole part', () => {
    // 1.999 must not become "one rupee and one hundred paise".
    expect(amountToWords(1.999, { scale: 'indian' })).toBe('two rupees only')
  })

  it('groups digits per scale', () => {
    expect(groupDigits(1234567, 'indian')).toBe('12,34,567')
    expect(groupDigits(1234567, 'international')).toBe('1,234,567')
    expect(groupDigits(1234.5, 'international')).toBe('1,234.50')
  })

  it('title-cases for cheque printing', () => {
    expect(titleCase('one hundred rupees only')).toBe('One Hundred Rupees Only')
  })
})

describe('health', () => {
  it('computes BMI and bands', () => {
    expect(bmi(70, 170)).toBeCloseTo(24.22, 1)
    expect(bandFor(bmi(70, 170), BMI_BANDS).label).toBe('Healthy')
    expect(bandFor(bmi(95, 170), BMI_BANDS).label).toBe('Obese')
  })

  it('derives a healthy weight range from height', () => {
    const range = healthyWeightRange(170, BMI_BANDS)
    expect(range.min).toBeCloseTo(53.5, 0)
    expect(range.max).toBeCloseTo(72.2, 0)
  })

  it('applies the sex offset in Mifflin-St Jeor', () => {
    expect(bmr(70, 170, 30, 'male') - bmr(70, 170, 30, 'female')).toBe(166)
  })

  it('scales daily energy by activity and keeps macros in budget', () => {
    const basal = bmr(70, 170, 30, 'male')
    expect(tdee(basal, 'sedentary')).toBeLessThan(tdee(basal, 'athlete'))
    const macros = macrosFor(2500, 70, 'maintain')
    const fromMacros = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9
    expect(Math.abs(fromMacros - macros.calories)).toBeLessThan(40)
  })
})

describe('randomize', () => {
  it('splits teams evenly and keeps everyone', () => {
    const people = ['a', 'b', 'c', 'd', 'e']
    const teams = makeTeams(people, 2)
    expect(teams).toHaveLength(2)
    expect(teams.flat().sort()).toEqual(people)
    expect(Math.abs(teams[0].length - teams[1].length)).toBeLessThanOrEqual(1)
  })

  it('shuffles without losing or duplicating items', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    expect(shuffle(items).sort((a, b) => a - b)).toEqual(items)
  })

  it('draws unique numbers when asked', () => {
    const pool = Array.from({ length: 10 }, (_, i) => i + 1)
    const drawn = pickMany(pool, 5, false)
    expect(new Set(drawn).size).toBe(5)
    expect(pickMany(pool, 20, false)).toHaveLength(10)
  })

  it('rolls dice inside their range', () => {
    const rolls = rollDice(6, 200)
    expect(rolls.every((r) => r >= 1 && r <= 6)).toBe(true)
  })

  it('parses entries from lines and commas', () => {
    expect(parseEntries('a\nb, c\n\n d ')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('points the wheel at a whole number of turns plus the slice', () => {
    const angle = angleForIndex(0, 4, 5)
    expect(angle).toBeGreaterThan(5 * 360)
  })
})

describe('unicode styler', () => {
  it('maps letters into the maths blocks', () => {
    expect(applyStyle('AB', 'bold')).toBe('\u{1D400}\u{1D401}')
    // U+1D7CE is bold zero, so digit n sits at 1D7CE + n.
    expect(applyStyle('0123', 'bold')).toBe('\u{1D7CE}\u{1D7CF}\u{1D7D0}\u{1D7D1}')
  })

  it('fills the reserved letterlike holes rather than showing boxes', () => {
    // Script capital B lives at U+212C, not in the contiguous block.
    expect(applyStyle('B', 'script')).toBe('ℬ')
    expect(applyStyle('H', 'doubleStruck')).toBe('ℍ')
  })

  it('reverses upside-down text', () => {
    const out = applyStyle('ab', 'upsideDown')
    expect([...out]).toHaveLength(2)
    expect(out).toBe('qɐ')
  })

  it('attaches combining marks after each character, skipping spaces', () => {
    expect(applyStyle('ab c', 'strike')).toBe('a̶b̶ c̶')
  })

  it('round-trips back to plain text', () => {
    for (const style of ['bold', 'italic', 'mono', 'doubleStruck', 'strike'] as const) {
      expect(toPlain(applyStyle('Hello', style))).toBe('Hello')
    }
  })

  it('offers every declared style', () => {
    expect(STYLES.length).toBeGreaterThanOrEqual(15)
    for (const style of STYLES) expect(applyStyle('Test', style.id).length).toBeGreaterThan(0)
  })
})

describe('readability', () => {
  it('splits sentences without breaking on decimals or abbreviations', () => {
    expect(splitSentences('One. Two! Three?')).toHaveLength(3)
    expect(splitSentences('It costs 3.50 today.')).toHaveLength(1)
    expect(splitSentences('Ask Dr. Shah about it.')).toHaveLength(1)
  })

  it('counts syllables roughly right', () => {
    expect(countSyllables('cat')).toBe(1)
    expect(countSyllables('running')).toBe(2)
    expect(countSyllables('beautiful')).toBe(3)
    expect(countSyllables('')).toBe(0)
  })

  it('scores simple text as easier than dense text', () => {
    const simple = analyse('The cat sat. The dog ran. We saw them.')
    const dense = analyse(
      'Notwithstanding the aforementioned considerations, the implementation necessitates comprehensive architectural reconsideration.',
    )
    expect(simple.ease).toBeGreaterThan(dense.ease)
    expect(fleschEase(0, 0, 0)).toBe(0)
  })

  it('reports timings and structure', () => {
    const report = analyse('One two three four five.\n\nSix seven eight.')
    expect(report.words).toBe(8)
    expect(report.sentences).toBe(2)
    expect(report.paragraphs).toBe(2)
    expect(report.readingTimeSec).toBeGreaterThan(0)
  })

  it('flags passive voice', () => {
    expect(analyse('The file was uploaded by the user.').passiveHits).toBeGreaterThan(0)
  })
})

describe('platform counter', () => {
  it('counts graphemes, not code units, for emoji', () => {
    const counts = countText('hi 👍')
    expect(counts.graphemes).toBeLessThanOrEqual(counts.characters)
    expect(counts.emoji).toBeGreaterThan(0)
  })

  it('weights links the way X does', () => {
    const x = PLATFORMS.find((p) => p.id === 'x-post')!
    const short = lengthFor('see https://a.co', x)
    const long = lengthFor('see https://a-very-long-domain.example.com/with/a/path', x)
    // Both links score 23 regardless of real length.
    expect(short).toBe(long)
  })

  it('flags near and over limits', () => {
    expect(statusFor(50, 100)).toBe('ok')
    expect(statusFor(95, 100)).toBe('near')
    expect(statusFor(120, 100)).toBe('over')
  })

  it('has a limit for every listed platform', () => {
    expect(PLATFORMS.every((p) => p.limit > 0 && p.name && p.field)).toBe(true)
  })
})

describe('emoji search', () => {
  it('finds by meaning, not just official name', () => {
    expect(searchEmoji('launch').some((e) => e.char === '🚀')).toBe(true)
    expect(searchEmoji('thanks').some((e) => e.char === '🙏')).toBe(true)
    expect(searchEmoji('bug').some((e) => e.char === '🐛')).toBe(true)
  })

  it('ranks exact name matches first', () => {
    expect(searchEmoji('fire')[0].char).toBe('🔥')
  })

  it('returns everything for an empty query', () => {
    expect(searchEmoji('')).toHaveLength(EMOJI.length)
  })

  it('filters by group', () => {
    expect(searchEmoji('', 'Food').every((e) => e.group === 'Food')).toBe(true)
  })

  it('searches kaomoji', () => {
    expect(searchKaomoji('shrug')[0].text).toContain('ツ')
  })
})

describe('box drawing', () => {
  it('measures wide characters as two cells', () => {
    expect(displayWidth('abc')).toBe(3)
    expect(displayWidth('日本')).toBe(4)
  })

  it('draws an aligned table', () => {
    const out = drawTable(parseRows('a,bb\nccc,d', ','), {
      style: 'light',
      header: true,
      align: 'left',
      padding: 1,
    })
    const lines = out.split('\n')
    // Every line of a box table is the same display width.
    const widths = new Set(lines.map(displayWidth))
    expect(widths.size).toBe(1)
    expect(out).toContain('┌')
    expect(out).toContain('┼')
  })

  it('emits markdown when asked', () => {
    const out = drawTable([['a', 'b'], ['1', '2']], { style: 'markdown', header: true, align: 'left', padding: 1 })
    expect(out.split('\n')[1]).toContain('---')
    expect(out.startsWith('|')).toBe(true)
  })

  it('boxes multi-line text to a common width', () => {
    const out = drawBox('short\nmuch longer line', 'rounded')
    const widths = new Set(out.split('\n').map(displayWidth))
    expect(widths.size).toBe(1)
    expect(out).toContain('╭')
  })

  it('builds a tree from an indented outline', () => {
    const tree = parseOutline('root\n  child\n    grandchild\n  sibling')
    expect(tree).toHaveLength(1)
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].children[0].label).toBe('grandchild')
    const drawn = drawTree(tree)
    expect(drawn).toContain('├──')
    expect(drawn).toContain('└──')
  })
})

/** jsdom does not implement ImageData, and only these three fields are read. */
function fakeImageData(values: number[], width: number, height: number): ImageData {
  return { data: new Uint8ClampedArray(values), width, height, colorSpace: 'srgb' } as ImageData
}

describe('ascii art', () => {
  it('corrects the grid for tall character cells', () => {
    const grid = gridFor(100, 100, { ...DEFAULT_ASCII, columns: 100, cellAspect: 2 })
    expect(grid.width).toBe(100)
    expect(grid.height).toBe(50)
  })

  it('maps dark pixels to the dense end of the ramp', () => {
    const data = fakeImageData([0, 0, 0, 255, 255, 255, 255, 255], 2, 1)
    const out = imageDataToAscii(data, { ...DEFAULT_ASCII, ramp: '@. ' })
    // Black first, white second, with the trailing blank trimmed.
    expect(out.text[0]).toBe('@')
  })

  it('inverts on request', () => {
    const data = fakeImageData([0, 0, 0, 255], 1, 1)
    const normal = imageDataToAscii(data, { ...DEFAULT_ASCII, ramp: '@.' })
    const inverted = imageDataToAscii(data, { ...DEFAULT_ASCII, ramp: '@.', invert: true })
    expect(normal.text).not.toBe(inverted.text)
  })
})

describe('noise and levels', () => {
  it('fills every colour with audible, bounded samples', () => {
    for (const colour of ['white', 'pink', 'brown', 'blue', 'grey'] as const) {
      const buffer = new Float32Array(2048)
      fillNoise(buffer, colour)
      const peak = Math.max(...[...buffer].map(Math.abs))
      expect(peak).toBeGreaterThan(0)
      expect(peak).toBeLessThan(8)
      expect([...buffer].every((v) => Number.isFinite(v))).toBe(true)
    }
  })

  it('measures RMS and converts to dB without hitting negative infinity', () => {
    const silence = new Float32Array(128)
    expect(measure(silence).db).toBeLessThan(-100)
    expect(Number.isFinite(measure(silence).db)).toBe(true)
    expect(toDb(1)).toBeCloseTo(0, 5)
  })

  it('maps dBFS onto an SPL estimate with a floor at zero', () => {
    expect(estimateSpl(-40, 94)).toBe(54)
    expect(estimateSpl(-200, 94)).toBe(0)
    expect(referenceFor(62)).toContain('conversation')
  })
})

describe('carousel', () => {
  it('suggests a panel count from the aspect ratio', () => {
    const square = CAROUSEL_PRESETS[0]
    expect(suggestPanels(3000, 1000, square)).toBe(3)
    expect(suggestPanels(1000, 1000, square)).toBe(1)
    expect(suggestPanels(100000, 1000, square)).toBeLessThanOrEqual(10)
  })
})

describe('registry after the everyday batch', () => {
  it('registers all 17 new tools uniquely', () => {
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(tools.map((t) => t.path)).size).toBe(ids.length)
    expect(ids).toEqual(
      expect.arrayContaining([
        'age', 'deadline', 'timers', 'random', 'numwords', 'health', 'trip',
        'carousel', 'meme', 'ascii', 'noise', 'soundmeter',
        'styler', 'emoji', 'counter', 'readability', 'boxdraw',
      ]),
    )
  })

  it('finds them by natural search terms', () => {
    expect(searchTools('how old').some((t) => t.id === 'age')).toBe(true)
    expect(searchTools('pomodoro').some((t) => t.id === 'timers')).toBe(true)
    expect(searchTools('crore').some((t) => t.id === 'numwords')).toBe(true)
    expect(searchTools('white noise').some((t) => t.id === 'noise')).toBe(true)
    expect(searchTools('instagram').some((t) => t.id === 'carousel')).toBe(true)
    expect(searchTools('flesch').some((t) => t.id === 'readability')).toBe(true)
    expect(searchTools('kaomoji').some((t) => t.id === 'emoji')).toBe(true)
  })
})
