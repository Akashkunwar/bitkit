import { describe, expect, it } from 'vitest'
import { formatJson, jsonStats, minifyJson, validateJson } from '../lib/json'
import {
  buildAlphabet,
  entropyBits,
  generatePassword,
  generateHexToken,
  generatePin,
  scoreStrength,
} from '../lib/password'
import { defaultGradient, gradientCss, gradientSvg } from '../lib/gradient'
import { buildScale, buildThemeBlock, hexToOklch, oklchToHex } from '../lib/tailwind'
import { emailPayload, urlPayload, wifiPayload } from '../lib/qr'
import { viewToPdf } from '../lib/pdfEdit'
import { icsEvent, vcard } from '../lib/links'
import { csvToJson, jsonToCsv } from '../lib/textbench'

describe('json lib', () => {
  it('validates and reports error line/column', () => {
    const bad = '{\n  "a": 1,\n  "b": oops\n}'
    const result = validateJson(bad)
    expect(result.error).not.toBeNull()
    expect(result.error?.line).toBe(3)
    expect(result.error?.column).toBeGreaterThan(1)
  })

  it('formats with sorted keys and minifies', () => {
    const input = '{"b":2,"a":{"z":1,"y":2}}'
    expect(formatJson(input, { indent: '2', sortKeys: true })).toBe(
      '{\n  "a": {\n    "y": 2,\n    "z": 1\n  },\n  "b": 2\n}',
    )
    expect(minifyJson('{ "a" : 1 }')).toBe('{"a":1}')
  })

  it('computes stats', () => {
    const stats = jsonStats('{"a":[1,2],"b":{"c":3}}')
    expect(stats.keys).toBe(3)
    expect(stats.arrays).toBe(1)
    expect(stats.objects).toBe(2)
    expect(stats.depth).toBe(3)
  })
})

