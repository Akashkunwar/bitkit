import { useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { freshGuess, markGuess, submitGuess, type Guess } from '../../lib/games/guess'
import { Arcade } from './kit'

export default function GuessTool() {
  const [rand] = useState(() => mulberry32(17))
  const [game, setGame] = useState<Guess>(() => freshGuess(rand))
  const [text, setText] = useState('')
  const send = () => {
    setGame((current) => submitGuess(current, text))
    setText('')
  }
  const status = game.status === 'win' ? 'Got it' : game.status === 'lose' ? game.word : `${game.guesses.length} of 6`
  return (
    <Arcade
      title="Word guess"
      lede="Six tries at a five-letter word from the list. Green is the right place. Amber is in the word."
      status={status}
      onRestart={() => {
        setGame(freshGuess(rand))
        setText('')
      }}
    >
      <div className="stack">
        {game.guesses.map((guess) => (
          <div key={guess} className="arcade-keys">
            {markGuess(guess, game.word).map((mark, index) => (
              <span key={index} className={`arcade-cell mark-${mark}`}>
                {guess[index]}
              </span>
            ))}
          </div>
        ))}
        {!game.status && (
          <div className="arcade-keys">
            <input
              className="field"
              value={text}
              maxLength={5}
              onChange={(event) => setText(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter') send()
              }}
              aria-label="Guess"
            />
            <button type="button" className="btn" onClick={send}>
              Guess
            </button>
          </div>
        )}
      </div>
    </Arcade>
  )
}
