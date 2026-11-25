import { useState } from 'react'
import { freshPegs, pegsStuck, playPeg, type Pegs } from '../../lib/games/pegs'
import { Arcade } from './kit'

export default function PegsTool() {
  const [state, setState] = useState<Pegs>(freshPegs)
  const left = state.cells.filter((cell) => cell === '*').length
  return (
    <Arcade
      title="Pegs"
      lede="Jump one peg over another onto an empty hole. The jumped peg is removed. Finish with one."
      status={state.won ? 'One left' : pegsStuck(state.cells) ? `Stuck · ${left} pegs` : `${left} pegs`}
      onRestart={() => setState(freshPegs())}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', maxWidth: 320 }}>
        {state.cells.map((cell, index) => (
          <button
            key={index}
            type="button"
            className={state.selected === index ? 'arcade-cell arcade-tile' : 'arcade-cell'}
            style={{ visibility: cell === '.' ? 'hidden' : 'visible' }}
            onClick={() => setState((current) => playPeg(current, index))}
          >
            {cell === '*' ? '●' : ''}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
