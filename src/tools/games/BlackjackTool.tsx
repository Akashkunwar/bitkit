import { useState } from 'react'
import { freshBlackjack, handValue, hitBlackjack, standBlackjack, type Blackjack } from '../../lib/games/blackjack'
import { Arcade } from './kit'

function label(card: number) {
  return card === 1 ? 'A' : card > 10 ? ['J', 'Q', 'K'][card - 11] : String(card)
}

export default function BlackjackTool() {
  const [game, setGame] = useState<Blackjack>(() => freshBlackjack(6))
  const [seed, setSeed] = useState(6)
  const status =
    game.result === 'win'
      ? 'You win'
      : game.result === 'lose'
        ? 'You lose'
        : game.result === 'push'
          ? 'Push'
          : `You ${handValue(game.you)}`
  return (
    <Arcade
      title="Twenty-one"
      lede="Hit or stand. Face cards are 10. An ace is 1 or 11. The dealer draws to 17."
      status={status}
      onRestart={() => {
        const next = seed + 1
        setSeed(next)
        setGame(freshBlackjack(next))
      }}
    >
      <p>
        Dealer {game.done ? handValue(game.dealer) : '?'}:{' '}
        {(game.done ? game.dealer : game.dealer.slice(0, 1)).map(label).join(' ')}
      </p>
      <p>You: {game.you.map(label).join(' ')}</p>
      <div className="arcade-keys">
        <button
          type="button"
          className="btn"
          disabled={game.done || handValue(game.you) >= 21}
          onClick={() => setGame((current) => hitBlackjack(current))}
        >
          Hit
        </button>
        <button
          type="button"
          className="btn"
          disabled={game.done}
          onClick={() => setGame((current) => standBlackjack(current))}
        >
          Stand
        </button>
      </div>
    </Arcade>
  )
}
