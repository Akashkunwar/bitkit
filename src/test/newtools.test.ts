import { describe, expect, it } from 'vitest'
import { buildXlsx, columnIndex, columnName, escapeXml, readXlsx, sheetXml, unzip } from '../lib/xlsx'
import {
  columnStats,
  columnType,
  dedupeRows,
  detectDelimiter,
  moveColumn,
  sortTable,
  tableFromCsv,
  tableFromJson,
  tableToCsv,
  tableToMarkdown,
  tableToXlsx,
  toNumber,
} from '../lib/table'
import { axisBounds, chartData, chartSvg, type ChartSpec } from '../lib/chart'
import { describeCron, expandField, nextRuns, parseCron, CRON_FIELDS } from '../lib/cron'
import { applyBitOp, asSigned, bitsOf, bytesOf, parseInBase, popcount, toBase, wrap } from '../lib/numbers'
import { convertConfig, detectFormat, formatConfig, parseConfig } from '../lib/config'
import { algoForDigest, hashesMatch, hashText } from '../lib/checksum'
import { simulateRgb, findClashes, colorDistance } from '../lib/vision'
import { parseHex } from '../lib/contrast'
import { buildGrid, findOverlaps, offsetMinutes } from '../lib/meeting'
import { emptyInvoice, totalsOf } from '../lib/invoice'
import { bitrateForTarget, extensionFor, formatClock } from '../lib/media'
import { tools, searchTools } from '../registry'

describe('xlsx', () => {
  it('maps column indexes to letters and back', () => {
    expect(columnName(0)).toBe('A')
    expect(columnName(25)).toBe('Z')
    expect(columnName(26)).toBe('AA')
    expect(columnName(701)).toBe('ZZ')
    for (const i of [0, 1, 25, 26, 27, 701, 702]) {
      expect(columnIndex(`${columnName(i)}1`)).toBe(i)
    }
  })

  it('escapes XML and strips forbidden control characters', () => {
    expect(escapeXml('a & b < c')).toBe('a &amp; b &lt; c')
    expect(escapeXml('ok\u0000bad')).toBe('okbad')
  })

  it('writes numbers as numeric cells and text as inline strings', () => {
    const xml = sheetXml([['name', 'qty'], ['Asha', '12']])
    expect(xml).toContain('t="inlineStr"')
    expect(xml).toContain('<c r="B2"><v>12</v></c>')
  })

  it('round-trips a workbook through its own reader', async () => {
    const rows = [
      ['name', 'city', 'orders'],
      ['Asha, A', 'Mumbai', '12'],
      ['Rohan', 'Pune "P"', '4'],
    ]
    const bytes = buildXlsx(rows, 'Sheet1')
    const entries = await unzip(bytes)
    expect(entries.map((e) => e.name)).toContain('xl/worksheets/sheet1.xml')
    expect(await readXlsx(bytes)).toEqual(rows)
  })
})

describe('table', () => {
  it('detects delimiters', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',')
    expect(detectDelimiter('a\tb\tc')).toBe('\t')
    expect(detectDelimiter('a;b;c')).toBe(';')
  })

  it('parses a semicolon file that contains commas inside cells', () => {
    const table = tableFromCsv('name;note\nAsha;"Mumbai, India"', ';')
    expect(table.headers).toEqual(['name', 'note'])
    expect(table.rows[0]).toEqual(['Asha', 'Mumbai, India'])
  })

  it('infers column types', () => {
    const table = tableFromCsv('n,d,t\n1,2024-03-04,hello\n2,2024-05-06,world')
    expect(columnType(table.rows, 0)).toBe('number')
    expect(columnType(table.rows, 1)).toBe('date')
    expect(columnType(table.rows, 2)).toBe('text')
  })

  it('reads numbers with separators and percent signs', () => {
    expect(toNumber('1,234')).toBe(1234)
    expect(toNumber('12%')).toBe(12)
    expect(toNumber('abc')).toBeNull()
  })

  it('sorts numerically and pushes empty cells last in both directions', () => {
    // A wholly blank line is dropped as a row, so the gap lives in a second column.
    const table = tableFromCsv('id,v\na,10\nb,2\nc,\nd,33')
    expect(table.rows).toHaveLength(4)
    expect(sortTable(table, 1, 'asc').rows.map((r) => r[1])).toEqual(['2', '10', '33', ''])
    expect(sortTable(table, 1, 'desc').rows.map((r) => r[1])).toEqual(['33', '10', '2', ''])
  })

  it('computes numeric column stats', () => {
    const table = tableFromCsv('v\n1\n2\n3\n4')
    const stats = columnStats(table, 0)
    expect(stats.type).toBe('number')
    expect(stats.sum).toBe(10)
    expect(stats.mean).toBe(2.5)
    expect(stats.median).toBe(2.5)
    expect(stats.min).toBe(1)
    expect(stats.max).toBe(4)
  })

  it('dedupes and moves columns', () => {
    const table = tableFromCsv('a,b\n1,2\n1,2\n3,4')
    expect(dedupeRows(table).rows).toHaveLength(2)
    const moved = moveColumn(table, 0, 1)
    expect(moved.headers).toEqual(['b', 'a'])
    expect(moved.rows[0]).toEqual(['2', '1'])
  })

  it('round-trips csv through xlsx export', async () => {
    const table = tableFromCsv('name,qty\n"Shah, A",3')
    const back = await readXlsx(tableToXlsx(table))
    expect(back[0]).toEqual(['name', 'qty'])
    expect(back[1]).toEqual(['Shah, A', '3'])
  })

  it('builds json and markdown output', () => {
    const table = tableFromJson('[{"a":1,"b":"x"}]')
    expect(table.headers).toEqual(['a', 'b'])
    expect(tableToCsv(table)).toBe('a,b\n1,x')
    expect(tableToMarkdown(table)).toContain('| a | b |')
  })
})

