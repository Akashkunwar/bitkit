const WORDS = [
  'PLANET',
  'ROCKET',
  'CASTLE',
  'BRIDGE',
  'GARDEN',
  'BUTTON',
  'CANDLE',
  'FOREST',
  'MARKET',
  'PIRATE',
  'SILVER',
  'WINTER',
  'ANCHOR',
  'CAMERA',
  'DRAGON',
  'JUNGLE',
  'LANTERN',
  'ORANGE',
  'PENCIL',
  'TUNNEL',
]

export type Hangman = { word: string; guessed: string[]; misses: number }

export function freshHangman(rand: () => number): Hangman {
  return { word: WORDS[Math.floor(rand() * WORDS.length)], guessed: [], misses: 0 }
}

export function guessLetter(state: Hangman, letter: string): Hangman {
  const mark = letter.toUpperCase()
  if (state.misses >= 6 || state.guessed.includes(mark) || wonHangman(state)) return state
  const guessed = state.guessed.concat(mark)
  const misses = state.word.includes(mark) ? state.misses : state.misses + 1
  return { ...state, guessed, misses }
}

export function wonHangman(state: Hangman) {
  return state.word.split('').every((letter) => state.guessed.includes(letter))
}
