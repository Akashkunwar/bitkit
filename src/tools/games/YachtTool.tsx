import { useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { freshYacht, rollYacht, takeYacht, YACHT_CATS, yachtTotal, type Yacht } from '../../lib/games/yacht'
import { Arcade } from './kit'

const NAMES: Record<(typeof YACHT_CATS)[number], string> = {
  '1': 'Ones',
  '2': 'Twos',
  '3': 'Threes',
  '4': 'Fours',
  '5': 'Fives',
  '6': 'Sixes',
  '3k': 'Three of a kind',
  '4k': 'Four of a kind',
  full: 'Full house',
  small: 'Small straight',
  large: 'Large straight',
  chance: 'Chance',
  yacht: 'Yacht',
}

export default function YachtTool() {
  const [rand] = useState(() => mulberry32(19))
  const [game, setGame] = useState<Yacht>(() => freshYacht(rand))
  return (
    <Arcade
      title="Yahtzee"
      lede="Roll up to three times. Hold dice by tapping them, then score a category. The upper half pays 35 extra at 63."
      status={game.done ? `Total ${yachtTotal(game.taken)}` : `Rolls left ${game.rolls}`}
      onRestart={() => setGame(freshYacht(rand))}
    >
      <div className="arcade-keys">
        {game.dice.map((die, index) => (
          <button
            key={index}
            type="button"
            className={game.held[index] ? 'arcade-cell arcade-tile' : 'arcade-cell'}
            onClick={() =>
              setGame((current) => ({
                ...current,
                held: current.held.map((held, at) => (at === index ? !held : held)),
              }))
            }
          >
            {die}
          </button>
        ))}
        <button
          type="button"
          className="btn"
          disabled={game.rolls <= 0 || game.done}
          onClick={() => setGame((current) => rollYacht(current, rand))}
        >
          Roll
        </button>
      </div>
      <div className="arcade-keys">
        {YACHT_CATS.map((cat) => (
          <button
            key={cat}
            type="button"
            className="btn"
            disabled={game.taken[cat] !== undefined}
            onClick={() => setGame((current) => takeYacht(current, cat, rand))}
          >
            {NAMES[cat]} {game.taken[cat] ?? ''}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
