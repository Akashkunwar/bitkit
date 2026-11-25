import { mulberry32 } from './random'

export type Picture = 'sun' | 'house' | 'boat' | 'tree' | 'moon' | 'key' | 'star' | 'cloud' | 'cup' | 'fish'

export type Prompt = { prompt: string; answers: string[]; picture?: Picture }

/** Original clues. Faster answers score more, up to 10, in the style of a picture-and-text party quiz. */
export const CLUES: Prompt[] = [
  { prompt: 'What is this?', answers: ['sun'], picture: 'sun' },
  { prompt: 'What is this?', answers: ['house', 'home'], picture: 'house' },
  { prompt: 'What is this?', answers: ['boat', 'ship'], picture: 'boat' },
  { prompt: 'What is this?', answers: ['tree'], picture: 'tree' },
  { prompt: 'What is this?', answers: ['moon'], picture: 'moon' },
  { prompt: 'What is this?', answers: ['key'], picture: 'key' },
  { prompt: 'What is this?', answers: ['star'], picture: 'star' },
  { prompt: 'What is this?', answers: ['cloud'], picture: 'cloud' },
  { prompt: 'What is this?', answers: ['cup', 'mug'], picture: 'cup' },
  { prompt: 'What is this?', answers: ['fish'], picture: 'fish' },
  { prompt: 'Striped African horse.', answers: ['zebra'] },
  { prompt: 'Flightless bird of Antarctica.', answers: ['penguin'] },
  { prompt: 'Keyboard instrument with 88 keys.', answers: ['piano'] },
  { prompt: 'Frozen water.', answers: ['ice'] },
  { prompt: 'The red planet.', answers: ['mars'] },
  { prompt: 'Tool whose needle points north.', answers: ['compass'] },
  { prompt: 'Season that follows summer.', answers: ['autumn', 'fall'] },
  { prompt: 'A shape with three sides.', answers: ['triangle'] },
  { prompt: 'Insect that makes honey.', answers: ['bee', 'honeybee'] },
  { prompt: 'What a caterpillar becomes.', answers: ['butterfly'] },
  { prompt: 'The colour of an emerald.', answers: ['green'] },
  { prompt: 'Sport played at Wimbledon.', answers: ['tennis'] },
  { prompt: 'A young dog.', answers: ['puppy'] },
  { prompt: 'Animal that says moo.', answers: ['cow'] },
]

/** Original questions for a three-life quiz. The last player with a life wins. */
export const QUESTIONS: Prompt[] = [
  { prompt: 'Capital of Canada?', answers: ['Ottawa'] },
  { prompt: 'Largest planet in the solar system?', answers: ['Jupiter'] },
  { prompt: 'Who wrote Hamlet?', answers: ['Shakespeare', 'William Shakespeare'] },
  { prompt: 'Boiling point of water in Celsius?', answers: ['100'] },
  { prompt: 'Which continent is Egypt in?', answers: ['Africa'] },
  { prompt: 'How many sides does a hexagon have?', answers: ['6', 'six'] },
  { prompt: 'Metal with the symbol Fe?', answers: ['iron'] },
  { prompt: 'Ocean between Europe and the Americas?', answers: ['Atlantic', 'Atlantic Ocean'] },
  { prompt: 'Closest star to Earth?', answers: ['sun'] },
  { prompt: 'Year of the first crewed Moon landing?', answers: ['1969'] },
  { prompt: 'Hardest natural substance?', answers: ['diamond'] },
  { prompt: 'Planet with the Great Red Spot?', answers: ['Jupiter'] },
  { prompt: 'Process plants use to make food from sunlight?', answers: ['photosynthesis'] },
  { prompt: 'Currency of Japan?', answers: ['yen'] },
  { prompt: 'Tallest living land animal?', answers: ['giraffe'] },
  { prompt: 'Freezing point of water in Celsius?', answers: ['0', 'zero'] },
  { prompt: 'Country whose mainland is shaped like a boot?', answers: ['Italy'] },
  { prompt: 'Organ that pumps blood?', answers: ['heart'] },
  { prompt: 'How many continents are commonly counted?', answers: ['7', 'seven'] },
  { prompt: 'Chemical symbol for gold?', answers: ['Au'] },
  { prompt: 'Fastest land animal?', answers: ['cheetah'] },
  { prompt: 'Gas that plants take in for photosynthesis?', answers: ['carbon dioxide', 'CO2'] },
  { prompt: 'Capital of Japan?', answers: ['Tokyo'] },
  { prompt: 'Number of strings on a standard violin?', answers: ['4', 'four'] },
]

export const CLUE_LIMIT_MS = 15_000
export const RIVAL_CHANCE = 0.62

export function normAnswer(value: string): string {
  const words = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const trimmed = words[0] === 'the' ? words.slice(1) : words
  return trimmed.join('')
}

export function answerMatches(value: string, answers: readonly string[]): boolean {
  const got = normAnswer(value)
  if (!got) return false
  return answers.some((answer) => normAnswer(answer) === got)
}

/** 10 for an instant answer, 1 just before the limit, 0 once time is up. */
export function clueScore(elapsedMs: number, limitMs = CLUE_LIMIT_MS): number {
  if (elapsedMs >= limitMs) return 0
  const ratio = 1 - Math.max(0, elapsedMs) / limitMs
  return Math.max(1, Math.min(10, Math.ceil(ratio * 10)))
}

export function orderPrompts(items: readonly Prompt[], seed: number): Prompt[] {
  const rand = mulberry32(seed)
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}

export function rivalCorrect(rand: () => number): boolean {
  return rand() < RIVAL_CHANCE
}

export type Lives = {
  you: number
  rival: number
  youRight: number
  rivalRight: number
  index: number
  over: '' | 'you' | 'rival' | 'draw'
}

export function freshLives(): Lives {
  return { you: 3, rival: 3, youRight: 0, rivalRight: 0, index: 0, over: '' }
}

export function stepLives(state: Lives, correct: boolean, rivalHit: boolean, total: number): Lives {
  if (state.over) return state
  const you = Math.max(0, state.you - (correct ? 0 : 1))
  const rival = Math.max(0, state.rival - (rivalHit ? 0 : 1))
  const youRight = state.youRight + (correct ? 1 : 0)
  const rivalRight = state.rivalRight + (rivalHit ? 1 : 0)
  const index = state.index + 1
  let over: Lives['over'] = ''
  if (you <= 0 && rival <= 0) over = 'draw'
  else if (you <= 0) over = 'rival'
  else if (rival <= 0) over = 'you'
  else if (index >= total) {
    if (youRight !== rivalRight) over = youRight > rivalRight ? 'you' : 'rival'
    else if (you !== rival) over = you > rival ? 'you' : 'rival'
    else over = 'draw'
  }
  return { you, rival, youRight, rivalRight, index, over }
}
