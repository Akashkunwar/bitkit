function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pick one entry. An empty list returns an empty string. */
export function pickName(names: string[], seed: number): string {
  if (names.length === 0) return ''
  const rand = mulberry32(seed)
  return names[Math.floor(rand() * names.length)] ?? ''
}

/** `65` → `1:05`. Minutes can grow past 59. */
export function countdownLabel(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(total / 60)
  const remain = total % 60
  return `${minutes}:${remain.toString().padStart(2, '0')}`
}

/** Return a new score map. The input object is left as it was. */
export function addScore(scores: Record<string, number>, name: string, delta: number): Record<string, number> {
  return { ...scores, [name]: (scores[name] ?? 0) + delta }
}

/** Inhale, hold, and exhale beats for one breathing cycle. */
export function meditationPhases(): { name: string; seconds: number }[] {
  return [
    { name: 'Inhale', seconds: 4 },
    { name: 'Hold', seconds: 7 },
    { name: 'Exhale', seconds: 8 },
  ]
}

/**
 * Roll dice notation with mulberry32.
 * `4d6kh3` rolls 4d6 and keeps the highest 3. `2d20+3` adds the modifier to the total.
 * `rolls` is the dice that count. `total` is their sum plus any modifier.
 */
export function rollNotation(notation: string, seed: number): { rolls: number[]; total: number } {
  const cleaned = notation.replace(/\s+/g, '')
  const match = cleaned.match(/^(\d*)d(\d+)(?:(kh|kl)(\d+))?([+-]\d+)?$/i)
  if (!match) throw new Error('Use notation like 2d20+3 or 4d6kh3.')
  const count = match[1] ? Number(match[1]) : 1
  const sides = Number(match[2])
  const keepOp = match[3]?.toLowerCase()
  const keepRaw = match[4] ? Number(match[4]) : null
  const modifier = match[5] ? Number(match[5]) : 0
  if (
    !Number.isInteger(count) ||
    !Number.isInteger(sides) ||
    count < 1 ||
    count > 100 ||
    sides < 1 ||
    sides > 1000 ||
    (keepOp !== undefined && (keepRaw === null || !Number.isInteger(keepRaw) || keepRaw < 1))
  ) {
    throw new Error('Use notation like 2d20+3 or 4d6kh3.')
  }
  const rand = mulberry32(seed)
  const rolled: number[] = []
  for (let i = 0; i < count; i += 1) rolled.push(1 + Math.floor(rand() * sides))
  let kept = rolled
  if (keepOp && keepRaw !== null) {
    const keepCount = Math.min(rolled.length, keepRaw)
    const sorted = [...rolled].sort((a, b) => a - b)
    kept = keepOp === 'kh' ? sorted.slice(sorted.length - keepCount) : sorted.slice(0, keepCount)
  }
  const total = kept.reduce((sum, roll) => sum + roll, 0) + modifier
  return { rolls: kept, total }
}

/** Next index in a turn order. Wraps to the start. An empty list stays at 0. */
export function nextPlayer(names: string[], index: number): number {
  if (names.length === 0) return 0
  const next = index + 1
  return ((next % names.length) + names.length) % names.length
}

/** Exactly one imposter when there is at least one name. */
export function assignRoles(names: string[], seed: number): { name: string; role: 'imposter' | 'crew' }[] {
  if (names.length < 1) return []
  const rand = mulberry32(seed)
  const imposter = Math.floor(rand() * names.length)
  return names.map((name, index) => ({ name, role: index === imposter ? 'imposter' : 'crew' }))
}

/** Prompt at `index`, wrapping around the list. */
export function nextPrompt(prompts: string[], index: number): string {
  if (prompts.length === 0) return ''
  const wrapped = ((Math.trunc(index) % prompts.length) + prompts.length) % prompts.length
  return prompts[wrapped] ?? ''
}

/** A gift can be stolen once, and only after it is opened. */
export function canSteal(opened: boolean, stolen: boolean): boolean {
  return opened && !stolen
}

/** A point inside a square of the given width. */
export function targetPosition(seed: number, width: number): { x: number; y: number } {
  const span = Number.isFinite(width) && width > 0 ? width : 0
  const rand = mulberry32(seed)
  return { x: rand() * span, y: rand() * span }
}

/** First-round pairs. Four names become two matches. A leftover name is a bye. */
export function singleElim(names: string[]): string[][] {
  const list = names.map((name) => name.trim()).filter(Boolean)
  const matches: string[][] = []
  for (let i = 0; i < list.length; i += 2) matches.push(list.slice(i, i + 2))
  return matches
}

/** A new order of the same names. */
export function raceStep(names: string[], seed: number): string[] {
  const next = [...names]
  const rand = mulberry32(seed)
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const swap = next[i]
    next[i] = next[j]
    next[j] = swap
  }
  return next
}

/** Elimination order. The last entry is the winner. */
export function simulateHunger(names: string[], seed: number): string[] {
  const alive = [...names]
  const order: string[] = []
  const rand = mulberry32(seed)
  while (alive.length > 1) {
    const index = Math.floor(rand() * alive.length)
    const out = alive.splice(index, 1)[0]
    if (out !== undefined) order.push(out)
  }
  if (alive.length === 1 && alive[0] !== undefined) order.push(alive[0])
  return order
}
