import { useState } from 'react'
import {
  drawKlondike,
  freshKlondike,
  klondikeWon,
  toFoundation,
  toTableau,
  type Card,
  type Klondike,
  type Take,
} from '../../lib/games/klondike'
import { Arcade } from './kit'

const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS = ['♥', '♦', '♣', '♠']

function Face({ card, selected, onClick }: { card?: Card; selected?: boolean; onClick: () => void }) {
  if (!card) {
    return (
      <button type="button" className="card" onClick={onClick}>
        {' '}
      </button>
    )
  }
  if (!card.up) {
    return (
      <button type="button" className="card back" onClick={onClick}>
        {' '}
      </button>
    )
  }
  return (
    <button type="button" className={`card${card.suit < 2 ? ' red' : ''}${selected ? ' sel' : ''}`} onClick={onClick}>
      {RANKS[card.rank]}
      {SUITS[card.suit]}
    </button>
  )
}

export default function KlondikeTool() {
  const [game, setGame] = useState<Klondike>(() => freshKlondike(8))
  const [seed, setSeed] = useState(8)
  const [from, setFrom] = useState<Take | null>(null)

  const aim = (dest: number) => {
    if (!from) return
    const next = toTableau(game, from, dest)
    if (next) {
      setGame(next)
      setFrom(null)
    }
  }

  const found = (source: Take) => {
    const next = toFoundation(game, source)
    if (!next) return false
    setGame(next)
    setFrom(null)
    return true
  }

  return (
    <Arcade
      title="Solitaire"
      lede="Click the stock to draw. Click a face-up card, then a column or a foundation. Build down in alternating colours. Foundations go up by suit from the ace."
      status={klondikeWon(game) ? 'Cleared' : `Stock ${game.stock.length}`}
      onRestart={() => {
        const next = seed + 1
        setSeed(next)
        setGame(freshKlondike(next))
        setFrom(null)
      }}
    >
      <div className="arcade-scroll">
        <div className="arcade-keys">
          <button
            type="button"
            className="card back"
            onClick={() => {
              setGame((current) => drawKlondike(current))
              setFrom(null)
            }}
          >
            {game.stock.length ? game.stock.length : '↻'}
          </button>
          <Face
            card={game.waste[game.waste.length - 1]}
            selected={from?.kind === 'waste'}
            onClick={() => setFrom(from?.kind === 'waste' ? null : { kind: 'waste' })}
          />
          {game.foundations.map((pile, suit) => (
            <Face key={suit} card={pile[pile.length - 1]} onClick={() => from && found(from)} />
          ))}
        </div>
        <div className="tableau">
          {game.tableau.map((pile, index) => (
            <div key={index} className="tableau-col">
              {pile.length === 0 && <Face onClick={() => aim(index)} />}
              {pile.map((card, depth) => (
                <Face
                  key={`${card.suit}-${card.rank}-${depth}`}
                  card={card}
                  selected={from?.kind === 'tableau' && from.pile === index && from.index === depth}
                  onClick={() => {
                    if (!card.up) return
                    const source: Take = { kind: 'tableau', pile: index, index: depth }
                    if (from) {
                      const moved = toTableau(game, from, index)
                      if (moved) {
                        setGame(moved)
                        setFrom(null)
                        return
                      }
                      if (from.kind === 'tableau' && from.pile === index && from.index === depth) {
                        found(source)
                        return
                      }
                    }
                    setFrom(source)
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Arcade>
  )
}
