import { COMMON_WORDS } from '../typing'
import { mulberry32 } from './random'

const MORE_WORDS =
  'apple because theme string jump bike house water green black white small large happy quiet music story light night right under after again about their there where which would could should other people little mother father friend school garden orange yellow purple silver golden butter sugar honey bread cheese fruit grape lemon peach plant river stone train world youth dream flame frost heart ivory knife maple mouse ocean queen sheep smile snake tiger tower wheat zebra blend crisp flute globe honey index'.split(
    /\s+/,
  )

export const FUSE_WORDS = [
  ...new Set(
    [...COMMON_WORDS, ...MORE_WORDS].map((word) => word.toLowerCase()).filter((word) => /^[a-z]{4,}$/.test(word)),
  ),
]

const PROMPTS = collectPrompts(FUSE_WORDS)

function collectPrompts(words: string[]): string[] {
  const counts = new Map<string, number>()
  for (const word of words) {
    for (let length = 2; length <= 3; length += 1) {
      for (let index = 0; index <= word.length - length; index += 1) {
        const slice = word.slice(index, index + length)
        counts.set(slice, (counts.get(slice) ?? 0) + 1)
      }
    }
  }
  return [...counts.entries()].filter((entry) => entry[1] >= 8).map((entry) => entry[0])
}

export type Fuse = {
  prompt: string
  used: string[]
  time: number
  score: number
  dead: boolean
  note: string
  seed: number
}

function pickPrompt(seed: number, avoid: string): { prompt: string; seed: number } {
  const rand = mulberry32(seed)
  let prompt = PROMPTS[Math.floor(rand() * PROMPTS.length)] ?? 'th'
  if (prompt === avoid) prompt = PROMPTS[Math.floor(rand() * PROMPTS.length)] ?? 'an'
  const next = rand()
  return { prompt, seed: Math.floor(next * 1_000_000_000) }
}

export function freshFuse(seed = 11): Fuse {
  const picked = pickPrompt(seed, '')
  return { prompt: picked.prompt, used: [], time: 110, score: 0, dead: false, note: '', seed: picked.seed }
}

export function stepFuse(state: Fuse): Fuse {
  if (state.dead) return state
  const time = state.time - 1
  if (time <= 0) return { ...state, time: 0, dead: true, note: 'The fuse ran out' }
  return { ...state, time }
}

export function submitFuse(state: Fuse, raw: string): Fuse {
  if (state.dead) return state
  const word = raw.toLowerCase().trim()
  if (!FUSE_WORDS.includes(word)) return { ...state, note: 'Not in the word list' }
  if (state.used.includes(word)) return { ...state, note: 'Already used' }
  if (!word.includes(state.prompt)) return { ...state, note: 'That word misses the letters' }
  const picked = pickPrompt(state.seed, state.prompt)
  return {
    ...state,
    used: state.used.concat(word),
    score: state.score + 1,
    time: Math.min(160, state.time + 45),
    prompt: picked.prompt,
    seed: picked.seed,
    note: '',
  }
}
