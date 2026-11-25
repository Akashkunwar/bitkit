import { useState } from 'react'
import { freshMole, stepMole, whack, type Mole } from '../../lib/games/mole'
import { Arcade } from './kit'
import { useTick } from './loop'

export default function MoleTool() {
  const [state, setState] = useState<Mole>(freshMole)
  useTick(() => setState((current) => stepMole(current)), 50)

  return (
    <Arcade
      title="Whac-A-Mole"
      lede="Tap the lit hole before it ducks. A wrong hole counts as a miss."
      status={state.dead ? 'Too slow' : `Score ${state.score} · misses ${state.misses}`}
      onRestart={() => setState(freshMole())}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 280 }}>
        {Array.from({ length: 9 }, (_, index) => {
          const row = Math.floor(index / 3) + 1
          const column = (index % 3) + 1
          const up = state.up === index
          return (
            <button
              key={index}
              type="button"
              className={up ? 'arcade-cell arcade-tile' : 'arcade-cell'}
              aria-label={up ? `Row ${row}, column ${column}, mole` : `Row ${row}, column ${column}, empty`}
              onClick={() => setState((current) => whack(current, index))}
            >
              {up ? '●' : ''}
            </button>
          )
        })}
      </div>
    </Arcade>
  )
}
