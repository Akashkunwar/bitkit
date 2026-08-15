import { tools, type ToolMeta } from '../registry'

/**
 * Keyboard chords, matched as a prefix tree.
 *
 * The original scheme was "G then one letter", which caps out at 25 tools.
 * With 59 tools most had no shortcut at all, so chords may now be two letters
 * deep: "G J" still opens JSON, while "G T A" opens the data table. A one-letter
 * chord is only allowed when no longer chord starts with the same letter, so
 * there is never an ambiguous wait.
 */

export type Chord = {
  /** Keys after the leader, lower case. */
  keys: string[]
  path: string
  label: string
  group: string
}

export const LEADER = 'g'

/** How long a partial chord waits for its next key before lapsing. */
export const CHORD_TIMEOUT_MS = 1400

export type MatchResult =
  | { kind: 'none' }
  | { kind: 'pending'; keys: string[]; options: Chord[] }
  | { kind: 'match'; chord: Chord }

function parseShortcut(shortcut: string): string[] {
  // Accepts "G then W" and "G W" and "G T A".
  return shortcut
    .replace(/\bthen\b/gi, ' ')
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((k) => k.toLowerCase())
    .filter(Boolean)
}

export const HOME_CHORD: Chord = { keys: ['h'], path: '/', label: 'Home', group: 'Go to' }

export const EXTRA_CHORDS: Chord[] = [
  HOME_CHORD,
  { keys: ['?'], path: '#shortcuts', label: 'Shortcut cheatsheet', group: 'App' },
]

/** Every navigable chord, derived from the registry so it cannot drift. */
export function buildChords(list: ToolMeta[] = tools): Chord[] {
  const fromTools = list.flatMap((tool) => {
    const all = [tool.shortcut, ...(tool.aliases ?? [])].filter(Boolean) as string[]
    return all
      .map((shortcut) => ({
        keys: parseShortcut(shortcut),
        path: tool.path,
        label: tool.title,
        group: tool.category,
      }))
      .filter((chord) => chord.keys.length > 0)
  })
  return [HOME_CHORD, ...fromTools]
}

/** One row per tool for the cheatsheet, primary chord first. */
export function chordsByTool(list: ToolMeta[] = tools): { tool: ToolMeta; chords: string[] }[] {
  return list
    .filter((tool) => tool.shortcut)
    .map((tool) => ({
      tool,
      chords: [tool.shortcut as string, ...(tool.aliases ?? [])],
    }))
}

export const CHORDS: Chord[] = buildChords()

/**
 * Matches the keys pressed so far.
 *
 * A complete chord wins immediately unless another chord extends it, which the
 * assignment rules below prevent — so there is no trailing timeout on a match.
 */
export function matchChord(pressed: string[], chords: Chord[] = CHORDS): MatchResult {
  if (!pressed.length) return { kind: 'none' }
  const candidates = chords.filter((chord) =>
    pressed.every((key, i) => chord.keys[i] === key),
  )
  if (!candidates.length) return { kind: 'none' }

  const exact = candidates.find((chord) => chord.keys.length === pressed.length)
  const longer = candidates.filter((chord) => chord.keys.length > pressed.length)
  if (exact && !longer.length) return { kind: 'match', chord: exact }
  if (longer.length) return { kind: 'pending', keys: pressed, options: longer }
  return { kind: 'none' }
}

/** Chord rendered for display: "G T A". */
export function formatChord(chord: Chord): string {
  return [LEADER, ...chord.keys].map((k) => k.toUpperCase()).join(' ')
}

/**
 * Reports chords that are a strict prefix of another, which would make the
 * shorter one unreachable without a timeout. A test asserts this stays empty.
 */
export function findAmbiguous(chords: Chord[] = CHORDS): { shorter: Chord; longer: Chord }[] {
  const out: { shorter: Chord; longer: Chord }[] = []
  for (const a of chords) {
    for (const b of chords) {
      if (a === b || a.keys.length >= b.keys.length) continue
      if (a.keys.every((key, i) => b.keys[i] === key)) out.push({ shorter: a, longer: b })
    }
  }
  return out
}

export function findDuplicates(chords: Chord[] = CHORDS): Chord[][] {
  const seen = new Map<string, Chord[]>()
  for (const chord of chords) {
    const key = chord.keys.join('')
    seen.set(key, [...(seen.get(key) ?? []), chord])
  }
  return [...seen.values()].filter((group) => group.length > 1)
}
