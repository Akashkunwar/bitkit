import { useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { freshLights, lightsOut, toggleLight } from '../../lib/games/lights'
import { Arcade } from './kit'

export default function LightsTool() {
  const [board, setBoard] = useState(() => freshLights(mulberry32(3)))
  return (
    <Arcade
      title="Lights Out"
      lede="Tap a light. It and its neighbours flip. Turn the whole grid off."
      status={lightsOut(board) ? 'Dark' : 'Still lit'}
      onRestart={() => setBoard(freshLights(mulberry32(Date.now() % 100000)))}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', maxWidth: 300 }}>
        {board.map((on, index) => (
          <button
            key={index}
            type="button"
            className={on ? 'arcade-cell arcade-tile' : 'arcade-cell'}
            onClick={() => setBoard((current) => (lightsOut(current) ? current : toggleLight(current, index)))}
          >
            {on ? '●' : ''}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
