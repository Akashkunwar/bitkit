export const GUESS_WORDS = [
  'APPLE',
  'BEACH',
  'BREAD',
  'BRICK',
  'CANDY',
  'CHAIR',
  'CLOUD',
  'CRANE',
  'DANCE',
  'DREAM',
  'EARTH',
  'FLAME',
  'FROST',
  'GRAPE',
  'HEART',
  'HOUSE',
  'IVORY',
  'JELLY',
  'KNIFE',
  'LEMON',
  'LIGHT',
  'MAPLE',
  'MOUSE',
  'NIGHT',
  'OCEAN',
  'PEACH',
  'PLANT',
  'QUEEN',
  'RIVER',
  'ROBIN',
  'SHEEP',
  'SMILE',
  'SNAKE',
  'STONE',
  'STORM',
  'SUGAR',
  'TIGER',
  'TOWER',
  'TRAIN',
  'WATER',
  'WHEAT',
  'WORLD',
  'YOUTH',
  'ZEBRA',
  'BLEND',
  'CRISP',
  'FLUTE',
  'GLOBE',
  'HONEY',
  'INDEX',
]

export type Mark = 'g' | 'y' | 'b'
export type Guess = { word: string; target: string; guesses: string[]; status: '' | 'win' | 'lose'; note: string }

export function freshGuess(rand: () => number): Guess {
  return { word: GUESS_WORDS[Math.floor(rand() * GUESS_WORDS.length)], target: '', guesses: [], status: '', note: '' }
}

export function markGuess(guess: string, target: string): Mark[] {
  const out: Mark[] = Array(5).fill('b')
  const left = target.split('')
  for (let i = 0; i < 5; i += 1) {
    if (guess[i] === target[i]) {
      out[i] = 'g'
      left[i] = ''
    }
  }
  for (let i = 0; i < 5; i += 1) {
    if (out[i] === 'g') continue
    const at = left.indexOf(guess[i])
    if (at >= 0) {
      out[i] = 'y'
      left[at] = ''
    }
  }
  return out
}

export function submitGuess(state: Guess, raw: string): Guess {
  if (state.status) return state
  const word = raw.toUpperCase()
  if (word.length !== 5) return { ...state, note: 'Five letters' }
  if (!GUESS_WORDS.includes(word)) return { ...state, note: 'Not in the word list' }
  if (state.guesses.includes(word)) return { ...state, note: 'Already tried' }
  const guesses = state.guesses.concat(word)
  const status = word === state.word ? 'win' : guesses.length >= 6 ? 'lose' : ''
  return { ...state, guesses, status, target: '', note: '' }
}
