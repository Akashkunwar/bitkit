import { useState } from 'react'
import { freshTowers, moveTower, towersWon, type Towers } from '../../lib/games/towers'
import { Arcade } from './kit'

export default function TowersTool() {
  const [state, setState] = useState<Towers>(freshTowers)
  return (
    <Arcade
      title="Tower of Hanoi"
      lede="Move the stack to the right peg. Only a smaller disc can sit on a larger one."
      status={towersWon(state) ? 'Done' : 'Tap a peg'}
      onRestart={() => setState(freshTowers())}
    >
      <div className="arcade-boards">
        {state.pegs.map((peg, index) => (
          <button
            key={index}
            type="button"
            className={state.selected === index ? 'card sel tower' : 'card tower'}
            onClick={() => setState((current) => moveTower(current, index))}
          >
            {peg.join(' ')}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
