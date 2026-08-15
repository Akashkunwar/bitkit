import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildChords,
  findAmbiguous,
  findDuplicates,
  formatChord,
  matchChord,
  CHORDS,
} from '../lib/chords'
import {
  encodeSettingsToHash,
  readSettingsFromHash,
  sortByUsage,
  usageScore,
} from '../lib/prefs'
import { BACKUP_VERSION, parseBackup, summarise } from '../lib/backup'
import { missingSteps, newPipeline, suggestFromTrail, titleForStep } from '../lib/pipelines'
import { buildActions, searchActions, setPreset, takePreset } from '../lib/actions'
import { dictKeys, makeTranslator } from '../lib/i18n'
import { tools } from '../registry'

describe('chords', () => {
  it('gives every tool a chord', () => {
    expect(tools.every((tool) => Boolean(tool.shortcut))).toBe(true)
  })

  it('has no duplicate or ambiguous chords', () => {
    // A chord that prefixes another could never fire without a timeout.
    expect(findDuplicates(CHORDS)).toEqual([])
    expect(findAmbiguous(CHORDS)).toEqual([])
  })

  it('matches a one-key chord immediately', () => {
    const result = matchChord(['j'])
    expect(result.kind).toBe('match')
    if (result.kind === 'match') expect(result.chord.path).toBe('/json')
  })

  it('waits for the second key of a two-key chord', () => {
    const pending = matchChord(['4'])
    expect(pending.kind).toBe('pending')
    const done = matchChord(['4', 'd'])
    expect(done.kind).toBe('match')
    if (done.kind === 'match') expect(done.chord.path).toBe('/table')
  })

  it('reports no match for an unknown key', () => {
    expect(matchChord(['ñ']).kind).toBe('none')
    expect(matchChord(['4', 'ñ']).kind).toBe('none')
  })

  it('reaches a tool by both its primary chord and its alias', () => {
    const convert = tools.find((t) => t.id === 'convert')!
    expect(convert.shortcut).toBe('G W')
    expect(convert.aliases?.[0]).toBe('G 1 C')
    const viaLetter = matchChord(['w'])
    const viaCategory = matchChord(['1', 'c'])
    expect(viaLetter.kind).toBe('match')
    expect(viaCategory.kind).toBe('match')
    if (viaLetter.kind === 'match' && viaCategory.kind === 'match') {
      expect(viaLetter.chord.path).toBe(viaCategory.chord.path)
    }
  })

  it('formats a chord for display', () => {
    expect(formatChord({ keys: ['4', 'd'], path: '/table', label: 'Data table', group: 'Data' })).toBe('G 4 D')
  })

  it('parses both the legacy and the new shortcut spellings', () => {
    const built = buildChords([
      { ...tools[0], shortcut: 'G then Q', aliases: [] },
    ] as typeof tools)
    expect(built.some((c) => c.keys.join('') === 'q')).toBe(true)
  })
})

describe('usage ranking', () => {
  it('decays old use so recent work ranks higher', () => {
    const now = Date.now()
    const fresh = usageScore({ count: 5, last: now }, now)
    const stale = usageScore({ count: 5, last: now - 28 * 86_400_000 }, now)
    expect(fresh).toBeGreaterThan(stale)
    // Two half-lives at 14 days each.
    expect(stale).toBeCloseTo(5 * 0.25, 5)
  })

  it('treats an unused tool as zero', () => {
    expect(usageScore(undefined)).toBe(0)
  })

  it('sorts by decayed score', () => {
    const now = Date.now()
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const sorted = sortByUsage(items, {
      a: { count: 1, last: now },
      b: { count: 50, last: now - 365 * 86_400_000 },
      c: { count: 9, last: now },
    })
    expect(sorted[0].id).toBe('c')
  })
})

describe('shareable settings', () => {
  it('round-trips plain values through the hash', () => {
    const hash = encodeSettingsToHash({ quality: 0.8, mode: 'jpeg', grid: [1, 2, 3], on: true })
    expect(readSettingsFromHash(hash)).toEqual({ quality: 0.8, mode: 'jpeg', grid: [1, 2, 3], on: true })
  })

  it('drops anything that is not a plain value', () => {
    const hash = encodeSettingsToHash({
      keep: 'yes',
      // A File or a nested object could carry document contents into a URL.
      file: { name: 'secret.pdf' },
      fn: 'ok',
    })
    const decoded = readSettingsFromHash<Record<string, unknown>>(hash)
    expect(decoded).toEqual({ keep: 'yes', fn: 'ok' })
  })

  it('survives non-Latin characters', () => {
    const hash = encodeSettingsToHash({ title: 'नमस्ते — hello' })
    expect(readSettingsFromHash<{ title: string }>(hash)?.title).toBe('नमस्ते — hello')
  })

  it('returns null for junk', () => {
    expect(readSettingsFromHash('#nonsense')).toBeNull()
    expect(readSettingsFromHash('#s=not-base64!!')).toBeNull()
  })
})

