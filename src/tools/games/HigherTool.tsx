import { useState } from 'react'
import { callHigher, cardLabel, freshHigher, type Higher } from '../../lib/games/higher'
import { Arcade } from './kit'

export default function HigherTool() {
  const [game, setGame] = useState<Higher>(() => freshHigher(21))
  const [seed, setSeed] = useState(21)
  return (
    <Arcade
      title="Higher"
      lede="The next card is either higher or lower. Ace is high. A tie keeps the streak."
      status={
        game.over
          ? game.deck.length
            ? `Bust · streak ${game.streak}`
            : `Deck cleared · streak ${game.streak}`
          : `Streak ${game.streak}`
      }
      onRestart={() => {
        const next = seed + 1
        setSeed(next)
        setGame(freshHigher(next))
      }}
    >
      <p className="arcade-word">
        {game.previous !== null ? `${cardLabel(game.previous)}  ` : ''}
        {cardLabel(game.current)}
      </p>
      <div className="arcade-keys">
        <button
          type="button"
          className="btn"
          disabled={game.over}
          onClick={() => setGame((current) => callHigher(current, true))}
        >
          Higher
        </button>
        <button
          type="button"
          className="btn"
          disabled={game.over}
          onClick={() => setGame((current) => callHigher(current, false))}
        >
          Lower
        </button>
      </div>
    </Arcade>
  )
}
