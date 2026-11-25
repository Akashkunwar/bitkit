import { COMMON_WORDS } from '../typing'

/** How long a number stays on screen. Longer runs of digits get more time. */
export function holdForDigits(count: number): number {
  return 800 + Math.max(1, count) * 700
}

export function digitsFor(count: number, rand: () => number): string {
  const n = Math.max(1, Math.min(20, count))
  let out = String(1 + Math.floor(rand() * 9))
  while (out.length < n) out += String(Math.floor(rand() * 10))
  return out
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}

export function pickCells(total: number, count: number, rand: () => number): number[] {
  const n = Math.max(0, Math.min(total, count))
  return shuffle(
    Array.from({ length: total }, (_, index) => index),
    rand,
  ).slice(0, n)
}

export type Verbal = {
  seen: string[]
  current: string
  lives: number
  score: number
  over: boolean
  bag: string[]
}

export function freshVerbal(rand: () => number, words?: readonly string[]): Verbal {
  const pool = words ?? [...new Set(COMMON_WORDS.filter((word) => /^[a-z]{4,}$/.test(word)))]
  const bag = shuffle(pool, rand)
  return { seen: [], current: bag[0] ?? 'word', lives: 3, score: 0, over: false, bag: bag.slice(1) }
}

/** `call` is what the player claims about the word on screen. A repeat is chosen when rand() < 0.5. */
export function judgeVerbal(state: Verbal, call: 'seen' | 'new', rand: () => number): Verbal {
  if (state.over) return state
  const wasSeen = state.seen.includes(state.current)
  const correct = (call === 'seen') === wasSeen
  const seen = !wasSeen && correct ? state.seen.concat(state.current) : state.seen
  const lives = correct ? state.lives : state.lives - 1
  const score = state.score + (correct ? 1 : 0)
  if (lives <= 0) return { ...state, seen, lives: 0, score, over: true }
  const next = nextWord(seen, state.bag, rand)
  return { ...state, seen, current: next.word, bag: next.bag, lives, score, over: false }
}

function nextWord(seen: string[], bag: string[], rand: () => number): { word: string; bag: string[] } {
  const repeat = seen.length > 0 && (bag.length === 0 || rand() < 0.5)
  if (repeat) return { word: seen[Math.floor(rand() * seen.length)] ?? seen[0], bag }
  return { word: bag[0] ?? seen[0] ?? 'word', bag: bag.slice(1) }
}

export type Chimp = {
  count: number
  spots: number[]
  hidden: boolean
  expect: number
  over: boolean
  cleared: number
  done: boolean
}

export const CHIMP_GRID = 8
export const CHIMP_MAX = 20

export function dealChimp(count: number, cleared: number, rand: () => number): Chimp {
  const n = Math.max(1, Math.min(CHIMP_MAX, count))
  return {
    count: n,
    spots: pickCells(CHIMP_GRID * CHIMP_GRID, n, rand),
    hidden: false,
    expect: 1,
    over: false,
    cleared,
    done: false,
  }
}

export function clickChimp(state: Chimp, cell: number, rand: () => number): Chimp {
  if (state.over || state.done) return state
  if (state.spots[state.expect - 1] !== cell) return { ...state, over: true }
  if (state.expect === state.count) {
    if (state.count >= CHIMP_MAX) return { ...state, hidden: true, cleared: state.count, done: true }
    return dealChimp(state.count + 1, state.count, rand)
  }
  return { ...state, hidden: true, expect: state.expect + 1 }
}

export function visualLayout(level: number): { size: number; tiles: number } {
  const wanted = level + 2
  const size = Math.min(6, 3 + Math.floor((wanted - 3) / 3))
  return { size, tiles: Math.min(wanted, size * size - 1) }
}

export type Visual = {
  level: number
  size: number
  tiles: number[]
  phase: 'show' | 'pick'
  picked: number[]
  over: boolean
  done: boolean
}

export const VISUAL_MAX = 18

export function freshVisual(level: number, rand: () => number): Visual {
  const { size, tiles } = visualLayout(level)
  return {
    level,
    size,
    tiles: pickCells(size * size, tiles, rand),
    phase: 'show',
    picked: [],
    over: false,
    done: false,
  }
}

export function revealVisual(state: Visual): Visual {
  if (state.over || state.done || state.phase !== 'show') return state
  return { ...state, phase: 'pick' }
}

export function pickVisual(state: Visual, cell: number, rand: () => number): Visual {
  if (state.over || state.done || state.phase !== 'pick' || state.picked.includes(cell)) return state
  if (!state.tiles.includes(cell)) return { ...state, over: true, picked: state.picked.concat(cell) }
  const picked = state.picked.concat(cell)
  if (picked.length < state.tiles.length) return { ...state, picked }
  if (state.level >= VISUAL_MAX) return { ...state, picked, done: true }
  return freshVisual(state.level + 1, rand)
}

export type Sequence = { order: number[]; pos: number; failed: boolean }

export function freshSequence(rand: () => number, cells = 9): Sequence {
  return { order: [Math.floor(rand() * cells)], pos: 0, failed: false }
}

export function pressSequence(state: Sequence, cell: number, rand: () => number, cells = 9): Sequence {
  if (state.failed) return state
  if (state.order[state.pos] !== cell) return { ...state, failed: true }
  if (state.pos + 1 < state.order.length) return { ...state, pos: state.pos + 1 }
  return { order: state.order.concat(Math.floor(rand() * cells)), pos: 0, failed: false }
}

export const AIM_ROUNDS = 30

/** Percent position, kept inset so a target is not clipped by the board edge. */
export function aimPoint(rand: () => number): { x: number; y: number } {
  return { x: 12 + rand() * 76, y: 14 + rand() * 72 }
}

export function benchLine(rand: () => number, count = 12): string {
  const pool = COMMON_WORDS.filter((word) => /^[a-z]{3,}$/.test(word))
  const words: string[] = []
  for (let i = 0; i < count; i += 1) words.push(pool[Math.floor(rand() * pool.length)] ?? 'word')
  return words.join(' ')
}

export function typingScore(typed: string, target: string, elapsedMs: number): { wpm: number; accuracy: number } {
  let correct = 0
  for (let i = 0; i < typed.length; i += 1) if (typed[i] === target[i]) correct += 1
  const minutes = Math.max(elapsedMs, 1) / 60_000
  const compared = Math.max(typed.length, 1)
  return {
    wpm: Math.round(correct / 5 / minutes),
    accuracy: Math.round((correct / compared) * 100),
  }
}
