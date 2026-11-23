const WORDS = ['array', 'const', 'return', 'async', 'export', 'string', 'number', 'import']

export const CODE_SNIPPET = 'const local = true\nconsole.log(local)'
export const CODE_WORDS = WORDS

export function codeScore(expected: string, typed: string): number {
  let score = 0
  const limit = Math.min(expected.length, typed.length)
  for (let i = 0; i < limit; i += 1) if (expected[i] === typed[i]) score += 1
  return score
}

export function nextWord(words: string[], index: number): { word: string; index: number } {
  if (!words.length) throw new Error('Add a word.')
  const next = ((index % words.length) + words.length) % words.length
  return { word: words[next], index: (next + 1) % words.length }
}

export function certificateText(input: { name: string; wpm: number; accuracy: number }): string {
  const name = input.name.trim() || 'Typist'
  return `${name}\nTyping certificate\n${input.wpm} words per minute\n${input.accuracy}% accuracy\nIssued in this browser. Nothing was uploaded.`
}