describe('chart', () => {
  const table = tableFromCsv('m,v,w\nJan,10,4\nFeb,20,8\nMar,15,6')
  const spec = (kind: ChartSpec['kind'], columns = [1]): ChartSpec => ({
    kind,
    labelColumn: 0,
    valueColumns: columns,
    title: 'T',
    width: 600,
    height: 400,
    showGrid: true,
    showLegend: true,
    showValues: false,
  })

  it('rounds axis bounds to readable ticks', () => {
    const bounds = axisBounds([3, 47, 22])
    expect(bounds.min).toBe(0)
    expect(bounds.max).toBeGreaterThanOrEqual(47)
    expect(bounds.max % bounds.step).toBe(0)
  })

  it('extracts labels and series', () => {
    const data = chartData(table, spec('bar'))
    expect(data.labels).toEqual(['Jan', 'Feb', 'Mar'])
    expect(data.series[0].values).toEqual([10, 20, 15])
  })

  it('renders every chart kind as svg', () => {
    for (const kind of ['bar', 'groupedBar', 'line', 'area', 'scatter', 'pie', 'donut'] as const) {
      const svg = chartSvg(table, spec(kind, kind === 'groupedBar' ? [1, 2] : [1]))
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain('</svg>')
    }
  })

  it('escapes labels into the svg', () => {
    const hostile = tableFromCsv('m,v\n"<script>",5')
    const svg = chartSvg(hostile, spec('bar'))
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
  })

  it('breaks the line at a missing value rather than interpolating', () => {
    const gapped = tableFromCsv('m,v\nJan,10\nFeb,\nMar,15')
    const svg = chartSvg(gapped, spec('line'))
    // Two separate move commands means the path was broken, not joined.
    expect((svg.match(/d="M/g) ?? []).length).toBeGreaterThanOrEqual(1)
    expect(svg).toContain('<svg')
  })
})

describe('cron', () => {
  it('expands ranges, lists, and steps', () => {
    expect(expandField('*/15', CRON_FIELDS[0])).toEqual([0, 15, 30, 45])
    expect(expandField('1-5', CRON_FIELDS[4])).toEqual([1, 2, 3, 4, 5])
    expect(expandField('1,3,5', CRON_FIELDS[1])).toEqual([1, 3, 5])
  })

  it('rejects out-of-range and malformed fields', () => {
    expect(() => expandField('99', CRON_FIELDS[0])).toThrow()
    expect(() => expandField('5-1', CRON_FIELDS[0])).toThrow()
    expect(() => parseCron('* * *')).toThrow()
  })

  it('describes common schedules', () => {
    expect(describeCron('* * * * *')).toContain('Every minute')
    expect(describeCron('0 9 * * 1-5')).toContain('09:00')
    expect(describeCron('*/5 * * * *')).toContain('every 5 minutes')
  })

  it('lists next runs that all satisfy the expression', () => {
    const from = new Date('2026-03-02T00:00:00')
    const runs = nextRuns('0 9 * * 1-5', 5, from)
    expect(runs).toHaveLength(5)
    for (const run of runs) {
      expect(run.getHours()).toBe(9)
      expect(run.getMinutes()).toBe(0)
      expect(run.getDay()).toBeGreaterThanOrEqual(1)
      expect(run.getDay()).toBeLessThanOrEqual(5)
      expect(run.getTime()).toBeGreaterThan(from.getTime())
    }
  })
})

describe('numbers', () => {
  it('parses every base with and without prefixes', () => {
    expect(parseInBase('ff', 16)).toBe(255n)
    expect(parseInBase('0xff', 16)).toBe(255n)
    expect(parseInBase('1010', 2)).toBe(10n)
    expect(parseInBase('777', 8)).toBe(511n)
    expect(parseInBase('-42', 10)).toBe(-42n)
    expect(parseInBase('2', 2)).toBeNull()
  })

  it('formats with grouping', () => {
    expect(toBase(255n, 16, false)).toBe('ff')
    expect(toBase(1234567n, 10)).toBe('1,234,567')
    expect(toBase(255n, 2, false)).toBe('11111111')
  })

  it('wraps and reads two-complement signed values', () => {
    expect(wrap(-1n, 8)).toBe(255n)
    expect(asSigned(255n, 8)).toBe(-1n)
    expect(asSigned(127n, 8)).toBe(127n)
  })

  it('applies bitwise operators within the width', () => {
    expect(applyBitOp(12n, 10n, 'and', 8)).toBe(8n)
    expect(applyBitOp(12n, 10n, 'or', 8)).toBe(14n)
    expect(applyBitOp(12n, 10n, 'xor', 8)).toBe(6n)
    expect(applyBitOp(1n, 0n, 'not', 8)).toBe(254n)
    expect(applyBitOp(1n, 3n, 'shl', 8)).toBe(8n)
    // Arithmetic shift keeps the sign; logical shift does not.
    expect(asSigned(applyBitOp(wrap(-8n, 8), 1n, 'shr', 8), 8)).toBe(-4n)
    expect(applyBitOp(wrap(-8n, 8), 1n, 'ushr', 8)).toBe(124n)
  })

  it('inspects bits and bytes', () => {
    expect(bitsOf(5n, 8)).toEqual([false, false, false, false, false, true, false, true])
    expect(popcount(255n, 8)).toBe(8)
    expect(bytesOf(0x1234n, 16)).toEqual(['12', '34'])
  })
})

describe('config formats', () => {
  const value = { name: 'kit', server: { port: 5173 }, tools: ['json', 'diff'] }

  it('round-trips through yaml and toml', () => {
    for (const format of ['json', 'yaml', 'toml'] as const) {
      const text = formatConfig(value, format)
      expect(parseConfig(text, format)).toEqual(value)
    }
  })

  it('detects formats from content and filename', () => {
    expect(detectFormat('{"a":1}')).toBe('json')
    expect(detectFormat('a: 1')).toBe('yaml')
    expect(detectFormat('[table]\nkey = 1')).toBe('toml')
    expect(detectFormat('anything', 'x.yml')).toBe('yaml')
  })

  it('reports a clear reason instead of emitting broken toml', () => {
    const result = convertConfig('[1,2,3]', 'json', 'toml')
    expect(result.error).toContain('table at the top level')
    const nulled = convertConfig('{"a":null}', 'json', 'toml')
    expect(nulled.error).toContain('null')
  })

  it('surfaces parse errors rather than throwing', () => {
    expect(convertConfig('{not json', 'json', 'yaml').error).toBeTruthy()
  })
})

describe('checksum', () => {
  it('hashes text with known digests', async () => {
    expect(await hashText('abc', 'SHA-256')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(await hashText('', 'SHA-1')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  })

  it('compares tolerantly and identifies digests by length', () => {
    expect(hashesMatch('ABCD', 'abcd')).toBe(true)
    expect(hashesMatch('abcd', 'sha256: abcd')).toBe(true)
    expect(hashesMatch('', 'abcd')).toBe(false)
    expect(algoForDigest('a'.repeat(64))).toBe('SHA-256')
    expect(algoForDigest('a'.repeat(40))).toBe('SHA-1')
    expect(algoForDigest('zzz')).toBeNull()
  })
})

describe('colour vision', () => {
  it('leaves greys untouched and collapses colour under achromatopsia', () => {
    const grey = { r: 128, g: 128, b: 128 }
    const mono = simulateRgb({ r: 200, g: 30, b: 30 }, 'achromatopsia')
    expect(mono.r).toBe(mono.g)
    expect(mono.g).toBe(mono.b)
    expect(colorDistance(grey, grey)).toBe(0)
  })

  it('flags red/green pairs that collapse for deuteranopia', () => {
    const clashes = findClashes(['#d62728', '#2ca02c', '#1f77b4'], 'deuteranopia', parseHex)
    expect(clashes.some((c) => [c.a, c.b].includes('#d62728') && [c.a, c.b].includes('#2ca02c'))).toBe(true)
  })
})

describe('meeting planner', () => {
  it('reports zone offsets against UTC', () => {
    const winter = new Date('2026-01-15T12:00:00Z')
    expect(offsetMinutes(winter, 'UTC')).toBe(0)
    expect(offsetMinutes(winter, 'Asia/Kolkata')).toBe(330)
  })

  it('builds a 24-hour grid and finds a shared window', () => {
    const rows = buildGrid(['UTC', 'Europe/London'], 'UTC', new Date(2026, 2, 10))
    expect(rows).toHaveLength(2)
    expect(rows[0].hours).toHaveLength(24)
    const overlaps = findOverlaps(rows)
    expect(overlaps.length).toBeGreaterThan(0)
    expect(overlaps[0].count).toBeGreaterThan(0)
  })

  it('finds no overlap for zones on opposite sides of the world', () => {
    const rows = buildGrid(['Pacific/Auckland', 'America/Los_Angeles'], 'UTC', new Date(2026, 2, 10), {
      start: 9,
      end: 11,
    })
    expect(findOverlaps(rows)).toHaveLength(0)
  })
})

describe('invoice', () => {
  it('applies discount before tax', () => {
    const invoice = {
      ...emptyInvoice(),
      items: [{ id: 'a', description: 'x', quantity: 2, rate: 100 }],
      discount: 10,
      taxPercent: 18,
    }
    const totals = totalsOf(invoice)
    expect(totals.subtotal).toBe(200)
    expect(totals.discount).toBe(20)
    expect(totals.tax).toBeCloseTo(32.4, 5)
    expect(totals.total).toBeCloseTo(212.4, 5)
  })
})

describe('media helpers', () => {
  it('formats clocks and picks extensions', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(75)).toBe('1:15')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(extensionFor('video/mp4')).toBe('mp4')
    expect(extensionFor('audio/mp4')).toBe('m4a')
    expect(extensionFor('video/webm;codecs=vp9')).toBe('webm')
  })

  it('scales bitrate to the byte budget', () => {
    const bps = bitrateForTarget(10 * 1024 * 1024, 60)
    expect(bps).toBeGreaterThan(100_000)
    // A tighter budget over the same duration must ask for less.
    expect(bitrateForTarget(2 * 1024 * 1024, 60)).toBeLessThan(bps)
  })
})

describe('registry after expansion', () => {
  it('registers every new tool with a unique id and path', () => {
    const ids = tools.map((t) => t.id)
    const paths = tools.map((t) => t.path)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
    expect(ids).toEqual(
      expect.arrayContaining([
        'shrink',
        'table',
        'chart',
        'media',
        'record',
        'checksum',
        'config',
        'diagram',
        'mdtable',
        'cron',
        'meet',
        'vision',
        'base',
        'invoice',
      ]),
    )
  })

  it('keeps keyboard chords unique', () => {
    const chords = tools
      .map((t) => t.shortcut?.split(' then ')[1]?.toLowerCase())
      .filter((c): c is string => Boolean(c))
    expect(new Set(chords).size).toBe(chords.length)
    // "h" is reserved for Home.
    expect(chords).not.toContain('h')
  })

  it('finds the new tools by natural search terms', () => {
    expect(searchTools('xlsx').some((t) => t.id === 'table')).toBe(true)
    expect(searchTools('colour blind').some((t) => t.id === 'vision')).toBe(true)
    expect(searchTools('crontab').some((t) => t.id === 'cron')).toBe(true)
    expect(searchTools('mermaid').some((t) => t.id === 'diagram')).toBe(true)
    expect(searchTools('shrink').some((t) => t.id === 'shrink')).toBe(true)
    expect(searchTools('yaml').some((t) => t.id === 'config')).toBe(true)
  })
})