describe('backup', () => {
  const valid = JSON.stringify({
    app: 'bitkit',
    version: BACKUP_VERSION,
    exportedAt: '2026-01-01T00:00:00.000Z',
    notes: [{ id: 'n1', title: 'Note', body: 'Body', pinned: true, updatedAt: 5 }],
    prefs: [{ key: 'favorites', value: ['json'] }],
    local: { 'bitkit-theme': 'dark', 'evil-key': 'nope' },
  })

  it('accepts a well-formed backup', () => {
    const backup = parseBackup(valid)
    expect(backup.notes).toHaveLength(1)
    expect(backup.prefs).toHaveLength(1)
    expect(summarise(backup).notes).toBe(1)
  })

  it('only restores localStorage keys BitKit owns', () => {
    // A doctored file must not be able to write arbitrary storage keys.
    expect(parseBackup(valid).local).toEqual({ 'bitkit-theme': 'dark' })
  })

  it('rejects files from another app or a newer version', () => {
    expect(() => parseBackup('{"app":"other","version":1}')).toThrow(/not exported by BitKit/)
    expect(() => parseBackup(`{"app":"bitkit","version":${BACKUP_VERSION + 1}}`)).toThrow(/newer version/)
    expect(() => parseBackup('not json')).toThrow(/not valid JSON/)
  })

  it('repairs partial notes rather than dropping them', () => {
    const backup = parseBackup('{"app":"bitkit","version":2,"notes":[{"body":"only a body"}]}')
    expect(backup.notes).toHaveLength(1)
    expect(backup.notes[0].id).toBeTruthy()
    expect(backup.notes[0].title).toBe('Untitled')
  })
})

describe('pipelines', () => {
  it('flags steps whose tool no longer exists', () => {
    const pipeline = { ...newPipeline('Test'), steps: [{ toolId: 'json' }, { toolId: 'ghost' }] }
    expect(missingSteps(pipeline)).toEqual(['ghost'])
    expect(titleForStep({ toolId: 'json' })).toBe('JSON formatter')
    expect(titleForStep({ toolId: 'ghost' })).toContain('Unknown')
  })

  it('builds steps from a trail, collapsing repeats', () => {
    expect(suggestFromTrail(['exif', 'exif', 'compress', 'ghost', 'clipboard'])).toEqual([
      { toolId: 'exif' },
      { toolId: 'compress' },
      { toolId: 'clipboard' },
    ])
  })
})

describe('palette actions', () => {
  it('offers actions for the common jobs', () => {
    const actions = buildActions()
    expect(actions.length).toBeGreaterThan(8)
    expect(actions.every((a) => a.label && a.group && a.run)).toBe(true)
  })

  it('finds actions by verb', () => {
    expect(searchActions('compress').length).toBeGreaterThan(0)
    expect(searchActions('paste')[0].label.toLowerCase()).toContain('paste')
    expect(searchActions('uuid')[0].label).toContain('UUID')
  })

  it('returns nothing for an empty query, so browsing stays clean', () => {
    expect(searchActions('')).toEqual([])
  })

  it('hands a preset to exactly one tool, once', () => {
    setPreset('compress', { maxBytes: '300kb' })
    expect(takePreset('shrink')).toBeNull()
    expect(takePreset('compress')).toEqual({ maxBytes: '300kb' })
    // Consumed, so a later visit does not silently re-apply it.
    expect(takePreset('compress')).toBeNull()
  })
})

describe('i18n', () => {
  it('has the same keys in every language', () => {
    expect(dictKeys('hi')).toEqual(dictKeys('en'))
  })

  it('interpolates variables', () => {
    const t = makeTranslator('en')
    expect(t('home.searchPlaceholder', { count: 61 })).toContain('61')
  })

  it('translates into Hindi', () => {
    const t = makeTranslator('hi')
    expect(t('nav.home')).toBe('होम')
    expect(t('category.Image')).toBe('तस्वीर')
  })

  it('falls back to English then to the key itself', () => {
    const t = makeTranslator('hi')
    expect(t('definitely.missing.key')).toBe('definitely.missing.key')
  })

  it('has a translation for every category', () => {
    const t = makeTranslator('hi')
    for (const tool of tools) {
      expect(t(`category.${tool.category}`)).not.toBe(`category.${tool.category}`)
    }
  })
})

describe('registry integrity after the platform pass', () => {
  it('keeps ids, paths, and chords unique', () => {
    const ids = tools.map((t) => t.id)
    const paths = tools.map((t) => t.path)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('registers the platform tools', () => {
    expect(tools.map((t) => t.id)).toEqual(expect.arrayContaining(['settings', 'pipelines']))
  })
})