describe('password lib', () => {
  it('respects length and charset', () => {
    const pw = generatePassword({ length: 32, sets: ['digits'] })
    expect(pw).toHaveLength(32)
    expect(pw).toMatch(/^\d+$/)
  })

  it('requires one of each selected set', () => {
    for (let i = 0; i < 20; i += 1) {
      const pw = generatePassword({ length: 12, sets: ['lower', 'upper', 'digits', 'symbols'], requireEachSet: true })
      expect(pw).toMatch(/[a-z]/)
      expect(pw).toMatch(/[A-Z]/)
      expect(pw).toMatch(/\d/)
    }
  })

  it('excludes ambiguous characters', () => {
    const alphabet = buildAlphabet(['digits', 'lower'], true)
    expect(alphabet).not.toContain('0')
    expect(alphabet).not.toContain('l')
  })

  it('scores entropy', () => {
    expect(scoreStrength(entropyBits(8, 26)).label).toBe('Very weak')
    expect(scoreStrength(entropyBits(20, 94)).score).toBe(4)
    expect(generateHexToken(16)).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('gradient lib', () => {
  it('builds css for each type', () => {
    const state = defaultGradient()
    expect(gradientCss(state)).toMatch(/^linear-gradient\(135deg, /)
    expect(gradientCss({ ...state, type: 'radial' })).toMatch(/^radial-gradient\(circle at center/)
    expect(gradientCss({ ...state, type: 'conic' })).toMatch(/^conic-gradient\(from 135deg/)
    expect(gradientCss({ ...state, type: 'mesh' })).toContain('radial-gradient(circle at 20% 25%')
  })

  it('exports svg for every gradient type', () => {
    const state = defaultGradient()
    expect(gradientSvg(state)).toContain('<linearGradient')
    // Conic has no SVG primitive, so it is approximated with flat wedges.
    const conic = gradientSvg({ ...state, type: 'conic' })
    expect(conic).toContain('<path')
    expect(conic).toContain('<svg')
    expect(gradientSvg({ ...state, type: 'radial' })).toContain('<radialGradient')
  })
})

describe('tailwind lib', () => {
  it('round-trips hex to oklch approximately', () => {
    const oklch = hexToOklch('#0d8a78')
    const back = hexToOklch(oklchToHex(oklch))
    expect(Math.abs(back.h - oklch.h)).toBeLessThan(2)
    expect(Math.abs(back.l - oklch.l)).toBeLessThan(0.01)
  })

  it('builds an 11-step scale and a theme block', () => {
    const scale = buildScale(170, 0.14)
    expect(scale).toHaveLength(11)
    expect(scale[0].value.l).toBeGreaterThan(scale[10].value.l)
    const block = buildThemeBlock(
      [{ id: 'x', name: 'Primary Color', hue: 170, chroma: 0.14 }],
      { fontSans: 'Inter', fontMono: 'monospace', radius: '1rem', spacingUnit: '0.25rem' },
    )
    expect(block).toContain('@theme {')
    expect(block).toContain('--color-primary-color-500: oklch(')
    expect(block).toContain('--font-sans: Inter;')
  })
})

describe('qr lib', () => {
  it('escapes wifi payloads', () => {
    expect(wifiPayload({ ssid: 'My;Net', password: 'p:a"ss', encryption: 'WPA', hidden: true })).toBe(
      'WIFI:T:WPA;S:My\\;Net;P:p\\:a\\"ss;H:true;;',
    )
  })

  it('builds mailto and normalizes urls', () => {
    expect(emailPayload({ to: 'a@b.c', subject: 'Hi', body: '' })).toBe('mailto:a@b.c?subject=Hi')
    expect(urlPayload('example.com')).toBe('https://example.com')
    expect(urlPayload('https://x.dev')).toBe('https://x.dev')
  })
})

describe('pdf coordinate mapping', () => {
  const W = 600
  const H = 800

  it('maps view points for every rotation', () => {
    // Top-left of the rendered view.
    expect(viewToPdf(0, W, H, { x: 0, y: 0 })).toEqual({ x: 0, y: H })
    expect(viewToPdf(90, W, H, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(viewToPdf(180, W, H, { x: 0, y: 0 })).toEqual({ x: W, y: 0 })
    expect(viewToPdf(270, W, H, { x: 0, y: 0 })).toEqual({ x: W, y: H })
  })

  it('keeps points inside the page for rotated views', () => {
    // View for 90° has width H and height W.
    const p = viewToPdf(90, W, H, { x: H / 2, y: W / 4 })
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(W)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThanOrEqual(H)
  })
})

describe('vcard and ics escaping', () => {
  it('escapes commas and semicolons in vCard text values', () => {
    const out = vcard({ name: 'Kumar, Akash', org: 'Acme; Ltd', email: 'a@b.co' })
    expect(out).toContain('FN:Kumar\\, Akash')
    expect(out).toContain('N:Kumar;Akash;;;')
    expect(out).toContain('ORG:Acme\\; Ltd')
  })

  it('emits the mandatory N property split into components', () => {
    const out = vcard({ name: 'Akash Kumar Singh' })
    expect(out).toContain('N:Singh;Akash;Kumar;;')
  })

  it('escapes a literal backslash before adding its own escapes', () => {
    const out = vcard({ name: 'A\\B' })
    expect(out).toContain('FN:A\\\\B')
  })

  it('escapes commas in an ICS summary', () => {
    const out = icsEvent({ title: 'Lunch, then review', start: '2026-03-01T10:00' })
    expect(out).toContain('SUMMARY:Lunch\\, then review')
  })

  it('folds content lines longer than 75 octets', () => {
    const out = icsEvent({ title: 'x', start: '2026-03-01T10:00', description: 'y'.repeat(200) })
    const longest = Math.max(...out.split('\r\n').map((l) => new TextEncoder().encode(l).length))
    expect(longest).toBeLessThanOrEqual(75)
  })
})

describe('csv parsing', () => {
  it('keeps a newline inside a quoted cell', () => {
    const rows = csvToJson('name,note\r\n"Asha","line one\nline two"')
    expect(rows).toHaveLength(1)
    expect(rows[0].note).toBe('line one\nline two')
  })

  it('keeps an escaped quote and a comma inside a cell', () => {
    const rows = csvToJson('a,b\n"say ""hi""","x,y"')
    expect(rows[0].a).toBe('say "hi"')
    expect(rows[0].b).toBe('x,y')
  })

  it('disambiguates duplicate headers instead of overwriting', () => {
    const rows = csvToJson('id,id\n1,2')
    expect(rows[0]).toEqual({ id: '1', id_2: '2' })
  })

  it('round-trips through jsonToCsv', () => {
    const csv = jsonToCsv(JSON.stringify([{ a: 'x,y', b: 'p"q' }]))
    expect(csvToJson(csv)[0]).toEqual({ a: 'x,y', b: 'p"q' })
  })
})

describe('random integers', () => {
  it('stays in range and terminates above the single-byte ceiling', () => {
    const values = Array.from({ length: 200 }, () => generatePin(4))
    expect(values.every((v) => /^\d{4}$/.test(v))).toBe(true)
    const long = generatePassword({ length: 300, sets: ['lower', 'digits'] })
    expect(long).toHaveLength(300)
  })
})
