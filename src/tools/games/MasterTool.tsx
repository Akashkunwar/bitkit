import { useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { freshMaster, guessMaster, type Master } from '../../lib/games/master'
import { Arcade } from './kit'

const COLORS = ['#e85d4c', '#eab04a', '#c9f150', '#67e8f9', '#b797ee', '#f4f1e4']

export default function MasterTool() {
  const [rand] = useState(() => mulberry32(11))
  const [game, setGame] = useState<Master>(() => freshMaster(rand))
  const [draft, setDraft] = useState([0, 0, 0, 0])
  const setPeg = (index: number) =>
    setDraft((current) => current.map((peg, at) => (at === index ? (peg + 1) % 6 : peg)))
  const status = game.solved
    ? 'Cracked'
    : game.guesses.length >= 8
      ? 'The code stands'
      : `Guess ${game.guesses.length + 1} of 8`
  return (
    <Arcade
      title="Codebreaker"
      lede="Four pegs, six colours, and colours may repeat. A black mark is the right colour in the right place. A white mark is the right colour elsewhere. Each peg shows its number."
      status={status}
      onRestart={() => {
        setGame(freshMaster(rand))
        setDraft([0, 0, 0, 0])
      }}
    >
      <div className="stack">
        {game.guesses.map((guess, index) => (
          <div key={index} className="arcade-keys">
            {guess.pegs.map((peg, at) => (
              <span
                key={at}
                className="arcade-cell"
                style={{ background: COLORS[peg], width: 28, color: '#161613' }}
                aria-label={`Colour ${peg + 1}`}
              >
                {peg + 1}
              </span>
            ))}
            <span>
              {'●'.repeat(guess.exact)}
              {'○'.repeat(guess.color)}
            </span>
          </div>
        ))}
        {!game.solved && game.guesses.length < 8 && (
          <div className="arcade-keys">
            {draft.map((peg, index) => (
              <button
                key={index}
                type="button"
                className="arcade-cell"
                style={{ background: COLORS[peg], width: 36, color: '#161613' }}
                aria-label={`Peg ${index + 1}, colour ${peg + 1}`}
                onClick={() => setPeg(index)}
              >
                {peg + 1}
              </button>
            ))}
            <button type="button" className="btn" onClick={() => setGame((current) => guessMaster(current, draft))}>
              Try
            </button>
          </div>
        )}
        {(game.solved || game.guesses.length >= 8) && <p>Code {game.secret.map((peg) => peg + 1).join(' ')}</p>}
      </div>
    </Arcade>
  )
}
