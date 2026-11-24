import { useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { freshHangman, guessLetter, wonHangman, type Hangman } from '../../lib/games/hangman'
import { Arcade } from './kit'

export default function HangmanTool() {
  const [rand] = useState(() => mulberry32(13))
  const [game, setGame] = useState<Hangman>(() => freshHangman(rand))
  const lost = game.misses >= 6
  const won = wonHangman(game)
  const shown = game.word
    .split('')
    .map((letter) => (game.guessed.includes(letter) || lost ? letter : '_'))
    .join(' ')
  return (
    <Arcade
      title="Hangman"
      lede="Guess the word one letter at a time. Six misses and the word is shown."
      status={won ? 'Got it' : lost ? 'Out of guesses' : `Misses ${game.misses} of 6`}
      onRestart={() => setGame(freshHangman(rand))}
    >
      <p className="arcade-word">{shown}</p>
      <div className="arcade-keys">
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
          <button
            key={letter}
            type="button"
            className="btn"
            disabled={game.guessed.includes(letter) || won || lost}
            onClick={() => setGame((current) => guessLetter(current, letter))}
          >
            {letter}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
